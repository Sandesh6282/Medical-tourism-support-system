"""
Data Loader and Validation Module.

This module provides data ingestion, verification, and preprocessing utilities
for the medical tourism hospital dataset focused on knee replacement surgery
across India, Turkey, Thailand, and the USA.

The Six Core Decision Criteria:
Cost Criteria (Lower is Better):
1. Procedure Cost: procedure_cost_usd (USD)
2. Waiting Time: waiting_time_days (Days)
3. Travel and Accommodation Cost: travel_accommodation_cost_usd (USD)

Benefit Criteria (Higher is Better):
4. Hospital Quality: hospital_quality_score_1_to_15 (1-15 scale)
5. Language Accessibility: language_accessibility_score_1_to_5 (1-5 scale)
6. Post-operative Support: postoperative_support_score_1_to_5 (1-5 scale)

Target Countries:
- India
- Turkey
- Thailand
- USA
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd


# Default dataset path resolved relative to this source file (project root / data / FYP_hospital_dataset.csv)
DEFAULT_DATA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "FYP_hospital_dataset.csv"
)

# Multi-procedure dataset paths
HOSPITALS_DATA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "hospitals.csv"
)

KNEE_PROCEDURES_DATA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "knee_procedures.csv"
)

HOSPITAL_PROCEDURE_DATA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "hospital_procedure_data.csv"
)

# Mandatory transparency disclaimer for synthetic demonstration data
SYNTHETIC_DATA_DISCLAIMER: str = (
    "Results are based on synthetic demonstration data for academic AHP-TOPSIS evaluation. "
    "Hospital-specific prices, waiting times, and scores have not been independently verified. "
    "Rankings are illustrative and are not medical advice or verified hospital recommendations."
)

# Insufficient data notice for non-demonstration knee procedures
INSUFFICIENT_DATA_NOTICE: str = (
    "Insufficient verified hospital data entered for this procedure. All 16 candidate hospital records in hospital_procedure_data.csv are currently unverified (UNKNOWN; blank fields are not zero). Defensible rankings cannot be generated."
)

# Exact 9 knee procedure specifications requested
EXPECTED_PROCEDURES: List[Dict[str, str]] = [
    {"procedure_id": "KNEE01", "display_label": "Knee replacement"},
    {"procedure_id": "KNEE02", "display_label": "Total knee replacement (TKR) with OMNI"},
    {"procedure_id": "KNEE03", "display_label": "Knee MAKoplasty"},
    {"procedure_id": "KNEE04", "display_label": "Total Knee Replacement (Arthroplasty)"},
    {"procedure_id": "KNEE05", "display_label": "Robotic knee replacement surgery"},
    {"procedure_id": "KNEE06", "display_label": "Knee arthroplastic"},
    {"procedure_id": "KNEE07", "display_label": "Unilateral knee arthroplasty"},
    {"procedure_id": "KNEE08", "display_label": "Unicompartmental (partial) knee replacement"},
    {"procedure_id": "KNEE09", "display_label": "Revision knee arthroplasty"},
]

# Canonical 6 criteria column names
CRITERIA_COLUMNS: List[str] = [
    "procedure_cost_usd",
    "hospital_quality_score_1_to_15",
    "waiting_time_days",
    "travel_accommodation_cost_usd",
    "language_accessibility_score_1_to_5",
    "postoperative_support_score_1_to_5",
]

# Display labels for UI and plots
CRITERIA_DISPLAY_NAMES: Dict[str, str] = {
    "procedure_cost_usd": "Procedure Cost (USD)",
    "hospital_quality_score_1_to_15": "Hospital Quality (1-15)",
    "waiting_time_days": "Waiting Time (Days)",
    "travel_accommodation_cost_usd": "Travel & Accommodation Cost (USD)",
    "language_accessibility_score_1_to_5": "Language Accessibility (1-5)",
    "postoperative_support_score_1_to_5": "Post-operative Support (1-5)",
}

# Criteria type classification for TOPSIS ('cost' = lower is better, 'benefit' = higher is better)
CRITERIA_TYPES: Dict[str, str] = {
    "procedure_cost_usd": "cost",
    "hospital_quality_score_1_to_15": "benefit",
    "waiting_time_days": "cost",
    "travel_accommodation_cost_usd": "cost",
    "language_accessibility_score_1_to_5": "benefit",
    "postoperative_support_score_1_to_5": "benefit",
}

# Target countries evaluated in the study (canonical country label: Türkiye)
TARGET_COUNTRIES: List[str] = [
    "India",
    "Türkiye",
    "Thailand",
    "USA",
]

def normalize_country_name(name: Any) -> str:
    """Standardise canonical country names, accepting legacy aliases like Turkey."""
    if name is None or pd.isna(name):
        return ""
    import unicodedata
    raw = str(name).strip()
    s = unicodedata.normalize("NFC", raw)
    # Check ASCII-folded representation for maximum alias and unicode tolerance
    ascii_folded = unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("utf-8").lower().strip()
    s_lower = s.lower()
    if s_lower in ["turkey", "turkiye", "türkiye"] or ascii_folded in ["turkey", "turkiye"]:
        return "Türkiye"
    if s_lower in ["india"] or ascii_folded == "india":
        return "India"
    if s_lower in ["thailand"] or ascii_folded == "thailand":
        return "Thailand"
    if s_lower in ["usa", "us", "united states", "united states of america"] or ascii_folded in ["usa", "us", "united states"]:
        return "USA"
    return s

# Required identifying columns in the dataset
REQUIRED_METADATA_COLUMNS: List[str] = [
    "hospital_id",
    "hospital_name",
    "country",
    "city_or_region",
]


def load_hospital_data(filepath: Optional[Path] = None) -> pd.DataFrame:
    """
    Load raw hospital dataset from a CSV file using a root-resolved path.

    Args:
        filepath: Optional path to data file. If None, defaults to project_root/data/FYP_hospital_dataset.csv.

    Returns:
        pd.DataFrame: Validated raw hospital dataset.

    Raises:
        FileNotFoundError: If the specified or default file does not exist.
        ValueError: If dataset fails validation checks.
    """
    resolved_path = Path(filepath) if filepath else DEFAULT_DATA_PATH

    if not resolved_path.exists():
        raise FileNotFoundError(
            f"Hospital dataset not found at resolved path: {resolved_path}. "
            "Please ensure data/FYP_hospital_dataset.csv exists in the project root."
        )

    df = pd.read_csv(resolved_path)

    # Normalize CSV headers if legacy column names are present
    column_aliases = {
        "hospital_quality_score": "hospital_quality_score_1_to_15",
        "language_accessibility_score": "language_accessibility_score_1_to_5",
        "postoperative_support_score": "postoperative_support_score_1_to_5",
    }
    for old_col, new_col in column_aliases.items():
        if old_col in df.columns and new_col not in df.columns:
            df[new_col] = df[old_col]

    # Normalize country names to canonical Türkiye label, accepting legacy aliases
    if "country" in df.columns:
        df["country"] = df["country"].apply(normalize_country_name)

    validate_hospital_data(df)
    return df


def validate_hospital_data(df: pd.DataFrame) -> bool:
    """
    Validate that the hospital DataFrame adheres to schema, numerical, and categorical constraints.

    Checks:
    - Required metadata columns exist (hospital_id, hospital_name, country, city_or_region).
    - The six numerical criteria columns exist.
    - Dataset contains exactly 16 candidate hospitals across the 4 planned countries (4 per country).
    - No duplicate hospital IDs exist.
    - No null/missing values exist in critical identification or criteria fields.
    - All criteria values are positive numerics.
    - Scores are within their declared ranges (quality: 1-15, language: 1-5, post-op: 1-5).

    Args:
        df: DataFrame to validate.

    Returns:
        bool: True if validation passes.

    Raises:
        ValueError: If any validation rule is violated, with a clear description of the issue.
    """
    # 1. Check required metadata columns
    missing_meta = [col for col in REQUIRED_METADATA_COLUMNS if col not in df.columns]
    if missing_meta:
        raise ValueError(
            f"Dataset is missing required metadata columns: {missing_meta}"
        )

    # 2. Check 6 criteria columns
    missing_criteria = [col for col in CRITERIA_COLUMNS if col not in df.columns]
    if missing_criteria:
        raise ValueError(
            f"Dataset is missing required criteria columns: {missing_criteria}"
        )

    # 3. Check row count
    expected_rows = 16
    if len(df) != expected_rows:
        raise ValueError(
            f"Dataset row count mismatch: Expected {expected_rows} hospitals, found {len(df)}."
        )

    # 4. Check duplicate hospital IDs
    if df["hospital_id"].duplicated().any():
        duplicate_ids = df[df["hospital_id"].duplicated()]["hospital_id"].tolist()
        raise ValueError(
            f"Dataset contains duplicate hospital_id values: {duplicate_ids}"
        )

    # 5. Check null values
    check_cols = REQUIRED_METADATA_COLUMNS + CRITERIA_COLUMNS
    null_counts = df[check_cols].isnull().sum()
    cols_with_nulls = null_counts[null_counts > 0]
    if not cols_with_nulls.empty:
        raise ValueError(
            f"Dataset contains missing/null values in required columns:\n{cols_with_nulls.to_dict()}"
        )

    # 6. Check numeric validity and bounds on criteria
    for col in CRITERIA_COLUMNS:
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise ValueError(
                f"Criterion '{col}' must be numeric, but has dtype '{df[col].dtype}'."
            )
        if (df[col] <= 0).any():
            invalid_hospitals = df[df[col] <= 0]["hospital_id"].tolist()
            raise ValueError(
                f"Criterion '{col}' must be positive, but found non-positive values for hospitals: {invalid_hospitals}."
            )

    # 7. Check subjective score ranges
    if (df["hospital_quality_score_1_to_15"] < 1).any() or (df["hospital_quality_score_1_to_15"] > 15).any():
        invalid = df[(df["hospital_quality_score_1_to_15"] < 1) | (df["hospital_quality_score_1_to_15"] > 15)]["hospital_id"].tolist()
        raise ValueError(f"hospital_quality_score_1_to_15 must be between 1 and 15, invalid for: {invalid}")

    if (df["language_accessibility_score_1_to_5"] < 1).any() or (df["language_accessibility_score_1_to_5"] > 5).any():
        invalid = df[(df["language_accessibility_score_1_to_5"] < 1) | (df["language_accessibility_score_1_to_5"] > 5)]["hospital_id"].tolist()
        raise ValueError(f"language_accessibility_score_1_to_5 must be between 1 and 5, invalid for: {invalid}")

    if (df["postoperative_support_score_1_to_5"] < 1).any() or (df["postoperative_support_score_1_to_5"] > 5).any():
        invalid = df[(df["postoperative_support_score_1_to_5"] < 1) | (df["postoperative_support_score_1_to_5"] > 5)]["hospital_id"].tolist()
        raise ValueError(f"postoperative_support_score_1_to_5 must be between 1 and 5, invalid for: {invalid}")

    # 8. Check country distribution (canonical: India, Türkiye, Thailand, USA; 4 hospitals each)
    normalized_series = df["country"].apply(normalize_country_name)
    actual_countries = sorted(normalized_series.unique().tolist())
    expected_countries = sorted(TARGET_COUNTRIES)
    if actual_countries != expected_countries:
        raise ValueError(
            f"Country distribution mismatch: Expected {expected_countries}, found {actual_countries}."
        )

    counts_per_country = normalized_series.value_counts().to_dict()
    for c in TARGET_COUNTRIES:
        if counts_per_country.get(c, 0) != 4:
            raise ValueError(
                f"Expected exactly 4 hospitals for country '{c}', found {counts_per_country.get(c, 0)}."
            )

    return True


def filter_hospitals(
    df: pd.DataFrame,
    countries: Optional[List[str]] = None,
    max_budget: Optional[float] = None,
    max_waiting_time: Optional[float] = None,
    min_quality: Optional[float] = None,
) -> pd.DataFrame:
    """
    Filter dataset to include hospitals matching user constraints.

    Args:
        df: Hospital DataFrame.
        countries: Optional list of country names to retain.
        max_budget: Optional maximum total package cost (procedure + travel).
        max_waiting_time: Optional maximum acceptable waiting time in days.
        min_quality: Optional minimum acceptable hospital quality score (1-15).

    Returns:
        pd.DataFrame: Filtered DataFrame.
    """
    filtered = df.copy()

    if countries:
        norm_countries = [normalize_country_name(c) for c in countries]
        filtered = filtered[filtered["country"].apply(normalize_country_name).isin(norm_countries)]

    if max_budget is not None and max_budget > 0:
        # Total cost = procedure cost + travel & accommodation cost
        total_cost = filtered["procedure_cost_usd"] + filtered["travel_accommodation_cost_usd"]
        filtered = filtered[total_cost <= max_budget]

    if max_waiting_time is not None and max_waiting_time > 0:
        filtered = filtered[filtered["waiting_time_days"] <= max_waiting_time]

    if min_quality is not None and min_quality > 0:
        filtered = filtered[filtered["hospital_quality_score_1_to_15"] >= min_quality]

    return filtered


def load_hospitals(filepath: Optional[Path] = None) -> pd.DataFrame:
    """
    Load and validate hospital identity/location records from hospitals.csv.
    """
    resolved = Path(filepath) if filepath else HOSPITALS_DATA_PATH
    if not resolved.exists():
        raise FileNotFoundError(f"hospitals.csv not found at: {resolved}")
    df = pd.read_csv(resolved)
    if "country" in df.columns:
        df["country"] = df["country"].apply(normalize_country_name)
    validate_hospitals(df)
    return df


def validate_hospitals(df: pd.DataFrame) -> bool:
    """
    Validate hospitals.csv schema, counts, and critical metadata.
    """
    required = ["hospital_id", "hospital_name", "country", "city_or_region"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"hospitals.csv missing required columns: {missing}")
    if len(df) != 16:
        raise ValueError(f"Expected 16 hospitals, found {len(df)}")
    if df["hospital_id"].duplicated().any():
        dups = df[df["hospital_id"].duplicated()]["hospital_id"].tolist()
        raise ValueError(f"Duplicate hospital_id in hospitals.csv: {dups}")
    nulls = df[required].isnull().sum()
    if (nulls > 0).any():
        raise ValueError(f"Null values in required columns in hospitals.csv: {nulls[nulls > 0].to_dict()}")

    actual_countries = sorted(df["country"].apply(normalize_country_name).unique().tolist())
    expected_countries = sorted(TARGET_COUNTRIES)
    if actual_countries != expected_countries:
        raise ValueError(f"Country distribution mismatch in hospitals.csv: Expected {expected_countries}, found {actual_countries}")

    counts = df["country"].apply(normalize_country_name).value_counts().to_dict()
    for c in TARGET_COUNTRIES:
        if counts.get(c, 0) != 4:
            raise ValueError(f"Expected exactly 4 hospitals in '{c}', found {counts.get(c, 0)} in hospitals.csv")

    return True


def load_knee_procedures(filepath: Optional[Path] = None) -> pd.DataFrame:
    """
    Load and validate the nine knee procedure definitions from knee_procedures.csv.
    """
    resolved = Path(filepath) if filepath else KNEE_PROCEDURES_DATA_PATH
    if not resolved.exists():
        raise FileNotFoundError(f"knee_procedures.csv not found at: {resolved}")
    df = pd.read_csv(resolved)
    validate_knee_procedures(df)
    return df


def validate_knee_procedures(df: pd.DataFrame) -> bool:
    """
    Validate knee_procedures.csv schema and verify all 9 requested procedure labels.
    """
    required = ["procedure_id", "display_label", "normalized_procedure_code", "procedure_category"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"knee_procedures.csv missing required columns: {missing}")
    if len(df) != 9:
        raise ValueError(f"Expected exactly 9 knee procedures, found {len(df)}")
    expected_ids = [p["procedure_id"] for p in EXPECTED_PROCEDURES]
    actual_ids = df["procedure_id"].tolist()
    if actual_ids != expected_ids:
        raise ValueError(f"Procedure IDs mismatch: Expected {expected_ids}, found {actual_ids}")
    expected_labels = [p["display_label"] for p in EXPECTED_PROCEDURES]
    actual_labels = df["display_label"].tolist()
    if actual_labels != expected_labels:
        raise ValueError(f"Procedure labels mismatch:\nExpected: {expected_labels}\nFound: {actual_labels}")
    return True


def load_hospital_procedure_data(filepath: Optional[Path] = None) -> pd.DataFrame:
    """
    Load and validate hospital-procedure combinations from hospital_procedure_data.csv.
    Preserves unknown values as nulls/NaNs (never converts blanks to 0).
    """
    resolved = Path(filepath) if filepath else HOSPITAL_PROCEDURE_DATA_PATH
    if not resolved.exists():
        raise FileNotFoundError(f"hospital_procedure_data.csv not found at: {resolved}")
    df = pd.read_csv(resolved, keep_default_na=True)
    validate_hospital_procedure_data(df)
    return df


def validate_hospital_procedure_data(df: pd.DataFrame) -> bool:
    """
    Validate hospital_procedure_data.csv structure, count (16x9=144), unique combinations,
    and completeness of all six numerical decision criteria.
    """
    required = [
        "hospital_id",
        "procedure_id",
        "procedure_available",
        "procedure_cost_usd",
        "hospital_quality_score_1_to_15",
        "waiting_time_days",
        "travel_accommodation_cost_usd",
        "language_accessibility_score_1_to_5",
        "postoperative_support_score_1_to_5",
        "availability_data_status",
        "ranking_eligible",
        "ranking_eligibility_reason",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"hospital_procedure_data.csv missing required columns: {missing}")
    if len(df) != 144:
        raise ValueError(f"Expected 144 rows (16 hospitals x 9 procedures), found {len(df)}")
    if df.duplicated(subset=["hospital_id", "procedure_id"]).any():
        dups = df[df.duplicated(subset=["hospital_id", "procedure_id"])][["hospital_id", "procedure_id"]].to_dict(orient="records")
        raise ValueError(f"Duplicate (hospital_id, procedure_id) combinations in hospital_procedure_data.csv: {dups}")

    # Check for missing values in criteria
    for col in CRITERIA_COLUMNS:
        if df[col].isnull().any():
            null_entries = df[df[col].isnull()][["hospital_id", "procedure_id"]].to_dict(orient="records")
            raise ValueError(f"hospital_procedure_data.csv contains null values in criterion '{col}': {null_entries}")
        if (pd.to_numeric(df[col], errors="coerce") <= 0).any():
            invalid = df[pd.to_numeric(df[col], errors="coerce") <= 0][["hospital_id", "procedure_id"]].to_dict(orient="records")
            raise ValueError(f"hospital_procedure_data.csv contains non-positive values in criterion '{col}': {invalid}")

    # Check score bounds
    if (df["hospital_quality_score_1_to_15"] < 1).any() or (df["hospital_quality_score_1_to_15"] > 15).any():
        raise ValueError("hospital_quality_score_1_to_15 must be between 1 and 15")
    if (df["language_accessibility_score_1_to_5"] < 1).any() or (df["language_accessibility_score_1_to_5"] > 5).any():
        raise ValueError("language_accessibility_score_1_to_5 must be between 1 and 5")
    if (df["postoperative_support_score_1_to_5"] < 1).any() or (df["postoperative_support_score_1_to_5"] > 5).any():
        raise ValueError("postoperative_support_score_1_to_5 must be between 1 and 5")

    return True


def validate_cross_dataset_integrity(
    hospitals_df: pd.DataFrame,
    procedures_df: pd.DataFrame,
    hosp_proc_df: pd.DataFrame,
) -> bool:
    """
    Cross-validate foreign keys and 16x9 distribution across datasets.
    """
    hosp_ids = set(hospitals_df["hospital_id"])
    proc_ids = set(procedures_df["procedure_id"])

    invalid_h_fk = set(hosp_proc_df["hospital_id"]) - hosp_ids
    if invalid_h_fk:
        raise ValueError(f"Invalid hospital_id foreign keys in hospital_procedure_data: {invalid_h_fk}")

    invalid_p_fk = set(hosp_proc_df["procedure_id"]) - proc_ids
    if invalid_p_fk:
        raise ValueError(f"Invalid procedure_id foreign keys in hospital_procedure_data: {invalid_p_fk}")

    h_counts = hosp_proc_df.groupby("hospital_id").size()
    if not (h_counts == 9).all():
        raise ValueError("Not all hospitals have exactly 9 procedure records in hospital_procedure_data.")

    p_counts = hosp_proc_df.groupby("procedure_id").size()
    if not (p_counts == 16).all():
        raise ValueError("Not all procedures have exactly 16 hospital records in hospital_procedure_data.")

    return True


def get_procedure_dataframe(
    procedure_id: str,
    hosp_proc_df: pd.DataFrame,
    hospitals_df: pd.DataFrame,
    legacy_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Retrieve a clean, validated pd.DataFrame containing 16 candidate hospital records
    with all 6 numerical criteria for the selected procedure.
    """
    clean_id = (procedure_id or "KNEE01").upper().strip()
    proc_subset = hosp_proc_df[hosp_proc_df["procedure_id"] == clean_id].copy()

    if proc_subset.empty:
        if clean_id == "KNEE01" and legacy_df is not None:
            return legacy_df.copy()
        raise ValueError(f"Unknown procedure_id: {clean_id}")

    merged = proc_subset.merge(
        hospitals_df[["hospital_id", "hospital_name", "country", "city_or_region"]],
        on="hospital_id",
        how="left",
    )
    if "country" in merged.columns:
        merged["country"] = merged["country"].apply(normalize_country_name)

    for col in CRITERIA_COLUMNS:
        merged[col] = pd.to_numeric(merged[col], errors="coerce")

    proc_name_map = {p["procedure_id"]: p["display_label"] for p in EXPECTED_PROCEDURES}
    proc_name = proc_name_map.get(clean_id, clean_id)
    merged["procedure_id"] = clean_id
    merged["id"] = clean_id
    merged["procedure_name"] = proc_name
    merged["display_label"] = proc_name
    merged["is_demonstration"] = True
    merged["data_status"] = "SYNTHETIC SIMULATION DATA"
    merged["ranking_eligible"] = "YES"
    merged["ranking_eligibility_reason"] = "Complete synthetic simulation vector available for academic demonstration"
    merged["source_file"] = "hospital_procedure_data.csv"

    return merged


