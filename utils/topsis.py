"""
Technique for Order Preference by Similarity to Ideal Solution (TOPSIS) Module.

This module provides the complete mathematical framework for multi-criteria decision
analysis using TOPSIS to evaluate and rank candidate hospitals for medical tourism.

Methodology Overview:
1. Decision Matrix Formulation:
   - Construct matrix X of size m x n (m alternatives/hospitals, n criteria).
   - Benefit criteria (higher is better):
     * Hospital Quality, Language Accessibility, Post-operative Support
   - Cost criteria (lower is better):
     * Procedure Cost, Waiting Time, Travel and Accommodation Cost

2. Matrix Normalization:
   - Vector normalization:
     r_ij = x_ij / sqrt(sum_{k=1}^m x_kj^2)

3. Weighted Normalized Decision Matrix:
   - v_ij = w_j * r_ij

4. Determine Ideal Solutions:
   - Positive Ideal Solution (PIS, A+):
     Maximum value for benefit criteria, minimum value for cost criteria.
   - Negative Ideal Solution (NIS, A-):
     Minimum value for benefit criteria, maximum value for cost criteria.

5. Measure Separation Distances:
   - S_i+ = sqrt(sum_{j=1}^n (v_ij - A_j+)^2)
   - S_i- = sqrt(sum_{j=1}^n (v_ij - A_j-)^2)

6. Calculate Relative Closeness to Ideal Solution:
   - C_i* = S_i- / (S_i+ + S_i-)
   - Values range between 0 and 1; higher C_i* indicates superior ranking.
"""

from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd


def normalize_decision_matrix(decision_matrix: np.ndarray) -> np.ndarray:
    """
    Perform vector normalization on the decision matrix.

    r_ij = x_ij / sqrt(sum_{k=1}^m x_kj^2)

    Args:
        decision_matrix: An m x n matrix representing m hospitals evaluated on n criteria.

    Returns:
        np.ndarray: Vector-normalized matrix of shape m x n.

    Raises:
        ValueError: If decision_matrix is empty or contains non-numeric / negative values.
    """
    if not isinstance(decision_matrix, np.ndarray):
        decision_matrix = np.array(decision_matrix, dtype=float)

    if decision_matrix.ndim != 2:
        raise ValueError(f"Decision matrix must be 2D, but got shape {decision_matrix.shape}.")

    m, n = decision_matrix.shape
    if m == 0 or n == 0:
        raise ValueError("Decision matrix cannot be empty.")

    # Compute Euclidean norm for each column (criterion)
    col_norms = np.sqrt(np.sum(decision_matrix ** 2, axis=0, keepdims=True))

    # Protect against divide-by-zero if all values in a column are 0
    safe_norms = np.where(col_norms == 0, 1.0, col_norms)
    normalized = decision_matrix / safe_norms

    return normalized


