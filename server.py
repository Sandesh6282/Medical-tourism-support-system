"""
FastAPI Backend for Medical Tourism Decision Support System (AHP-TOPSIS).

Exposes the analytical engine and hospital dataset over REST API for the unified React application.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from utils.data_loader import (
    load_hospital_data,
    filter_hospitals,
    load_hospitals,
    load_knee_procedures,
    load_hospital_procedure_data,
    validate_cross_dataset_integrity,
    get_procedure_records,
    get_procedure_summary,
    get_procedure_dataframe,
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
    get_illustrative_default_matrix,
    get_preset_archetype_matrix,
    validate_pairwise_matrix,
    SAATY_SCALE,
    RANDOM_INDEX_TABLE,
)
from utils.topsis import calculate_topsis_rankings
from utils.sensitivity import (
    PREDEFINED_SCENARIOS,
    run_predefined_scenarios,
    run_one_at_a_time_sensitivity,
    find_rank_reversals,
    adjust_weights_proportionally,
)

app = FastAPI(
    title="Medical Tourism DSS API",
    description="Backend calculation engine for AHP-TOPSIS Hospital Decision Support System",
    version="1.0.0",
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load base datasets at startup
try:
    hospital_df = load_hospital_data()
    hospitals_meta_df = load_hospitals()
    knee_procedures_df = load_knee_procedures()
    hospital_procedure_df = load_hospital_procedure_data()
    validate_cross_dataset_integrity(hospitals_meta_df, knee_procedures_df, hospital_procedure_df)
except Exception as e:
    raise RuntimeError(f"Failed to initialize hospital and procedure datasets: {e}")


# ==========================================
# Pydantic Request / Response Models
# ==========================================

class FilterParams(BaseModel):
    countries: Optional[List[str]] = None
    max_budget: Optional[float] = None
    max_waiting_time: Optional[float] = None
    min_quality: Optional[float] = None
    procedure_id: Optional[str] = "KNEE01"


class AHPMatrixRequest(BaseModel):
    matrix: List[List[float]]


class TOPSISRequest(BaseModel):
    weights: List[float]
    filter_params: Optional[FilterParams] = None
    procedure_id: Optional[str] = "KNEE01"


class SensitivityScenariosRequest(BaseModel):
    base_weights: Optional[List[float]] = None
    filter_params: Optional[FilterParams] = None
    procedure_id: Optional[str] = "KNEE01"


class SensitivityOATRequest(BaseModel):
    base_weights: List[float]
    target_criterion_idx: int
    weight_min: Optional[float] = 0.05
    weight_max: Optional[float] = 0.65
    steps: Optional[int] = 13
    filter_params: Optional[FilterParams] = None
    procedure_id: Optional[str] = "KNEE01"


# ==========================================
# Endpoints
# ==========================================

@app.get("/api/meta")
def get_metadata():
    """Return system configuration, metadata, criteria definitions, procedure options, and disclaimer."""
    procedure_summaries = [
        get_procedure_summary(proc_id, knee_procedures_df, hospital_procedure_df)
        for proc_id in knee_procedures_df["procedure_id"]
    ]
    return {
        "disclaimer": SYNTHETIC_DATA_DISCLAIMER,
        "criteria_columns": CRITERIA_COLUMNS,
        "criteria_display_names": CRITERIA_DISPLAY_NAMES,
        "criteria_types": CRITERIA_TYPES,
        "target_countries": TARGET_COUNTRIES,
        "saaty_scale": SAATY_SCALE,
        "random_index_table": RANDOM_INDEX_TABLE,
        "total_hospitals": len(hospitals_meta_df),
        "total_procedures": len(knee_procedures_df),
        "procedures": procedure_summaries,
        "active_dataset_files": [
            "FYP_hospital_dataset.csv",
            "hospitals.csv",
            "knee_procedures.csv",
            "hospital_procedure_data.csv",
        ],
    }


@app.get("/api/procedures")
def get_procedures():
    """Retrieve all 9 knee procedure options with metadata and availability status."""
    summaries = [
        get_procedure_summary(proc_id, knee_procedures_df, hospital_procedure_df)
        for proc_id in knee_procedures_df["procedure_id"]
    ]
    return summaries


@app.get("/api/procedures/{procedure_id}")
def get_procedure(procedure_id: str):
    """Retrieve detailed metadata and ranking eligibility for a specific procedure."""
    try:
        return get_procedure_summary(procedure_id, knee_procedures_df, hospital_procedure_df)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/hospitals")
def get_hospitals(
    procedure_id: Optional[str] = "KNEE01",
    countries: Optional[List[str]] = Query(None),
    max_budget: Optional[float] = None,
    max_waiting_time: Optional[float] = None,
    min_quality: Optional[float] = None,
):
    """
    Retrieve filtered hospital dataset for the selected procedure.
    - KNEE01 returns the legacy synthetic demonstration data.
    - KNEE02-KNEE09 returns the records from hospital_procedure_data.csv joined with hospitals.csv,
      preserving unknown values as null (never zero).
    """
    try:
        records = get_procedure_records(
            procedure_id=procedure_id or "KNEE01",
            hosp_proc_df=hospital_procedure_df,
            hospitals_df=hospitals_meta_df,
            legacy_df=hospital_df,
            countries=countries,
            max_budget=max_budget,
            max_waiting_time=max_waiting_time,
            min_quality=min_quality,
        )
        return records
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error retrieving hospital records: {e}")


@app.get("/api/ahp/preset/{archetype}")
def get_ahp_preset(archetype: str):
    """Retrieve preset comparison matrix and computed weights for standard archetypes."""
    clean_arch = archetype.lower().strip()
    if clean_arch in ["default", "illustrative"]:
        matrix = get_illustrative_default_matrix()
    else:
        matrix = get_preset_archetype_matrix(clean_arch)

    weights = calculate_weights(matrix)
    lambda_max, ci, cr, is_consistent = calculate_consistency_ratio(matrix, weights)

    return {
        "archetype": clean_arch,
        "matrix": matrix.tolist(),
        "weights": weights.tolist(),
        "lambda_max": round(float(lambda_max), 4),
        "ci": round(float(ci), 4),
        "cr": round(float(cr), 4),
        "is_consistent": is_consistent,
    }


@app.post("/api/ahp/calculate")
def calculate_ahp(req: AHPMatrixRequest):
    """Validate pairwise matrix and compute priority weights and consistency ratio."""
    try:
        matrix = np.array(req.matrix, dtype=float)
        validate_pairwise_matrix(matrix)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    weights = calculate_weights(matrix)
    lambda_max, ci, cr, is_consistent = calculate_consistency_ratio(matrix, weights)

    return {
        "matrix": matrix.tolist(),
        "weights": weights.tolist(),
        "lambda_max": round(float(lambda_max), 4),
        "ci": round(float(ci), 4),
        "cr": round(float(cr), 4),
        "is_consistent": is_consistent,
    }


@app.post("/api/topsis/rank")
def run_topsis(req: TOPSISRequest):
    """Execute TOPSIS ranking against the hospital dataset for the selected procedure."""
    proc_id = (
        req.procedure_id
        or (req.filter_params.procedure_id if req.filter_params else None)
        or "KNEE01"
    ).upper().strip()

    try:
        summary = get_procedure_summary(proc_id, knee_procedures_df, hospital_procedure_df)
        base_proc_df = get_procedure_dataframe(proc_id, hospital_procedure_df, hospitals_meta_df, hospital_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check ranking eligibility
    if not summary["ranking_eligible"]:
        return {
            "eligible": False,
            "procedure_id": proc_id,
            "procedure_label": summary["display_label"],
            "message": summary["data_availability_message"],
            "is_demonstration": True,
            "ranked_hospitals": [],
        }

    # Execute TOPSIS for eligible procedure using procedure-specific dataset
    data = base_proc_df
    if req.filter_params:
        data = filter_hospitals(
            base_proc_df,
            countries=req.filter_params.countries,
            max_budget=req.filter_params.max_budget,
            max_waiting_time=req.filter_params.max_waiting_time,
            min_quality=req.filter_params.min_quality,
        )

    if data.empty:
        return {
            "eligible": True,
            "procedure_id": proc_id,
            "procedure_label": summary["display_label"],
            "message": "No hospitals match the active filter criteria. Please broaden your budget, waiting time, quality threshold, or country selection.",
            "is_demonstration": True,
            "ranked_hospitals": [],
        }

    # Validate weights: non-negative, finite, sum to 1
    w_arr = np.array(req.weights, dtype=float)
    if len(w_arr) != len(CRITERIA_COLUMNS):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(CRITERIA_COLUMNS)} weights, received {len(w_arr)}"
        )
    if not np.all(np.isfinite(w_arr)) or np.any(w_arr < 0):
        raise HTTPException(
            status_code=400,
            detail="AHP weights must be finite and non-negative."
        )
    if not np.isclose(np.sum(w_arr), 1.0, atol=0.01):
        w_arr = w_arr / np.sum(w_arr)

    criteria_types_list = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]

    try:
        ranked = calculate_topsis_rankings(
            data,
            CRITERIA_COLUMNS,
            w_arr.tolist(),
            criteria_types_list,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"TOPSIS calculation error: {e}")

    ranked_dict = ranked.to_dict(orient="records")
    for r in ranked_dict:
        r["procedure_id"] = proc_id
        r["procedure_name"] = summary["display_label"]
        r["is_demonstration"] = True

    return {
        "eligible": True,
        "procedure_id": proc_id,
        "procedure_label": summary["display_label"],
        "message": SYNTHETIC_DATA_DISCLAIMER,
        "is_demonstration": True,
        "ranked_hospitals": ranked_dict,
    }


@app.post("/api/sensitivity/scenarios")
def run_scenarios(req: SensitivityScenariosRequest):
    """Execute TOPSIS across all predefined preference scenarios for the selected procedure."""
    proc_id = (
        req.procedure_id
        or (req.filter_params.procedure_id if req.filter_params else None)
        or "KNEE01"
    ).upper().strip()

    try:
        summary = get_procedure_summary(proc_id, knee_procedures_df, hospital_procedure_df)
        base_proc_df = get_procedure_dataframe(proc_id, hospital_procedure_df, hospitals_meta_df, hospital_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not summary["ranking_eligible"]:
        return {
            "eligible": False,
            "procedure_id": proc_id,
            "message": summary["data_availability_message"],
            "scenarios": {},
        }

    data = base_proc_df
    if req.filter_params:
        data = filter_hospitals(
            base_proc_df,
            countries=req.filter_params.countries,
            max_budget=req.filter_params.max_budget,
            max_waiting_time=req.filter_params.max_waiting_time,
            min_quality=req.filter_params.min_quality,
        )

    if data.empty:
        raise HTTPException(status_code=400, detail="No hospitals match active filters.")

    criteria_types_list = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]
    base_w = np.array(req.base_weights, dtype=float) if req.base_weights else None

    scenarios = run_predefined_scenarios(
        data,
        CRITERIA_COLUMNS,
        criteria_types_list,
        base_weights=base_w,
    )

    out = {}
    for name, res_df in scenarios.items():
        records = res_df.to_dict(orient="records")
        for r in records:
            r["procedure_id"] = proc_id
            r["procedure_name"] = summary["display_label"]
            r["is_demonstration"] = True
        out[name] = records

    return {
        "eligible": True,
        "procedure_id": proc_id,
        "procedure_label": summary["display_label"],
        "message": SYNTHETIC_DATA_DISCLAIMER,
        "scenarios": out,
    }


@app.post("/api/sensitivity/oat")
def run_oat(req: SensitivityOATRequest):
    """Execute One-At-A-Time sensitivity simulation for a selected criterion and procedure."""
    proc_id = (
        req.procedure_id
        or (req.filter_params.procedure_id if req.filter_params else None)
        or "KNEE01"
    ).upper().strip()

    try:
        summary = get_procedure_summary(proc_id, knee_procedures_df, hospital_procedure_df)
        base_proc_df = get_procedure_dataframe(proc_id, hospital_procedure_df, hospitals_meta_df, hospital_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not summary["ranking_eligible"]:
        return {
            "eligible": False,
            "procedure_id": proc_id,
            "message": summary["data_availability_message"],
            "trajectory": [],
            "crossovers": [],
        }

    data = base_proc_df
    if req.filter_params:
        data = filter_hospitals(
            base_proc_df,
            countries=req.filter_params.countries,
            max_budget=req.filter_params.max_budget,
            max_waiting_time=req.filter_params.max_waiting_time,
            min_quality=req.filter_params.min_quality,
        )

    if data.empty:
        raise HTTPException(status_code=400, detail="No hospitals match active filters.")

    criteria_types_list = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]
    base_w = np.array(req.base_weights, dtype=float)

    weight_steps = np.linspace(req.weight_min, req.weight_max, req.steps)

    try:
        oat_df = run_one_at_a_time_sensitivity(
            data,
            CRITERIA_COLUMNS,
            base_w,
            criteria_types_list,
            target_criterion_idx=req.target_criterion_idx,
            weight_range=weight_steps,
        )
        crossovers = find_rank_reversals(oat_df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sensitivity simulation error: {e}")

    return {
        "eligible": True,
        "procedure_id": proc_id,
        "procedure_label": summary["display_label"],
        "message": SYNTHETIC_DATA_DISCLAIMER,
        "trajectory": oat_df.to_dict(orient="records"),
        "crossovers": crossovers,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)

