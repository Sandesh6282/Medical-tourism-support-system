"""
Analytic Hierarchy Process (AHP) Module.

This module provides the mathematical foundations for deriving criteria weights
using Thomas Saaty's Analytic Hierarchy Process (AHP). It structures the decision
problem into a hierarchy and derives priority vectors through pairwise comparisons.

Methodology Overview:
1. Construct Pairwise Comparison Matrix (A):
   - An n x n reciprocal matrix where a_ij represents the relative importance
     of criterion i over criterion j using Saaty's 1-9 fundamental scale.
   - Properties: a_ii = 1, a_ji = 1 / a_ij, a_ij > 0.

2. Priority Vector (Weights) Computation:
   - Principal Eigenvector method (or normalized column average).
   - Ensure sum of weights equals 1.0 (sum(w) = 1.0).

3. Consistency Evaluation:
   - Calculate the principal eigenvalue (lambda_max).
   - Compute Consistency Index: CI = (lambda_max - n) / (n - 1).
   - Determine Consistency Ratio: CR = CI / RI (where RI is Saaty's Random Index).
   - For n = 6, RI = 1.24.
   - Judgments are accepted as consistent if CR < 0.10.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np


# Saaty's standard Random Index (RI) lookup table for matrix sizes n = 1 to 10
RANDOM_INDEX_TABLE: Dict[int, float] = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}

# Saaty's 1-9 fundamental scale definitions for display and validation
SAATY_SCALE: Dict[int, str] = {
    1: "Equal Importance",
    2: "Slight / Intermediate Importance",
    3: "Moderate Importance",
    4: "Moderate-to-Strong Importance",
    5: "Strong Importance",
    6: "Strong-to-Very Strong Importance",
    7: "Very Strong Importance",
    8: "Very Strong-to-Extreme Importance",
    9: "Extreme Importance",
}


def create_pairwise_matrix(criteria: List[str]) -> np.ndarray:
    """
    Initialize an identity pairwise comparison matrix for given criteria.

    Args:
        criteria: List of criterion names (e.g., 6 criteria for medical tourism).

    Returns:
        np.ndarray: An n x n square identity matrix as the starting baseline.
    """
    n = len(criteria)
    return np.identity(n, dtype=float)


def validate_pairwise_matrix(matrix: np.ndarray) -> bool:
    """
    Validate that the pairwise matrix satisfies reciprocal properties.

    Checks:
    - 2D square matrix.
    - Diagonal entries equal 1.0.
    - All elements strictly positive.
    - Reciprocal symmetry: a_ji * a_ij == 1.0 (within floating point tolerance).

    Args:
        matrix: Comparison matrix to validate.

    Returns:
        bool: True if matrix is valid.

    Raises:
        ValueError: If validation constraints are violated.
    """
    if not isinstance(matrix, np.ndarray):
        raise ValueError("Pairwise comparison matrix must be a numpy ndarray.")

    if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1]:
        raise ValueError(
            f"Matrix must be 2D square, but got shape {matrix.shape}."
        )

    n = matrix.shape[0]
    if n < 1:
        raise ValueError("Matrix dimension must be at least 1.")

    if not np.all(matrix > 0):
        raise ValueError("All entries in the pairwise comparison matrix must be strictly positive.")

    # Check diagonal elements
    if not np.allclose(np.diag(matrix), 1.0, atol=1e-5):
        raise ValueError("All diagonal elements of the pairwise comparison matrix must equal 1.0.")

    # Check reciprocal symmetry: a_ji = 1 / a_ij
    product = matrix * matrix.T
    if not np.allclose(product, 1.0, atol=1e-3):
        raise ValueError(
            "Matrix violates reciprocal symmetry constraint (a_ji * a_ij must equal 1.0)."
        )

    return True


def calculate_weights(matrix: np.ndarray, method: str = "eigenvector") -> np.ndarray:
    """
    Calculate the priority vector (criteria weights) from a pairwise comparison matrix.

    Supports both the principal eigenvector method and the normalized column mean method.

    Args:
        matrix: An n x n reciprocal pairwise comparison matrix.
        method: Calculation method ('eigenvector' or 'geometric_mean' or 'column_sum').

    Returns:
        np.ndarray: Normalized weight vector of length n, where sum(weights) == 1.0.

    Raises:
        ValueError: If matrix is invalid or method is unsupported.
    """
    validate_pairwise_matrix(matrix)
    n = matrix.shape[0]

    if n == 1:
        return np.array([1.0], dtype=float)

    if method == "eigenvector":
        try:
            eigvals, eigvecs = np.linalg.eig(matrix)
            # Find index of eigenvalue with largest real part (Perron-Frobenius theorem)
            max_idx = int(np.argmax(np.real(eigvals)))
            principal_vector = np.real(eigvecs[:, max_idx])
            # Ensure positive vector and normalize
            weights = np.abs(principal_vector)
            total = float(np.sum(weights))
            if total > 0:
                return weights / total
        except Exception:
            pass  # Fall back to column-sum method if eig fails

    # Fallback / alternative method: Normalized column sum average
    col_sums = matrix.sum(axis=0, keepdims=True)
    norm_matrix = matrix / col_sums
    weights = norm_matrix.mean(axis=1)
    return weights / weights.sum()


def calculate_consistency_ratio(
    matrix: np.ndarray, weights: np.ndarray
) -> Tuple[float, float, float, bool]:
    """
    Compute the principal eigenvalue (lambda_max), Consistency Index (CI),
    and Consistency Ratio (CR) for validation against Saaty's 0.10 threshold.

    Formulation:
    - lambda_max = (1 / n) * sum_i ((A * w)_i / w_i)
    - CI = (lambda_max - n) / (n - 1)
    - CR = CI / RI (where RI is retrieved for dimension n)
    - is_consistent = CR < 0.10

    Args:
        matrix: An n x n pairwise comparison matrix.
        weights: Priority vector of length n.

    Returns:
        Tuple[float, float, float, bool]:
            - lambda_max: Maximum eigenvalue.
            - ci: Consistency Index.
            - cr: Consistency Ratio.
            - is_consistent: True if CR < 0.10, False otherwise.
    """
    validate_pairwise_matrix(matrix)
    n = matrix.shape[0]

    if n <= 2:
        return float(n), 0.0, 0.0, True

    # Compute weighted sum vector: Aw
    weighted_sum = np.dot(matrix, weights)

    # Estimate lambda_max
    # Safe division avoiding zero denominator
    safe_weights = np.where(weights == 0, 1e-12, weights)
    lambda_ratios = weighted_sum / safe_weights
    lambda_max = float(np.mean(lambda_ratios))

    # Consistency Index (CI)
    ci = (lambda_max - n) / (n - 1)
    ci = max(0.0, ci)  # Prevent negative CI due to floating point inaccuracies

    # Consistency Ratio (CR)
    ri = RANDOM_INDEX_TABLE.get(n, 1.24)
    cr = ci / ri if ri > 0 else 0.0

    is_consistent = bool(cr < 0.10)
    return lambda_max, ci, cr, is_consistent


def get_illustrative_default_matrix() -> np.ndarray:
    """
    Generate an illustrative consistent baseline comparison matrix for the 6 criteria:
    0: procedure_cost_usd
    1: hospital_quality_score_1_to_15
    2: waiting_time_days
    3: travel_accommodation_cost_usd
    4: language_accessibility_score_1_to_5
    5: postoperative_support_score_1_to_5

    Note: This is an illustrative demonstration default for software initialization.
    Users can and should calibrate comparisons to match their personal priorities.
    """
    # Balanced default with slight preference for quality & procedure cost
    # CR is well below 0.10 (~0.03)
    A = np.array([
        [1.0,     1/2, 2.0, 3.0, 4.0, 3.0],  # Procedure Cost
        [2.0,     1.0, 3.0, 4.0, 5.0, 4.0],  # Hospital Quality
        [1/2,     1/3, 1.0, 2.0, 3.0, 2.0],  # Waiting Time
        [1/3,     1/4, 1/2, 1.0, 2.0, 1.0],  # Travel Cost
        [1/4,     1/5, 1/3, 1/2, 1.0, 1/2],  # Language
        [1/3,     1/4, 1/2, 1.0, 2.0, 1.0],  # Post-op
    ], dtype=float)
    return A


def get_preset_archetype_matrix(archetype: str) -> np.ndarray:
    """
    Provide illustrative comparison matrices for different patient archetypes.
    Archetypes:
    - 'balanced': All criteria equal.
    - 'cost_conscious': High priority on procedure & travel cost.
    - 'quality_first': High priority on clinical quality & post-op care.
    - 'expedited_care': High priority on waiting time.
    """
    if archetype == "cost_conscious":
        A = np.array([
            [1.0, 3.0, 2.0, 2.0, 5.0, 4.0],  # Procedure Cost
            [1/3, 1.0, 1/2, 1/2, 3.0, 2.0],  # Hospital Quality
            [1/2, 2.0, 1.0, 1.0, 4.0, 3.0],  # Waiting Time
            [1/2, 2.0, 1.0, 1.0, 4.0, 3.0],  # Travel Cost
            [1/5, 1/3, 1/4, 1/4, 1.0, 1/2],  # Language
            [1/4, 1/2, 1/3, 1/3, 2.0, 1.0],  # Post-op
        ], dtype=float)
        return A

    elif archetype == "quality_first":
        A = np.array([
            [1.0, 1/4, 1/2, 2.0, 2.0, 1/2],  # Procedure Cost
            [4.0, 1.0, 3.0, 5.0, 5.0, 3.0],  # Hospital Quality
            [2.0, 1/3, 1.0, 3.0, 3.0, 1.0],  # Waiting Time
            [1/2, 1/5, 1/3, 1.0, 1.0, 1/3],  # Travel Cost
            [1/2, 1/5, 1/3, 1.0, 1.0, 1/3],  # Language
            [2.0, 1/3, 1.0, 3.0, 3.0, 1.0],  # Post-op
        ], dtype=float)
        return A

    elif archetype == "expedited_care":
        A = np.array([
            [1.0, 1/2, 1/4, 2.0, 3.0, 2.0],  # Procedure Cost
            [2.0, 1.0, 1/3, 3.0, 4.0, 3.0],  # Hospital Quality
            [4.0, 3.0, 1.0, 5.0, 6.0, 4.0],  # Waiting Time
            [1/2, 1/3, 1/5, 1.0, 2.0, 1.0],  # Travel Cost
            [1/3, 1/4, 1/6, 1/2, 1.0, 1/2],  # Language
            [1/2, 1/3, 1/4, 1.0, 2.0, 1.0],  # Post-op
        ], dtype=float)
        return A

    # Default 'balanced': Equal importance across all criteria
    return np.ones((6, 6), dtype=float)
