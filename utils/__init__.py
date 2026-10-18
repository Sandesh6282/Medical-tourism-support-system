"""
Utils Package for Medical Tourism Decision Support System (FYP).

This package contains analytical and computational modules supporting
the AHP-TOPSIS multi-criteria decision-making pipeline:
- data_loader: Loading, preprocessing, and validation of hospital datasets.
- ahp: Analytic Hierarchy Process for criteria weighting and consistency validation.
- topsis: Technique for Order Preference by Similarity to Ideal Solution for hospital ranking.
- sensitivity: Sensitivity and robustness analysis for criteria weight perturbations.
"""

from utils.data_loader import (
    load_hospital_data,
    validate_hospital_data,
    filter_hospitals,
    load_hospitals,
    validate_hospitals,
    load_knee_procedures,
    validate_knee_procedures,
    load_hospital_procedure_data,
    validate_hospital_procedure_data,
    validate_cross_dataset_integrity,
    get_procedure_records,
    get_procedure_summary,
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    TARGET_COUNTRIES,
    SYNTHETIC_DATA_DISCLAIMER,
    INSUFFICIENT_DATA_NOTICE,
    EXPECTED_PROCEDURES,
)

from utils.ahp import (
    calculate_weights,
    calculate_consistency_ratio,
    create_pairwise_matrix,
    validate_pairwise_matrix,
    get_illustrative_default_matrix,
    get_preset_archetype_matrix,
    SAATY_SCALE,
    RANDOM_INDEX_TABLE,
)

from utils.topsis import (
    normalize_decision_matrix,
    calculate_weighted_matrix,
    identify_ideal_solutions,
    calculate_topsis_rankings,
)

from utils.sensitivity import (
    adjust_weights_proportionally,
    run_one_at_a_time_sensitivity,
    run_predefined_scenarios,
    find_rank_reversals,
    PREDEFINED_SCENARIOS,
)

__version__ = "0.2.0"

__all__ = [
    "load_hospital_data",
    "validate_hospital_data",
    "filter_hospitals",
    "CRITERIA_COLUMNS",
    "CRITERIA_DISPLAY_NAMES",
    "CRITERIA_TYPES",
    "TARGET_COUNTRIES",
    "SYNTHETIC_DATA_DISCLAIMER",
    "calculate_weights",
    "calculate_consistency_ratio",
    "create_pairwise_matrix",
    "validate_pairwise_matrix",
    "get_illustrative_default_matrix",
    "get_preset_archetype_matrix",
    "SAATY_SCALE",
    "RANDOM_INDEX_TABLE",
    "normalize_decision_matrix",
    "calculate_weighted_matrix",
    "identify_ideal_solutions",
    "calculate_topsis_rankings",
    "adjust_weights_proportionally",
    "run_one_at_a_time_sensitivity",
    "run_predefined_scenarios",
    "find_rank_reversals",
    "PREDEFINED_SCENARIOS",
]
