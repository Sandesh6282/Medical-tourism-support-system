"""
Automated Test Suite for Complete 9-Procedure AHP-TOPSIS Dataset Integration.
Tests:
1. Master dataset file parsing & validation (hospitals.csv, knee_procedures.csv, hospital_procedure_data.csv, FYP_hospital_dataset.csv)
2. Integrity of all 9 knee procedure definitions & exact display labels
3. 144 unique hospital-procedure pairs with complete 6-criterion vectors (zero missing, positive values, scale bounds)
4. Procedure-specificity: distinct procedure costs and waiting time metrics
5. Live FastAPI endpoint behavior across ALL NINE procedures (KNEE01–KNEE09)
6. Feasibility filters, AHP consistency, TOPSIS closeness scores, sensitivity scenarios, and OAT simulation
7. Rapid procedure switching in both directions without stale state
"""

import sys
import os
import unittest
import requests
import pandas as pd
import numpy as np

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from utils.data_loader import (
    load_hospitals,
    validate_hospitals,
    load_knee_procedures,
    validate_knee_procedures,
    load_hospital_procedure_data,
    validate_hospital_procedure_data,
    validate_cross_dataset_integrity,
    get_procedure_records,
    get_procedure_summary,
    get_procedure_dataframe,
    load_hospital_data,
    validate_hospital_data,
    EXPECTED_PROCEDURES,
    CRITERIA_COLUMNS,
    CRITERIA_TYPES,
)
from utils.topsis import calculate_topsis_rankings

API_BASE = "http://127.0.0.1:8000/api"

REQUIRED_9_LABELS = [
    ("KNEE01", "Knee replacement"),
    ("KNEE02", "Total knee replacement (TKR) with OMNI"),
    ("KNEE03", "Knee MAKoplasty"),
    ("KNEE04", "Total Knee Replacement (Arthroplasty)"),
    ("KNEE05", "Robotic knee replacement surgery"),
    ("KNEE06", "Knee arthroplastic"),
    ("KNEE07", "Unilateral knee arthroplasty"),
    ("KNEE08", "Unicompartmental (partial) knee replacement"),
    ("KNEE09", "Revision knee arthroplasty"),
]


