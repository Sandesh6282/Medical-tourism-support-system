"""
Page 5: Sensitivity Analysis & Robustness Testing.

This module evaluates the stability of TOPSIS hospital rankings under systematic
variations in criteria weights, including pre-packaged scenario simulations and
One-At-A-Time (OAT) weight perturbations.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

from utils.data_loader import (
    load_hospital_data,
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import calculate_weights, get_illustrative_default_matrix
from utils.sensitivity import (
    PREDEFINED_SCENARIOS,
    run_predefined_scenarios,
    run_one_at_a_time_sensitivity,
    find_rank_reversals,
    adjust_weights_proportionally,
)
from utils.topsis import calculate_topsis_rankings

st.set_page_config(
    page_title="Sensitivity Analysis | Medical Tourism DSS",
    page_icon="📈",
    layout="wide",
)

st.title("📈 Sensitivity Analysis & Robustness Testing")
st.caption("Module 5: Evaluate how hospital rankings shift under alternate priority scenarios and weight perturbations.")

# Data transparency disclaimer
st.warning(f"⚠️ **DATA TRANSPARENCY NOTICE:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

# Load hospital data
try:
    hospital_df = load_hospital_data()
except Exception as e:
    st.error(f"Error loading hospital data: {e}")
    st.stop()

# Retrieve active AHP weights from session state
base_weights = st.session_state.get(
    "ahp_weights", calculate_weights(get_illustrative_default_matrix())
)
c_types = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]

# Section 1: Pre-Packaged Scenario Testing
st.markdown("### 🎭 Scenario Comparison: Cost vs. Quality vs. Time Priorities")
st.markdown(
    "Examine how the decision model behaves under distinct real-world decision paradigms:"
)

# Run scenarios
scenario_results = run_predefined_scenarios(
    hospital_df, CRITERIA_COLUMNS, c_types, base_weights=base_weights
)

# Summary table of top performer per scenario
scenario_summary = []
for name, res_df in scenario_results.items():
    top_row = res_df.iloc[0]
    second_row = res_df.iloc[1]
    scenario_summary.append({
        "Scenario": name,
        "Rank 1 Hospital": f"{top_row['hospital_name']} ({top_row['country']})",
        "Top Closeness (Ci*)": f"{top_row['closeness_score']:.4f}",
        "Rank 2 Hospital": f"{second_row['hospital_name']} ({second_row['country']})",
        "Runner-Up Score": f"{second_row['closeness_score']:.4f}",
    })

scenario_summary_df = pd.DataFrame(scenario_summary)
st.dataframe(scenario_summary_df, use_container_width=True, hide_index=True)

# Visual comparison across scenarios
st.markdown("#### 📊 Closeness Score Variations Across Scenarios")

# Combine top 5 hospitals from base weights across all scenarios for grouped visualization
base_top_ids = scenario_results["Patient AHP Weights"]["hospital_id"].head(6).tolist()

scenario_chart_data = []
for s_name, s_df in scenario_results.items():
    sub = s_df[s_df["hospital_id"].isin(base_top_ids)]
    for _, r in sub.iterrows():
        scenario_chart_data.append({
            "Scenario": s_name,
            "Hospital": r["hospital_name"][:22],
            "Country": r["country"],
            "Closeness Score": r["closeness_score"],
            "Rank": r["rank"],
        })

chart_df = pd.DataFrame(scenario_chart_data)

fig_scenarios = px.bar(
    chart_df,
    x="Hospital",
    y="Closeness Score",
    color="Scenario",
    barmode="group",
    title="Sensitivity of Top Hospital Scores across Scenarios",
    color_discrete_sequence=px.colors.qualitative.Safe,
)
fig_scenarios.update_layout(
    height=400,
    margin=dict(l=10, r=10, t=40, b=20),
    legend=dict(orientation="h", y=-0.2),
)
st.plotly_chart(fig_scenarios, use_container_width=True)

st.markdown("---")

# Section 2: Interactive One-At-A-Time (OAT) Sensitivity Analysis
st.markdown("### 🔬 One-At-A-Time (OAT) Weight Perturbation Simulation")
st.markdown(
    "Select an individual criterion to perturb across a continuous spectrum (5% to 65%). "
    "All remaining criteria are scaled proportionally so total weights strictly equal 100%."
)

col_ctrl, col_graph = st.columns([0.8, 1.2], gap="large")

with col_ctrl:
    st.markdown("#### Simulation Controls")

    criterion_choice = st.selectbox(
        "Select Target Criterion to Perturb:",
        options=CRITERIA_COLUMNS,
        format_func=lambda c: f"{CRITERIA_DISPLAY_NAMES[c]} ({CRITERIA_TYPES[c].capitalize()})",
    )
    target_idx = CRITERIA_COLUMNS.index(criterion_choice)
    base_target_weight = base_weights[target_idx]

    st.caption(
        f"Base AHP weight for **{CRITERIA_DISPLAY_NAMES[criterion_choice]}**: **{base_target_weight * 100:.2f}%**"
    )

    weight_steps = np.linspace(0.05, 0.65, 13)

    # Run OAT simulation
    oat_results = run_one_at_a_time_sensitivity(
        hospital_df,
        CRITERIA_COLUMNS,
        base_weights,
        c_types,
        target_criterion_idx=target_idx,
        weight_range=weight_steps,
    )

    # Detect rank crossovers
    crossovers = find_rank_reversals(oat_results)

    st.markdown("#### ⚡ Critical Switching Points")
    if crossovers:
        for c_event in crossovers:
            low_w, high_w = c_event["weight_interval"]
            st.info(
                f"🔄 **Rank Reversal around weight {low_w*100:.1f}% – {high_w*100:.1f}%:**\n\n"
                f"**{c_event['new_top'][1]}** overtakes **{c_event['previous_top'][1]}** for the #1 position!"
            )
    else:
        st.success(
            f"🛡️ **Robust Ranking:** The #1 ranked hospital remains stable across the entire weight range (5% – 65%)."
        )

with col_graph:
    st.markdown("#### Ranking Trajectory Plot")

    fig_oat = px.line(
        oat_results,
        x="test_weight",
        y="closeness_score",
        color="hospital_name",
        title=f"Trajectory of Closeness Scores (Ci*) vs. Weight on {CRITERIA_DISPLAY_NAMES[criterion_choice]}",
        labels={
            "test_weight": f"Weight of {CRITERIA_DISPLAY_NAMES[criterion_choice]}",
            "closeness_score": "Relative Closeness Score (Ci*)",
            "hospital_name": "Hospital",
        },
    )

    # Add vertical line for current base weight
    fig_oat.add_vline(
        x=base_target_weight,
        line_dash="dash",
        line_color="black",
        annotation_text="Base AHP Weight",
        annotation_position="top left",
    )

    fig_oat.update_layout(
        height=480,
        margin=dict(l=10, r=10, t=40, b=20),
        xaxis=dict(tickformat=".0%"),
        legend=dict(font=dict(size=9), orientation="v"),
    )

    st.plotly_chart(fig_oat, use_container_width=True)

st.markdown("---")
st.markdown("#### ➡️ Next Step")
st.markdown(
    "Review the mathematical proofs and academic formulation in **[Module 6: Methodology](6_Methodology)**."
)
