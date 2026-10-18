"""
Page 1: Patient Preferences & Clinical Profile.

This module allows international patients and clinicians to define surgical
requirements, budgetary bounds, country preferences, and priority profiles.
"""

import streamlit as st
import pandas as pd

from utils.data_loader import (
    load_hospital_data,
    filter_hospitals,
    TARGET_COUNTRIES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import get_preset_archetype_matrix, calculate_weights

st.set_page_config(
    page_title="Patient Preferences | Medical Tourism DSS",
    page_icon="👤",
    layout="wide",
)

# Load dataset
try:
    hospital_df = load_hospital_data()
except Exception as e:
    st.error(f"Error loading hospital data: {e}")
    st.stop()

# Initialize session state defaults if needed
if "patient_profile" not in st.session_state:
    st.session_state["patient_profile"] = {
        "selected_countries": list(TARGET_COUNTRIES),
        "max_budget": 35000,
        "max_waiting_time": 14,
        "min_quality": 10,
        "archetype": "Balanced",
    }

st.title("👤 Patient Preferences & Profile")
st.caption("Module 1: Tailor decision parameters and feasibility constraints to individual patient requirements.")

# Data transparency disclaimer
st.info(f"📌 **Data Note:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

# Main configuration columns
col_inputs, col_preview = st.columns([1, 1], gap="large")

with col_inputs:
    st.markdown("### ⚙️ Clinical & Logistical Constraints")

    # Procedure Confirmation
    st.text_input(
        "Target Procedure",
        value="Knee Replacement Surgery (Total Arthroplasty)",
        disabled=True,
        help="The decision model is tailored to cross-border knee replacement surgery.",
    )

    # Destination Countries Filter
    selected_countries = st.multiselect(
        "Destination Countries",
        options=TARGET_COUNTRIES,
        default=st.session_state["patient_profile"]["selected_countries"],
        help="Select which countries to include in your hospital comparison.",
    )

    if not selected_countries:
        st.warning("Please select at least one destination country.")
        selected_countries = list(TARGET_COUNTRIES)

    # Budget constraint
    max_budget = st.slider(
        "Maximum Total Budget (USD)",
        min_value=5000,
        max_value=50000,
        value=int(st.session_state["patient_profile"]["max_budget"]),
        step=1000,
        help="Maximum combined allowance for procedure cost and travel/accommodation.",
    )

    # Waiting time constraint
    max_wait = st.slider(
        "Maximum Acceptable Waiting Time (Days)",
        min_value=1,
        max_value=20,
        value=int(st.session_state["patient_profile"]["max_waiting_time"]),
        step=1,
        help="Maximum days between consultation approval and hospital admission.",
    )

    # Minimum Quality constraint
    min_quality = st.slider(
        "Minimum Hospital Quality Score (1 to 15)",
        min_value=1,
        max_value=15,
        value=int(st.session_state["patient_profile"]["min_quality"]),
        step=1,
        help="15 represents comprehensive international JCI accreditation and clinical safety.",
    )

    st.markdown("---")
    st.markdown("### 🎭 Decision Priority Archetype")
    st.caption("Select a preset decision profile or calibrate custom comparisons in Module 2.")

    archetype_options = [
        "Balanced",
        "Cost-Conscious",
        "Quality-First",
        "Expedited Care",
    ]

    current_archetype = st.session_state["patient_profile"].get("archetype", "Balanced")
    if current_archetype not in archetype_options:
        current_archetype = "Balanced"

    selected_archetype = st.radio(
        "Priority Profile Preset",
        options=archetype_options,
        index=archetype_options.index(current_archetype),
        horizontal=True,
    )

    # Save button
    if st.button("💾 Save Profile & Update Decision Model", type="primary", use_container_width=True):
        st.session_state["patient_profile"] = {
            "selected_countries": selected_countries,
            "max_budget": max_budget,
            "max_waiting_time": max_wait,
            "min_quality": min_quality,
            "archetype": selected_archetype,
        }

        # Pre-populate AHP matrix based on archetype
        archetype_key_map = {
            "Balanced": "balanced",
            "Cost-Conscious": "cost_conscious",
            "Quality-First": "quality_first",
            "Expedited Care": "expedited_care",
        }
        matrix = get_preset_archetype_matrix(archetype_key_map[selected_archetype])
        st.session_state["ahp_matrix"] = matrix
        st.session_state["ahp_weights"] = calculate_weights(matrix)

        st.success(f"Preferences saved successfully! Priority profile calibrated to '{selected_archetype}'.")

with col_preview:
    st.markdown("### 📋 Matching Hospital Alternatives")

    # Filter hospitals based on user parameters
    matching_df = filter_hospitals(
        hospital_df,
        countries=selected_countries,
        max_budget=max_budget,
        max_waiting_time=max_wait,
        min_quality=min_quality,
    )

    total_count = len(hospital_df)
    match_count = len(matching_df)

    if match_count == 0:
        st.warning("⚠️ No hospitals match the selected constraints. Consider raising your budget or waiting time threshold.")
    else:
        st.success(f"🎯 **{match_count} of {total_count} candidate hospitals** meet your feasibility constraints.")

    # Display preview table
    preview_cols = [
        "hospital_id",
        "hospital_name",
        "country",
        "procedure_cost_usd",
        "travel_accommodation_cost_usd",
        "waiting_time_days",
        "hospital_quality_score_1_to_15",
    ]

    display_preview = matching_df[preview_cols].copy()
    display_preview["total_estimated_cost_usd"] = (
        display_preview["procedure_cost_usd"] + display_preview["travel_accommodation_cost_usd"]
    )

    display_preview = display_preview.rename(
        columns={
            "hospital_id": "ID",
            "hospital_name": "Hospital Name",
            "country": "Country",
            "procedure_cost_usd": "Procedure ($)",
            "travel_accommodation_cost_usd": "Travel ($)",
            "total_estimated_cost_usd": "Total Cost ($)",
            "waiting_time_days": "Wait (Days)",
            "hospital_quality_score_1_to_15": "Quality (1-15)",
        }
    )

    st.dataframe(
        display_preview,
        use_container_width=True,
        hide_index=True,
    )

    st.markdown("---")
    st.markdown("#### ➡️ Next Step")
    st.markdown(
        "Proceed to **[Module 2: Criteria Weights](2_Criteria_Weights)** to calibrate the relative importance "
        "of the six decision criteria using pairwise comparisons."
    )