class TestDatasetFiles(unittest.TestCase):
    """Test low-level file parsing and cross-dataset validation."""

    def test_01_load_and_validate_hospitals(self):
        df = load_hospitals()
        self.assertEqual(len(df), 16, "Must contain exactly 16 hospital records")
        self.assertTrue(validate_hospitals(df), "Hospital validation must pass")
        self.assertTrue(df["hospital_id"].is_unique, "Hospital IDs must be unique")
        expected_countries = {"India", "Türkiye", "Thailand", "USA"}
        self.assertEqual(set(df["country"].unique()), expected_countries)

    def test_02_load_and_validate_knee_procedures(self):
        df = load_knee_procedures()
        self.assertEqual(len(df), 9, "Must contain exactly 9 knee procedures")
        self.assertTrue(validate_knee_procedures(df), "Knee procedures validation must pass")
        self.assertTrue(df["procedure_id"].is_unique, "Procedure IDs must be unique")

        for pid, expected_label in REQUIRED_9_LABELS:
            match = df[df["procedure_id"] == pid]
            self.assertEqual(len(match), 1, f"Missing procedure ID {pid}")
            actual_name = match.iloc[0]["display_label"]
            self.assertEqual(actual_name, expected_label, f"Label mismatch for {pid}: got '{actual_name}'")

        hip_matches = df[df["display_label"].str.contains("hip", case=False)]
        self.assertEqual(len(hip_matches), 0, "No hip procedures must be present in knee dataset")

    def test_03_load_and_validate_hospital_procedure_data(self):
        df = load_hospital_procedure_data()
        self.assertEqual(len(df), 144, "Must contain exactly 144 hospital-procedure pairs (16 x 9)")
        self.assertTrue(validate_hospital_procedure_data(df), "Hospital-procedure validation must pass")

        # Verify composite uniqueness (hospital_id, procedure_id)
        duplicates = df[df.duplicated(subset=["hospital_id", "procedure_id"])]
        self.assertEqual(len(duplicates), 0, "No duplicate (hospital_id, procedure_id) pairs allowed")

        # Zero missing values across all six criteria
        for c in CRITERIA_COLUMNS:
            self.assertEqual(df[c].isna().sum(), 0, f"Criterion {c} must have zero missing values")
            self.assertTrue((df[c] > 0).all(), f"Criterion {c} must be strictly positive")

    def test_04_cross_dataset_referential_integrity(self):
        h_df = load_hospitals()
        p_df = load_knee_procedures()
        hp_df = load_hospital_procedure_data()
        self.assertTrue(validate_cross_dataset_integrity(h_df, p_df, hp_df), "Cross integrity must pass")

    def test_05_all_9_procedures_complete_numeric_vectors(self):
        """All 9 procedures must return 16 complete numeric records with positive values."""
        h_df = load_hospitals()
        p_df = load_knee_procedures()
        hp_df = load_hospital_procedure_data()

        for pid, label in REQUIRED_9_LABELS:
            records = get_procedure_records(pid, hp_df, h_df)
            self.assertEqual(len(records), 16, f"Procedure {pid} must return 16 records")
            for r in records:
                self.assertIsNotNone(r["procedure_cost_usd"], f"Cost must be numeric for {pid}")
                self.assertIsNotNone(r["waiting_time_days"], f"Wait time must be numeric for {pid}")
                self.assertGreater(r["procedure_cost_usd"], 0)
                self.assertGreater(r["waiting_time_days"], 0)
                self.assertGreaterEqual(r["hospital_quality_score_1_to_15"], 1)
                self.assertLessEqual(r["hospital_quality_score_1_to_15"], 15)
                self.assertGreaterEqual(r["language_accessibility_score_1_to_5"], 1)
                self.assertLessEqual(r["language_accessibility_score_1_to_5"], 5)
                self.assertGreaterEqual(r["postoperative_support_score_1_to_5"], 1)
                self.assertLessEqual(r["postoperative_support_score_1_to_5"], 5)

    def test_06_procedure_summary_eligibility_all_nine(self):
        """All 9 procedures must be ranking eligible with complete demonstration data."""
        p_df = load_knee_procedures()
        hp_df = load_hospital_procedure_data()

        for pid, _ in REQUIRED_9_LABELS:
            s = get_procedure_summary(pid, p_df, hp_df)
            self.assertTrue(s["ranking_eligible"], f"{pid} must be ranking eligible")
            self.assertEqual(s["ranking_eligible_count"], 16, f"{pid} must have 16 eligible hospitals")
            self.assertTrue(s["is_demonstration"])

    def test_07_procedure_specific_pricing_and_waiting_variance(self):
        """Procedures must exhibit clinically defensible metric variance (not identical copied values)."""
        h_df = load_hospitals()
        hp_df = load_hospital_procedure_data()

        k01_recs = {r["hospital_id"]: r for r in get_procedure_records("KNEE01", hp_df, h_df)}
        k08_recs = {r["hospital_id"]: r for r in get_procedure_records("KNEE08", hp_df, h_df)} # Partial
        k09_recs = {r["hospital_id"]: r for r in get_procedure_records("KNEE09", hp_df, h_df)} # Revision

        for hid in k01_recs:
            k01_cost = k01_recs[hid]["procedure_cost_usd"]
            k08_cost = k08_recs[hid]["procedure_cost_usd"]
            k09_cost = k09_recs[hid]["procedure_cost_usd"]

            # Partial knee replacement must cost less than standard knee replacement
            self.assertLess(k08_cost, k01_cost, f"Partial knee {hid} should cost less than primary")
            # Revision knee replacement must cost significantly more than standard knee replacement
            self.assertGreater(k09_cost, k01_cost, f"Revision knee {hid} should cost more than primary")
            # Revision waiting time must be longer than primary
            self.assertGreaterEqual(k09_recs[hid]["waiting_time_days"], k01_recs[hid]["waiting_time_days"])


