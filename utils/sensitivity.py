"""
Sensitivity Analysis Module.

This module provides tools for testing the robustness and stability of TOPSIS
hospital rankings under variations in criteria weights.

Methodology Overview:
1. Weight Perturbation:
   - Systematically alter the weight of a target criterion across a specified range
     (e.g., from 0.05 to 0.70).

2. Proportional Adjustment:
   - When criterion k's weight is adjusted from w_k to w_k', re-normalize the remaining
     weights proportionally so that the sum of all weights remains exactly 1.0:
     w_j' = w_j * (1 - w_k') / (1 - w_k) for all j != k.

3. Dynamic Ranking Evaluation:
   - Re-run TOPSIS using modified weight vectors.
   - Compare pre-packaged scenarios (Cost-Focused, Quality-Focused, Time-Focused).
   - Track ranking trajectories and identify rank reversals.
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from utils.topsis import calculate_topsis_rankings


# Predefined Sensitivity Scenarios matching the 6 criteria:
# 0: procedure_cost_usd
# 1: hospital_quality_score_1_to_15
# 2: waiting_time_days
# 3: travel_accommodation_cost_usd
# 4: language_accessibility_score_1_to_5
# 5: postoperative_support_score_1_to_5
PREDEFINED_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "Cost-Focused": {
        "description": "High priority on procedural and travel costs; ideal for budget-constrained international patients.",
        "weights": np.array([0.40, 0.15, 0.10, 0.25, 0.05, 0.05], dtype=float),
    },
    "Quality-Focused": {
        "description": "High priority on international hospital accreditation, clinical safety, and post-op care.",
        "weights": np.array([0.05, 0.45, 0.10, 0.05, 0.15, 0.20], dtype=float),
    },
    "Time-Focused": {
        "description": "High priority on expedited admission and minimal surgical waiting times for urgent mobility relief.",
        "weights": np.array([0.15, 0.20, 0.40, 0.10, 0.05, 0.10], dtype=float),
    },
    "Equal-Weights": {
        "description": "Neutral benchmark where all six criteria carry identical 16.67% importance.",
        "weights": np.array([1 / 6] * 6, dtype=float),
    },
}


def adjust_weights_proportionally(
    base_weights: np.ndarray, target_idx: int, new_weight: float
) -> np.ndarray:
    """
    Adjust one criterion's weight and proportionally scale the others so sum equals 1.0.

    Formula:
    w_k' = new_weight
    For j != k:
    w_j' = w_j * (1 - w_k') / (1 - w_k)

    Args:
        base_weights: 1D array of original criteria weights (must sum to ~1.0).
        target_idx: Index of the criterion being perturbed (0 <= target_idx < len(base_weights)).
        new_weight: New weight value for the target criterion (0.0 < new_weight < 1.0).

    Returns:
        np.ndarray: Updated weight vector summing to 1.0.

    Raises:
        ValueError: If inputs are out of bounds.
    """
    weights = np.asarray(base_weights, dtype=float).copy()
    n = len(weights)

    if target_idx < 0 or target_idx >= n:
        raise ValueError(f"Invalid target_idx {target_idx} for weight vector of length {n}.")

    if not (0.0 < new_weight < 1.0):
        raise ValueError(f"new_weight must be strictly between 0 and 1, got {new_weight}.")

    old_target_weight = weights[target_idx]
    remaining_old_sum = 1.0 - old_target_weight
    remaining_new_sum = 1.0 - new_weight

    new_weights = np.zeros(n, dtype=float)
    new_weights[target_idx] = new_weight

    if remaining_old_sum <= 1e-9:
        # If the target criterion previously had ~100% weight, distribute remaining weight equally
        for j in range(n):
            if j != target_idx:
                new_weights[j] = remaining_new_sum / (n - 1)
    else:
        # Scale remaining weights proportionally
        scale = remaining_new_sum / remaining_old_sum
        for j in range(n):
            if j != target_idx:
                new_weights[j] = weights[j] * scale

    # Re-normalize to avoid floating point drift
    return new_weights / np.sum(new_weights)


def run_one_at_a_time_sensitivity(
    hospital_data: pd.DataFrame,
    criteria_cols: List[str],
    base_weights: np.ndarray,
    criteria_types: List[str],
    target_criterion_idx: int,
    weight_range: Optional[np.ndarray] = None,
) -> pd.DataFrame:
    """
    Perform One-At-A-Time (OAT) sensitivity analysis for a specific criterion.

    Args:
        hospital_data: DataFrame of hospital attributes and criteria measurements.
        criteria_cols: List of column names representing the 6 criteria.
        base_weights: Original criteria weights from AHP.
        criteria_types: List of 'benefit' or 'cost' classifications.
        target_criterion_idx: Index of criterion to vary.
        weight_range: Sequence of test weights (defaults to np.linspace(0.05, 0.65, 13)).

    Returns:
        pd.DataFrame: Consolidated simulation results containing:
                     'test_weight', 'hospital_id', 'hospital_name', 'country', 'closeness_score', 'rank'.
    """
    if weight_range is None:
        weight_range = np.linspace(0.05, 0.65, 13)

    records = []

    for w_val in weight_range:
        perturbed_w = adjust_weights_proportionally(base_weights, target_criterion_idx, float(w_val))
        ranked_df = calculate_topsis_rankings(
            hospital_data, criteria_cols, perturbed_w, criteria_types
        )

        for _, row in ranked_df.iterrows():
            records.append({
                "test_weight": round(float(w_val), 4),
                "hospital_id": row["hospital_id"],
                "hospital_name": row["hospital_name"],
                "country": row["country"],
                "closeness_score": row["closeness_score"],
                "rank": int(row["rank"]),
            })

    return pd.DataFrame(records)


def run_predefined_scenarios(
    hospital_data: pd.DataFrame,
    criteria_cols: List[str],
    criteria_types: List[str],
    base_weights: Optional[np.ndarray] = None,
) -> Dict[str, pd.DataFrame]:
    """
    Execute TOPSIS across all predefined preference scenarios and an optional base AHP scenario.

    Returns:
        Dict[str, pd.DataFrame]: Dictionary mapping scenario name to ranked DataFrame.
    """
    results: Dict[str, pd.DataFrame] = {}

    if base_weights is not None:
        results["Patient AHP Weights"] = calculate_topsis_rankings(
            hospital_data, criteria_cols, base_weights, criteria_types
        )

    for name, config in PREDEFINED_SCENARIOS.items():
        results[name] = calculate_topsis_rankings(
            hospital_data, criteria_cols, config["weights"], criteria_types
        )

    return results


def find_rank_reversals(sensitivity_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detect critical weight thresholds where the #1 ranked hospital changes.

    Args:
        sensitivity_df: Output DataFrame from run_one_at_a_time_sensitivity.

    Returns:
        List[Dict[str, Any]]: List of detected crossover events and switching values.
    """
    crossovers = []
    weights_sorted = sorted(sensitivity_df["test_weight"].unique())

    prev_weight = None
    prev_top_hospital = None

    for w in weights_sorted:
        sub = sensitivity_df[sensitivity_df["test_weight"] == w]
        top_row = sub[sub["rank"] == 1].iloc[0]
        curr_top = (top_row["hospital_id"], top_row["hospital_name"])

        if prev_top_hospital is not None and curr_top != prev_top_hospital:
            crossovers.append({
                "weight_interval": (prev_weight, w),
                "previous_top": prev_top_hospital,
                "new_top": curr_top,
            })

        prev_weight = w
        prev_top_hospital = curr_top

    return crossovers