def calculate_weighted_matrix(normalized_matrix: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """
    Multiply the vector-normalized matrix by the criteria weight vector.

    v_ij = w_j * r_ij

    Args:
        normalized_matrix: Vector-normalized matrix of shape m x n.
        weights: Criteria weight vector of length n.

    Returns:
        np.ndarray: Weighted normalized decision matrix of shape m x n.

    Raises:
        ValueError: If weights length does not match column count or weights are invalid.
    """
    if normalized_matrix.ndim != 2:
        raise ValueError("Normalized matrix must be 2D.")

    m, n = normalized_matrix.shape
    weights_arr = np.asarray(weights, dtype=float).flatten()

    if len(weights_arr) != n:
        raise ValueError(
            f"Weight vector length ({len(weights_arr)}) does not match criteria count ({n})."
        )

    if np.any(weights_arr < 0):
        raise ValueError("Criteria weights must be non-negative.")

    total_weight = np.sum(weights_arr)
    if total_weight <= 0:
        raise ValueError("Sum of criteria weights must be greater than zero.")

    # Re-normalize weights to strictly sum to 1.0 if slight floating discrepancy
    normalized_weights = weights_arr / total_weight

    # Multiply each column by its corresponding weight w_j
    weighted_matrix = normalized_matrix * normalized_weights
    return weighted_matrix


def identify_ideal_solutions(
    weighted_matrix: np.ndarray, criteria_types: List[str]
) -> Dict[str, np.ndarray]:
    """
    Determine the Positive Ideal Solution (PIS, A+) and Negative Ideal Solution (NIS, A-).

    - For Benefit criteria:
      A_j+ = max_i(v_ij)
      A_j- = min_i(v_ij)
    - For Cost criteria:
      A_j+ = min_i(v_ij)
      A_j- = max_i(v_ij)

    Args:
        weighted_matrix: Weighted normalized decision matrix of shape m x n.
        criteria_types: List of strings ('benefit' or 'cost') corresponding to each criterion.

    Returns:
        Dict[str, np.ndarray]:
            - "PIS": Positive ideal solution vector of length n.
            - "NIS": Negative ideal solution vector of length n.

    Raises:
        ValueError: If criteria_types length does not match number of columns.
    """
    m, n = weighted_matrix.shape
    if len(criteria_types) != n:
        raise ValueError(
            f"Length of criteria_types ({len(criteria_types)}) must equal number of columns ({n})."
        )

    pis = np.zeros(n, dtype=float)
    nis = np.zeros(n, dtype=float)

    for j, c_type in enumerate(criteria_types):
        c_type_clean = str(c_type).strip().lower()
        col = weighted_matrix[:, j]

        if c_type_clean == "benefit":
            pis[j] = np.max(col)
            nis[j] = np.min(col)
        elif c_type_clean == "cost":
            pis[j] = np.min(col)
            nis[j] = np.max(col)
        else:
            raise ValueError(
                f"Invalid criterion type '{c_type}' at index {j}. Must be 'benefit' or 'cost'."
            )

    return {"PIS": pis, "NIS": nis}


def calculate_topsis_rankings(
    data: pd.DataFrame,
    criteria_cols: List[str],
    weights: Union[np.ndarray, List[float]],
    criteria_types: List[str],
) -> pd.DataFrame:
    """
    Execute full TOPSIS pipeline and return ranked hospitals with relative closeness scores.

    Steps:
    1. Extract decision matrix from data[criteria_cols].
    2. Vector-normalize matrix.
    3. Apply criteria weights.
    4. Compute PIS and NIS vectors.
    5. Calculate Euclidean separation distances (S_i+ and S_i-).
    6. Calculate relative closeness scores: C_i* = S_i- / (S_i+ + S_i-).
    7. Sort and rank in descending order of C_i*.

    Args:
        data: DataFrame containing hospital information and performance scores.
        criteria_cols: List of column names representing the 6 decision criteria.
        weights: Array of criteria weights (derived from AHP).
        criteria_types: List of 'benefit' or 'cost' for each criterion.

    Returns:
        pd.DataFrame: Ranked DataFrame containing hospital metadata, raw criteria,
                     s_plus, s_minus, closeness_score (C_i*), and rank.

    Raises:
        ValueError: If input dimensions or criteria are invalid.
    """
    if data.empty:
        raise ValueError("Cannot execute TOPSIS on an empty DataFrame.")

    # Verify criteria columns exist in data
    missing_cols = [c for c in criteria_cols if c not in data.columns]
    if missing_cols:
        raise ValueError(f"Missing criteria columns in dataset: {missing_cols}")

    # Extract numerical decision matrix
    decision_matrix = data[criteria_cols].to_numpy(dtype=float)
    m, n = decision_matrix.shape

    # 1. Vector normalization
    norm_matrix = normalize_decision_matrix(decision_matrix)

    # 2. Weighted normalized matrix
    weighted_matrix = calculate_weighted_matrix(norm_matrix, np.asarray(weights, dtype=float))

    # 3. Identify Ideal Solutions (PIS and NIS)
    ideal_solutions = identify_ideal_solutions(weighted_matrix, criteria_types)
    pis = ideal_solutions["PIS"]
    nis = ideal_solutions["NIS"]

    # 4. Measure Euclidean separation distances
    s_plus = np.sqrt(np.sum((weighted_matrix - pis) ** 2, axis=1))
    s_minus = np.sqrt(np.sum((weighted_matrix - nis) ** 2, axis=1))

    # 5. Calculate Relative Closeness to Ideal Solution: C_i* = S_i- / (S_i+ + S_i-)
    denom = s_plus + s_minus
    closeness_scores = np.where(denom == 0, 0.5, s_minus / denom)

    # 6. Build output DataFrame
    result_df = data.copy()
    result_df["s_plus"] = np.round(s_plus, 5)
    result_df["s_minus"] = np.round(s_minus, 5)
    result_df["closeness_score"] = np.round(closeness_scores, 5)

    # Sort descending by closeness score (highest score = Rank 1)
    result_df = result_df.sort_values(by="closeness_score", ascending=False).reset_index(drop=True)
    result_df["rank"] = range(1, len(result_df) + 1)

    return result_df