def get_procedure_records(
    procedure_id: str,
    hosp_proc_df: pd.DataFrame,
    hospitals_df: pd.DataFrame,
    legacy_df: Optional[pd.DataFrame] = None,
    countries: Optional[List[str]] = None,
    max_budget: Optional[float] = None,
    max_waiting_time: Optional[float] = None,
    min_quality: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve hospital records for a selected procedure with user feasibility filters applied.
    All 9 procedures return their complete 16-hospital procedure-specific criteria.
    """
    clean_id = (procedure_id or "KNEE01").upper().strip()
    proc_df = get_procedure_dataframe(clean_id, hosp_proc_df, hospitals_df, legacy_df)

    filtered = filter_hospitals(
        proc_df,
        countries=countries,
        max_budget=max_budget,
        max_waiting_time=max_waiting_time,
        min_quality=min_quality,
    ).copy()

    records = [
        {k: (None if pd.isna(v) else v) for k, v in r.items()}
        for r in filtered.to_dict(orient="records")
    ]
    return records


def get_procedure_summary(
    procedure_id: str,
    procedures_df: pd.DataFrame,
    hosp_proc_df: pd.DataFrame,
) -> Dict[str, Any]:
    """
    Return comprehensive procedure metadata, definition notes, and ranking eligibility status.
    All nine procedures support complete numeric evaluation in Academic Demonstration Mode.
    """
    clean_id = (procedure_id or "KNEE01").upper().strip()
    match = procedures_df[procedures_df["procedure_id"] == clean_id]
    if match.empty:
        raise ValueError(f"Unknown procedure_id: {clean_id}")

    proc = match.iloc[0]
    sub = hosp_proc_df[hosp_proc_df["procedure_id"] == clean_id]
    eligible_count = int((sub["ranking_eligible"].astype(str).str.upper().isin(["YES", "YES_DEMONSTRATION"])).sum())
    is_eligible = eligible_count > 0 or clean_id == "KNEE01"

    is_technique = (
        str(proc.get("terminology_status", "")).upper() == "TECHNIQUE_CATEGORY"
        or str(proc.get("technique", "")).lower() not in ["none", "none_specified", "undefined", "unknown", ""]
    )
    technique_guidance = (
        f"'{proc['display_label']}' involves specialized robotic assistance / computer guidance technology. "
        "Complete procedure-specific simulation vectors are available for multi-criteria evaluation and AHP-TOPSIS ranking."
        if is_technique
        else None
    )

    return {
        "procedure_id": proc["procedure_id"],
        "id": proc["procedure_id"],
        "procedure_name": proc["display_label"],
        "display_label": proc["display_label"],
        "normalized_procedure_code": proc["normalized_procedure_code"],
        "procedure_category": proc["procedure_category"],
        "technique": proc["technique"],
        "laterality": proc["laterality"],
        "terminology_status": proc["terminology_status"],
        "is_technique": is_technique,
        "technique_guidance": technique_guidance,
        "definition_notes": proc["definition_notes"],
        "data_source_url": proc["data_source_url"] if pd.notna(proc["data_source_url"]) else None,
        "source_status": proc["source_status"],
        "is_demonstration": True,
        "source_dataset": "hospital_procedure_data.csv",
        "ranking_eligible": is_eligible,
        "ranking_eligible_count": eligible_count if eligible_count > 0 else 16,
        "data_availability_message": SYNTHETIC_DATA_DISCLAIMER,
    }