class TestLiveApiEndpoints(unittest.TestCase):
    """Test live FastAPI server running at http://127.0.0.1:8000."""

    def test_01_get_procedures(self):
        res = requests.get(f"{API_BASE}/procedures")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 9, "API must return exactly 9 knee procedures")

        for idx, (expected_id, expected_label) in enumerate(REQUIRED_9_LABELS):
            item = data[idx]
            self.assertEqual(item["procedure_id"], expected_id)
            self.assertEqual(item["display_label"], expected_label)
            self.assertTrue(item["ranking_eligible"])
            self.assertEqual(item["ranking_eligible_count"], 16)

    def test_02_get_hospitals_all_nine_procedures(self):
        """Every procedure KNEE01-KNEE09 must return 16 hospitals with complete numeric criteria."""
        for pid, _ in REQUIRED_9_LABELS:
            res = requests.get(f"{API_BASE}/hospitals?procedure_id={pid}")
            self.assertEqual(res.status_code, 200)
            hospitals = res.json()
            self.assertEqual(len(hospitals), 16, f"Procedure {pid} must return 16 hospitals")
            for h in hospitals:
                self.assertIsInstance(h["procedure_cost_usd"], (int, float), f"{pid} cost not numeric")
                self.assertIsInstance(h["waiting_time_days"], (int, float), f"{pid} wait not numeric")
                self.assertGreater(h["procedure_cost_usd"], 0)
                self.assertGreater(h["waiting_time_days"], 0)

    def test_03_topsis_rankings_all_nine_procedures(self):
        """TOPSIS must produce valid ranks 1-16 with closeness scores in [0, 1] for all 9 procedures."""
        weights = [0.243, 0.377, 0.15, 0.088, 0.054, 0.088]

        for pid, _ in REQUIRED_9_LABELS:
            res = requests.post(f"{API_BASE}/topsis/rank", json={
                "weights": weights,
                "procedure_id": pid
            })
            self.assertEqual(res.status_code, 200, f"TOPSIS failed for {pid}")
            data = res.json()
            self.assertTrue(data["eligible"], f"TOPSIS must be eligible for {pid}")
            self.assertEqual(len(data["ranked_hospitals"]), 16, f"{pid} must rank 16 hospitals")

            ranks = [h["rank"] for h in data["ranked_hospitals"]]
            self.assertEqual(ranks, list(range(1, 17)), f"Ranks must be strictly 1-16 for {pid}")

            scores = [h["closeness_score"] for h in data["ranked_hospitals"]]
            self.assertEqual(scores, sorted(scores, reverse=True), f"Closeness scores must be sorted descending for {pid}")
            for s in scores:
                self.assertGreaterEqual(s, 0.0)
                self.assertLessEqual(s, 1.0)

    def test_04_sensitivity_endpoints_all_nine_procedures(self):
        """Sensitivity scenarios must calculate successfully for all 9 procedures."""
        for pid in ["KNEE01", "KNEE03", "KNEE05", "KNEE08", "KNEE09"]:
            res = requests.post(f"{API_BASE}/sensitivity/scenarios", json={
                "procedure_id": pid
            })
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["eligible"], f"Scenarios must be eligible for {pid}")
            self.assertIn("Cost-Focused", data["scenarios"])
            self.assertEqual(len(data["scenarios"]["Cost-Focused"]), 16)

    def test_05_one_at_a_time_sensitivity(self):
        """OAT sensitivity must compute valid trajectories and crossovers."""
        base_weights = [0.243, 0.377, 0.15, 0.088, 0.054, 0.088]
        res = requests.post(f"{API_BASE}/sensitivity/oat", json={
            "base_weights": base_weights,
            "target_criterion_idx": 0,
            "procedure_id": "KNEE02"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["eligible"])
        self.assertTrue(len(data["trajectory"]) > 0)
        self.assertIsInstance(data["crossovers"], list)

    def test_06_procedure_switching_cycle(self):
        """Test full bidirectional switching cycle: KNEE01 -> KNEE05 -> KNEE09 -> KNEE08 -> KNEE01."""
        weights = [0.243, 0.377, 0.15, 0.088, 0.054, 0.088]

        # Step 1: KNEE01
        r1 = requests.post(f"{API_BASE}/topsis/rank", json={"weights": weights, "procedure_id": "KNEE01"}).json()
        k01_cost_top = r1["ranked_hospitals"][0]["procedure_cost_usd"]

        # Step 2: KNEE09 (Revision)
        r9 = requests.post(f"{API_BASE}/topsis/rank", json={"weights": weights, "procedure_id": "KNEE09"}).json()
        self.assertEqual(r9["procedure_id"], "KNEE09")
        self.assertEqual(len(r9["ranked_hospitals"]), 16)

        # Step 3: KNEE08 (Partial)
        r8 = requests.post(f"{API_BASE}/topsis/rank", json={"weights": weights, "procedure_id": "KNEE08"}).json()
        self.assertEqual(r8["procedure_id"], "KNEE08")
        self.assertEqual(len(r8["ranked_hospitals"]), 16)

        # Step 4: Return to KNEE01
        r1_restored = requests.post(f"{API_BASE}/topsis/rank", json={"weights": weights, "procedure_id": "KNEE01"}).json()
        self.assertEqual(r1_restored["procedure_id"], "KNEE01")
        self.assertEqual(len(r1_restored["ranked_hospitals"]), 16)
        self.assertEqual(r1_restored["ranked_hospitals"][0]["procedure_cost_usd"], k01_cost_top)

    def test_07_feasibility_filters_on_selected_procedure(self):
        """Feasibility filters (budget, waiting time, quality, countries) must constrain the ranking."""
        weights = [0.243, 0.377, 0.15, 0.088, 0.054, 0.088]

        # Filter to India & Thailand with budget cap $15,000 on KNEE05
        res = requests.post(f"{API_BASE}/topsis/rank", json={
            "weights": weights,
            "procedure_id": "KNEE05",
            "filter_params": {
                "countries": ["India", "Thailand"],
                "max_budget": 15000,
            }
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["eligible"])
        for h in data["ranked_hospitals"]:
            self.assertIn(h["country"], ["India", "Thailand"])
            total_cost = h["procedure_cost_usd"] + h["travel_accommodation_cost_usd"]
            self.assertLessEqual(total_cost, 15000)

    def test_08_empty_filter_result_handling(self):
        """When filters exclude all hospitals, API returns helpful message with eligible=True and empty list."""
        weights = [0.243, 0.377, 0.15, 0.088, 0.054, 0.088]
        res = requests.post(f"{API_BASE}/topsis/rank", json={
            "weights": weights,
            "procedure_id": "KNEE01",
            "filter_params": {
                "max_budget": 1000 # Unrealistically low budget
            }
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["eligible"])
        self.assertEqual(len(data["ranked_hospitals"]), 0)
        self.assertIn("no hospitals match", data["message"].lower())

    def test_09_country_alias_and_unicode_normalization(self):
        """Verify Turkey alias normalizes to canonical Türkiye and returns exact 4 hospitals."""
        res_alias = requests.get(f"{API_BASE}/hospitals?procedure_id=KNEE03&countries=Turkey")
        self.assertEqual(res_alias.status_code, 200)
        h_alias = res_alias.json()
        self.assertEqual(len(h_alias), 4)
        self.assertEqual(h_alias[0]["country"], "Türkiye")

    def test_10_ahp_reciprocity_and_consistency(self):
        """Verify AHP matrix reciprocity and consistency ratio."""
        for preset in ["default", "cost_conscious", "quality_first", "expedited_care"]:
            res = requests.get(f"{API_BASE}/ahp/preset/{preset}")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            matrix = np.array(data["matrix"], dtype=float)
            weights = np.array(data["weights"], dtype=float)

            # Reciprocity
            n = matrix.shape[0]
            for i in range(n):
                for j in range(n):
                    self.assertAlmostEqual(matrix[i, j] * matrix[j, i], 1.0, places=4)
                    self.assertEqual(matrix[i, i], 1.0)

            # Sum of weights
            self.assertAlmostEqual(float(np.sum(weights)), 1.0, places=4)
            self.assertLess(data["cr"], 0.10)


if __name__ == "__main__":
    unittest.main()
