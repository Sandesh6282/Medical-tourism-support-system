"""
Deterministic Synthetic Simulation Data Generator for 9 Knee Procedures x 16 Hospitals (144 combinations).
Generates data/hospital_procedure_data.csv.
Adheres strictly to academic integrity guidelines:
SYNTHETIC SIMULATION DATA — FOR ACADEMIC DEMONSTRATION ONLY.
"""

import sys
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load base 16 hospitals and KNEE01 baseline
demo_df = pd.read_csv(PROJECT_ROOT / "data" / "FYP_hospital_dataset.csv")
procedures_df = pd.read_csv(PROJECT_ROOT / "data" / "knee_procedures.csv")

# Baseline 16 hospital records for KNEE01
base_records = {}
for _, row in demo_df.iterrows():
    base_records[row["hospital_id"]] = {
        "hospital_id": row["hospital_id"],
        "hospital_name": row["hospital_name"],
        "country": row["country"],
        "city_or_region": row["city_or_region"],
        "cost": float(row["procedure_cost_usd"]),
        "quality": int(row["hospital_quality_score_1_to_15"] if "hospital_quality_score_1_to_15" in row else row["hospital_quality_score"]),
        "waiting": int(row["waiting_time_days"]),
        "travel": float(row["travel_accommodation_cost_usd"]),
        "language": int(row["language_accessibility_score_1_to_5"] if "language_accessibility_score_1_to_5" in row else row["language_accessibility_score"]),
        "postop": int(row["postoperative_support_score_1_to_5"] if "postoperative_support_score_1_to_5" in row else row["postoperative_support_score"]),
    }

PROCEDURE_PARAMS = {
    "KNEE01": {"cost_mult": 1.00, "cost_jitter": 0,   "wait_add": 0,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE02": {"cost_mult": 1.12, "cost_jitter": 50,  "wait_add": 2,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE03": {"cost_mult": 1.26, "cost_jitter": -50, "wait_add": 3,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE04": {"cost_mult": 1.02, "cost_jitter": 25,  "wait_add": 1,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE05": {"cost_mult": 1.22, "cost_jitter": 75,  "wait_add": 3,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE06": {"cost_mult": 1.04, "cost_jitter": -25, "wait_add": 1,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE07": {"cost_mult": 0.99, "cost_jitter": 0,   "wait_add": 0,  "travel_mult": 1.00, "qual_adj": 0},
    "KNEE08": {"cost_mult": 0.80, "cost_jitter": -50, "wait_add": -2, "travel_mult": 0.92, "qual_adj": 0},
    "KNEE09": {"cost_mult": 1.55, "cost_jitter": 100, "wait_add": 10, "travel_mult": 1.15, "qual_adj": 0},
}

rows = []
for p_id in procedures_df["procedure_id"]:
    params = PROCEDURE_PARAMS.get(p_id, {"cost_mult": 1.0, "cost_jitter": 0, "wait_add": 0, "travel_mult": 1.0, "qual_adj": 0})
    for h_id, b in base_records.items():
        if p_id == "KNEE01":
            # Exact match with FYP_hospital_dataset.csv
            cost = int(round(b["cost"]))
            qual = b["quality"]
            wait = b["waiting"]
            travel = int(round(b["travel"]))
            lang = b["language"]
            postop = b["postop"]
        else:
            # Deterministic calculation
            cost = int(round((b["cost"] * params["cost_mult"] + params["cost_jitter"]) / 50.0) * 50)
            qual = max(1, min(15, b["quality"] + params["qual_adj"]))
            
            # Revision wait time scales proportionally with baseline country waiting times
            if p_id == "KNEE09":
                if b["country"] == "USA":
                    wait = b["waiting"] + 14 # US wait times: 28-42 days baseline -> 42-56 days
                else:
                    wait = b["waiting"] + 8  # International wait times: 6-11 days baseline -> 14-19 days
            elif p_id == "KNEE08":
                wait = max(4, b["waiting"] + params["wait_add"])
            else:
                wait = max(4, b["waiting"] + params["wait_add"])

            travel = int(round((b["travel"] * params["travel_mult"]) / 25.0) * 25)
            lang = b["language"]
            postop = b["postop"]

        row = {
            "hospital_id": h_id,
            "procedure_id": p_id,
            "procedure_available": "YES",
            "availability_data_status": "SYNTHETIC_SIMULATION",
            "procedure_cost_usd": cost,
            "procedure_cost_data_status": "SYNTHETIC_SIMULATION",
            "hospital_quality_score_1_to_15": qual,
            "hospital_quality_data_status": "SYNTHETIC_SIMULATION",
            "waiting_time_days": wait,
            "waiting_time_data_status": "SYNTHETIC_SIMULATION",
            "travel_accommodation_cost_usd": travel,
            "travel_accommodation_data_status": "SYNTHETIC_SIMULATION",
            "language_accessibility_score_1_to_5": lang,
            "language_accessibility_data_status": "SYNTHETIC_SIMULATION",
            "postoperative_support_score_1_to_5": postop,
            "postoperative_support_data_status": "SYNTHETIC_SIMULATION",
            "source_url": "https://circ.in/pdf/Report-ICRR2023.pdf",
            "source_title": "Synthetic Multi-Procedure Simulation Model",
            "verification_date": "2026-10-17",
            "source_scope_notes": "SYNTHETIC SIMULATION DATA — FOR ACADEMIC DEMONSTRATION ONLY",
            "ranking_eligible": "YES",
            "ranking_eligibility_reason": "Complete synthetic simulation vector available for academic demonstration",
        }
        rows.append(row)

out_df = pd.DataFrame(rows)
target_path = PROJECT_ROOT / "data" / "hospital_procedure_data.csv"
out_df.to_csv(target_path, index=False)
print(f"Successfully generated and wrote {len(out_df)} rows to {target_path}")
