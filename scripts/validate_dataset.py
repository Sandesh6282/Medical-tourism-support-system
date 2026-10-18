"""
Automated Comprehensive Dataset & Algorithmic Validation Script.
Validates:
1. Hospital Count (must be exactly 16) and Country Distribution (4 each in India, Türkiye, Thailand, USA).
2. Procedure Count (must be exactly 9 knee procedures: KNEE01–KNEE09).
3. Multi-Procedure Dataset: exactly 144 unique hospital-procedure combinations.
4. Composite Uniqueness: zero missing or duplicate (hospital_id, procedure_id) pairs.
5. All 6 Criteria: zero missing/null, non-numeric, or non-finite values.
6. Positive Bounds: surgery costs and waiting times strictly > 0.
7. Scale Bounds: quality score in [1, 15], language score in [1, 5], post-op support in [1, 5].
8. Foreign-Key Relationships: complete referential integrity across all datasets.
9. Criterion Directions: cost (↓) vs benefit (↑) classification.
10. End-to-End AHP–TOPSIS Computations across ALL NINE procedures.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.data_loader import (
    load_hospital_data,
    validate_hospital_data,
    load_hospitals,
    validate_hospitals,
    load_knee_procedures,
    validate_knee_procedures,
    load_hospital_procedure_data,
    validate_hospital_procedure_data,
    validate_cross_dataset_integrity,
    get_procedure_dataframe,
    CRITERIA_COLUMNS,
    CRITERIA_TYPES,
    TARGET_COUNTRIES,
    EXPECTED_PROCEDURES,
    normalize_country_name,
)
from utils.ahp import calculate_weights, calculate_consistency_ratio, get_illustrative_default_matrix
from utils.topsis import calculate_topsis_rankings


def run_full_validation_report() -> bool:
    print("=" * 80)
    print("  MEDICAL TOURISM DSS — 9-PROCEDURE AHP-TOPSIS DATASET VALIDATION REPORT")
    print("=" * 80)

    all_passed = True

    # 1. Hospitals Metadata
    print("\n[1] Validating Hospitals Master Repository (data/hospitals.csv)")
    try:
        h_df = load_hospitals()
        count_h = len(h_df)
        print(f"  • Hospital count: {count_h} (Expected: 16) -> {'PASS' if count_h == 16 else 'FAIL'}")
        if count_h != 16:
            all_passed = False

        dups_h = h_df["hospital_id"].duplicated().sum()
        print(f"  • Unique hospital IDs: {h_df['hospital_id'].nunique()} | Duplicate IDs: {dups_h} -> {'PASS' if dups_h == 0 else 'FAIL'}")
        if dups_h > 0:
            all_passed = False

        c_counts = h_df["country"].apply(normalize_country_name).value_counts().to_dict()
        print("  • Country Distribution (4 per canonical country):")
        for c in TARGET_COUNTRIES:
            cnt = c_counts.get(c, 0)
            status = "PASS" if cnt == 4 else "FAIL"
            if cnt != 4:
                all_passed = False
            print(f"      - {c}: {cnt} hospitals [{status}]")
    except Exception as e:
        print(f"  • Exception validating hospitals: {e} [FAIL]")
        all_passed = False

    # 2. Knee Procedures Master
    print("\n[2] Validating Procedure Catalog (data/knee_procedures.csv)")
    try:
        p_df = load_knee_procedures()
        count_p = len(p_df)
        print(f"  • Procedure count: {count_p} (Expected: 9) -> {'PASS' if count_p == 9 else 'FAIL'}")
        if count_p != 9:
            all_passed = False

        expected_ids = [p["procedure_id"] for p in EXPECTED_PROCEDURES]
        actual_ids = p_df["procedure_id"].tolist()
        ids_ok = actual_ids == expected_ids
        print(f"  • Exact Procedure IDs match (KNEE01–KNEE09): -> {'PASS' if ids_ok else 'FAIL'}")
        if not ids_ok:
            all_passed = False

        expected_labels = [p["display_label"] for p in EXPECTED_PROCEDURES]
        actual_labels = p_df["display_label"].tolist()
        labels_ok = actual_labels == expected_labels
        print(f"  • Exact Procedure display labels match: -> {'PASS' if labels_ok else 'FAIL'}")
        if not labels_ok:
            all_passed = False
    except Exception as e:
        print(f"  • Exception validating knee procedures: {e} [FAIL]")
        all_passed = False

    # 3. Demonstration Baseline Dataset (data/FYP_hospital_dataset.csv)
    print("\n[3] Validating Demonstration Baseline Dataset (data/FYP_hospital_dataset.csv)")
    try:
        demo_df = load_hospital_data()
        validate_hospital_data(demo_df)
        print(f"  • 16-hospital baseline vector completeness: -> PASS")
    except Exception as e:
        print(f"  • Baseline dataset validation failed: {e} [FAIL]")
        all_passed = False

    # 4. Multi-Procedure Dataset (data/hospital_procedure_data.csv)
    print("\n[4] Validating Multi-Procedure Dataset (data/hospital_procedure_data.csv)")
    try:
        hp_df = load_hospital_procedure_data()
        validate_hospital_procedure_data(hp_df)
        row_count = len(hp_df)
        print(f"  • Total Combination Count: {row_count} (Expected: 144 = 16x9) -> {'PASS' if row_count == 144 else 'FAIL'}")
        if row_count != 144:
            all_passed = False

        # Composite key uniqueness
        dup_pairs = hp_df.duplicated(subset=["hospital_id", "procedure_id"]).sum()
        print(f"  • Duplicate (hospital_id, procedure_id) pairs: {dup_pairs} -> {'PASS' if dup_pairs == 0 else 'FAIL'}")
        if dup_pairs > 0:
            all_passed = False

        # Check for missing values in all 6 criteria
        missing_dict = hp_df[CRITERIA_COLUMNS].isnull().sum().to_dict()
        total_missing = sum(missing_dict.values())
        print(f"  • Missing Criteria Values: {total_missing} -> {'PASS' if total_missing == 0 else 'FAIL'}")
        if total_missing > 0:
            all_passed = False
            for col, n in missing_dict.items():
                if n > 0:
                    print(f"      - {col}: {n} missing")

        # Check positive bounds and ranges
        cost_min = hp_df["procedure_cost_usd"].min()
        wait_min = hp_df["waiting_time_days"].min()
        travel_min = hp_df["travel_accommodation_cost_usd"].min()
        pos_ok = cost_min > 0 and wait_min > 0 and travel_min > 0
        print(f"  • Positive bounds check (Min cost=${cost_min}, Min wait={wait_min}d, Min travel=${travel_min}): -> {'PASS' if pos_ok else 'FAIL'}")
        if not pos_ok:
            all_passed = False

        q_min, q_max = hp_df["hospital_quality_score_1_to_15"].min(), hp_df["hospital_quality_score_1_to_15"].max()
        l_min, l_max = hp_df["language_accessibility_score_1_to_5"].min(), hp_df["language_accessibility_score_1_to_5"].max()
        p_min, p_max = hp_df["postoperative_support_score_1_to_5"].min(), hp_df["postoperative_support_score_1_to_5"].max()
        scale_ok = 1 <= q_min and q_max <= 15 and 1 <= l_min and l_max <= 5 and 1 <= p_min and p_max <= 5
        print(f"  • Score scale limits check (Quality [{q_min},{q_max}], Language [{l_min},{l_max}], PostOp [{p_min},{p_max}]): -> {'PASS' if scale_ok else 'FAIL'}")
        if not scale_ok:
            all_passed = False

        # Check finite values across all 6 criteria
        finite_ok = True
        for c in CRITERIA_COLUMNS:
            if not np.all(np.isfinite(hp_df[c].to_numpy())):
                print(f"      - {c}: non-finite values detected!")
                finite_ok = False
        print(f"  • Non-finite check across all 6 criteria: -> {'PASS' if finite_ok else 'FAIL'}")
        if not finite_ok:
            all_passed = False

        # Check procedure specificity
        cost_std_by_proc = hp_df.groupby("procedure_id")["procedure_cost_usd"].mean()
        distinct_proc_costs = cost_std_by_proc.nunique()
        print(f"  • Distinct procedure cost distributions: {distinct_proc_costs}/9 -> {'PASS' if distinct_proc_costs >= 8 else 'FAIL'}")
        if distinct_proc_costs < 8:
            all_passed = False

    except Exception as e:
        print(f"  • hospital_procedure_data validation exception: {e} [FAIL]")
        all_passed = False

    # 5. Cross-Dataset Referential Integrity & Canonical Identity
    print("\n[5] Validating Cross-Dataset Foreign Key Integrity & Normalization")
    try:
        cross_ok = validate_cross_dataset_integrity(h_df, p_df, hp_df)
        print(f"  • Foreign-key consistency and 16x9 cross-distribution: -> {'PASS' if cross_ok else 'FAIL'}")

        # Check Unicode and alias normalization
        test_aliases = {
            "Turkey": "Türkiye",
            "turkiye": "Türkiye",
            "Türkiye": "Türkiye",
            "T\u00fcrkiye": "Türkiye",
            "India ": "India",
            " Thailand": "Thailand",
            "USA": "USA",
            "united states": "USA",
        }
        alias_ok = all(normalize_country_name(raw) == canon for raw, canon in test_aliases.items())
        print(f"  • Country alias & Unicode normalization: -> {'PASS' if alias_ok else 'FAIL'}")
        if not alias_ok:
            all_passed = False

        # Validate criterion directions (cost vs benefit)
        expected_directions = {
            "procedure_cost_usd": "cost",
            "hospital_quality_score_1_to_15": "benefit",
            "waiting_time_days": "cost",
            "travel_accommodation_cost_usd": "cost",
            "language_accessibility_score_1_to_5": "benefit",
            "postoperative_support_score_1_to_5": "benefit",
        }
        dir_ok = all(CRITERIA_TYPES.get(k) == v for k, v in expected_directions.items())
        print(f"  • Criterion directions verification (3 cost, 3 benefit): -> {'PASS' if dir_ok else 'FAIL'}")
        if not dir_ok:
            all_passed = False

    except Exception as e:
        print(f"  • Cross-dataset foreign key failure: {e} [FAIL]")
        all_passed = False

    # 6. End-to-End AHP-TOPSIS Computation across ALL 9 Procedures
    print("\n[6] Validating AHP-TOPSIS Execution across ALL 9 Procedures")
    matrix = get_illustrative_default_matrix()
    weights = calculate_weights(matrix)
    lambda_max, ci, cr, is_consistent = calculate_consistency_ratio(matrix, weights)
    print(f"  • AHP Default Matrix Consistency: CR={cr:.4f} (<= 0.10: {'PASS' if is_consistent else 'FAIL'})")
    if not is_consistent:
        all_passed = False

    criteria_types = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]

    print("\n  " + "-" * 76)
    print(f"  {'Procedure ID':<12} | {'Procedure Display Label':<35} | {'Records':<8} | {'TOPSIS Status':<12}")
    print("  " + "-" * 76)

    for proc in EXPECTED_PROCEDURES:
        p_id = proc["procedure_id"]
        label = proc["display_label"]
        try:
            proc_df = get_procedure_dataframe(p_id, hp_df, h_df, demo_df)
            rec_count = len(proc_df)
            if rec_count != 16:
                raise ValueError(f"Expected 16 records, found {rec_count}")

            ranked = calculate_topsis_rankings(proc_df, CRITERIA_COLUMNS, weights.tolist(), criteria_types)
            if len(ranked) != 16:
                raise ValueError(f"Expected 16 ranked hospitals, got {len(ranked)}")
            if ranked["rank"].tolist() != list(range(1, 17)):
                raise ValueError(f"Ranks are not strictly sorted 1 to 16: {ranked['rank'].tolist()}")
            if (ranked["closeness_score"] < 0).any() or (ranked["closeness_score"] > 1).any():
                raise ValueError("Closeness score outside [0, 1]")

            status_str = "PASS (Valid)"
        except Exception as e:
            status_str = f"FAIL ({e})"
            all_passed = False

        print(f"  {p_id:<12} | {label:<35} | {rec_count:<8} | {status_str:<12}")

    print("  " + "-" * 76)

    # Final summary
    print("\n" + "=" * 80)
    print(f"  FINAL VERIFICATION STATUS: {'ALL 9 PROCEDURES & DATASETS PASSED (READY)' if all_passed else 'VALIDATION FAILED'}")
    print("=" * 80 + "\n")

    return all_passed


if __name__ == "__main__":
    success = run_full_validation_report()
    sys.exit(0 if success else 1)
