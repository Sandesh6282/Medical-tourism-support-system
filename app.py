"""
FYP: Medical Tourism Decision Support System Using AHP-TOPSIS.

Main Streamlit Application Entry Point.
"""

from pathlib import Path
import streamlit as st

from utils.data_loader import (
    load_hospital_data,
    SYNTHETIC_DATA_DISCLAIMER,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    TARGET_COUNTRIES,
)
from utils.ahp import (
    calculate_weights,
    calculate_consistency_ratio,
    get_illustrative_default_matrix,
)

# Configure page settings
st.set_page_config(
    page_title="Medical Tourism DSS | AHP-TOPSIS",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Initialize shared session state
if "ahp_matrix" not in st.session_state:
    st.session_state["ahp_matrix"] = get_illustrative_default_matrix()

if "ahp_weights" not in st.session_state:
    st.session_state["ahp_weights"] = calculate_weights(st.session_state["ahp_matrix"])

if "patient_profile" not in st.session_state:
    st.session_state["patient_profile"] = {
        "selected_countries": list(TARGET_COUNTRIES),
        "max_budget": 35000,
        "max_waiting_time": 14,
        "min_quality": 10,
        "archetype": "Illustrative Default",
    }

# Load and validate dataset
try:
    hospital_df = load_hospital_data()
    st.session_state["hospital_df"] = hospital_df
except Exception as e:
    st.error(f"Error loading hospital dataset: {e}")
    st.stop()

# Header
st.title("🏥 Medical Tourism Decision Support System Using AHP-TOPSIS")
st.subheader("Final Year Engineering Project | Knee Replacement Arthroplasty Decision Model")

# Prominent Synthetic Data Disclaimer Banner
st.warning(f"⚠️ **DATA TRANSPARENCY NOTICE:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown(
    """
    Welcome to the **Medical Tourism Decision Support System (DSS)**. This interactive decision-making 
    platform assists international patients, clinicians, and medical facilitators in objectively evaluating 
    and ranking overseas hospital alternatives for **knee replacement surgery (arthroplasty)** across 
    **India, Turkey, Thailand, and the United States**.
    """
)

st.markdown("---")

# Key Metrics Overview
metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
with metric_col1:
    st.metric(label="Target Procedure", value="Knee Replacement")
with metric_col2:
    st.metric(label="Candidate Hospitals", value=f"{len(hospital_df)} Facilities")
with metric_col3:
    st.metric(label="Geographic Scope", value=f"{len(TARGET_COUNTRIES)} Nations")
with metric_col4:
    st.metric(label="Decision Engine", value="Hybrid AHP-TOPSIS")

st.markdown("---")

# Project Architecture & Workflow
col_left, col_right = st.columns([1, 1])

with col_left:
    st.markdown("### 🎯 Decision Methodology & Scope")
    st.markdown(
        """
        Cross-border surgical decisions require balancing multidimensional, conflicting priorities.
        This system couples two established Multi-Criteria Decision-Making (MCDM) methodologies:
        
        1. **Analytic Hierarchy Process (AHP):**
           - Derives mathematically sound criterion weights from structured pairwise comparisons.
           - Validates consistency ($CR < 0.10$) using Saaty's eigenvector method.
           
        2. **TOPSIS Ranking Engine:**
           - Performs vector normalization across all performance dimensions.
           - Measures geometric Euclidean distance from Positive Ideal ($A^+$) and Negative Ideal ($A^-$) solutions.
           - Determines candidate rankings based on relative closeness coefficients ($C_i^*$).
        """
    )

with col_right:
    st.markdown("### 📊 The Six Decision Criteria")
    for col_name, label in CRITERIA_DISPLAY_NAMES.items():
        direction = CRITERIA_TYPES[col_name]
        icon = "🔻" if direction == "cost" else "🔺"
        badge = "Cost (Lower is Better)" if direction == "cost" else "Benefit (Higher is Better)"
        st.markdown(f"- **{label}** — {icon} *{badge}*")

st.markdown("---")

# System Navigation Guide
st.markdown("### 🚀 Decision Workflow Modules")
st.markdown("Use the sidebar navigation to step through the decision support process:")

nav_col1, nav_col2, nav_col3 = st.columns(3)
with nav_col1:
    st.markdown(
        """
        #### 1. [Patient Preferences](1_Patient_Preferences)
        Define budget thresholds, travel boundaries, and surgical requirements.
        
        #### 2. [Criteria Weights (AHP)](2_Criteria_Weights)
        Calibrate pairwise trade-offs and verify consistency ratios ($CR < 0.10$).
        """
    )
with nav_col2:
    st.markdown(
        """
        #### 3. [Hospital Rankings (TOPSIS)](3_Hospital_Rankings)
        View the multi-criteria leaderboard, closeness scores, and country spotlights.
        
        #### 4. [Hospital Comparison](4_Hospital_Comparison)
        Inspect side-by-side metric tables and multi-axis radar chart overlays.
        """
    )
with nav_col3:
    st.markdown(
        """
        #### 5. [Sensitivity Analysis](5_Sensitivity_Analysis)
        Simulate cost-, quality-, and time-focused scenarios and test ranking stability.
        
        #### 6. [Methodology & Theory](6_Methodology)
        Review the full mathematical formulation, literature citations, and data documentation.
        """
    )

st.markdown("---")
st.caption(
    "FYP | Medical Tourism Decision Support System Using AHP-TOPSIS • Department of Engineering • "
    "Synthetic Demonstration Dataset for Academic Evaluation"
)
