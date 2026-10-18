"""
Page 2: Criteria Weight Determination (AHP).

This module implements the interactive Analytic Hierarchy Process (AHP) interface,
allowing users to calibrate criteria importance through pairwise comparisons,
derive mathematical priority weights, and validate consistency (CR < 0.10).
"""

import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from utils.data_loader import (
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import (
    calculate_weights,
    calculate_consistency_ratio,
    get_illustrative_default_matrix,
    get_preset_archetype_matrix,
    SAATY_SCALE,
    RANDOM_INDEX_TABLE,
)

st.set_page_config(
    page_title="Criteria Weights (AHP) | Medical Tourism DSS",
    page_icon="⚖️",
    layout="wide",
)

st.title("⚖️ Criteria Weight Determination (AHP)")
st.caption("Module 2: Calibrate the relative importance of the six decision criteria using the Analytic Hierarchy Process.")

# Data transparency disclaimer
st.info(f"📌 **Data Note:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

# Initialize AHP matrix in session state if not present
if "ahp_matrix" not in st.session_state:
    st.session_state["ahp_matrix"] = get_illustrative_default_matrix()

# Matrix size
n = len(CRITERIA_COLUMNS)

# Quick Presets Header
st.markdown("### 🎛️ Preset Comparisons & Illustrative Defaults")
preset_col1, preset_col2, preset_col3, preset_col4, preset_col5 = st.columns(5)

with preset_col1:
    if st.button("📋 Illustrative Defaults", use_container_width=True, help="Load balanced illustrative judgments"):
        st.session_state["ahp_matrix"] = get_illustrative_default_matrix()
        st.session_state["matrix_source"] = "Illustrative Defaults"
        st.rerun()

with preset_col2:
    if st.button("💰 Cost-Conscious", use_container_width=True, help="Heavily weight procedure & travel costs"):
        st.session_state["ahp_matrix"] = get_preset_archetype_matrix("cost_conscious")
        st.session_state["matrix_source"] = "Cost-Conscious Preset"
        st.rerun()

with preset_col3:
    if st.button("🏥 Quality-First", use_container_width=True, help="Heavily weight clinical quality & post-op care"):
        st.session_state["ahp_matrix"] = get_preset_archetype_matrix("quality_first")
        st.session_state["matrix_source"] = "Quality-First Preset"
        st.rerun()

with preset_col4:
    if st.button("⚡ Expedited Care", use_container_width=True, help="Heavily weight surgical waiting time"):
        st.session_state["ahp_matrix"] = get_preset_archetype_matrix("expedited_care")
        st.session_state["matrix_source"] = "Expedited Care Preset"
        st.rerun()

with preset_col5:
    if st.button("⚖️ Equal Weights (1.0)", use_container_width=True, help="Reset all pairwise comparisons to 1.0"):
        st.session_state["ahp_matrix"] = np.ones((n, n), dtype=float)
        st.session_state["matrix_source"] = "Equal Weights"
        st.rerun()

matrix_source = st.session_state.get("matrix_source", "Illustrative Defaults")
st.caption(f"Active Comparison Matrix: **{matrix_source}** — Adjust individual comparisons below to tailor to personal preferences.")

st.markdown("---")

# Layout: Left column for comparisons, Right column for weights & consistency
col_comparisons, col_results = st.columns([1.1, 0.9], gap="large")

# Work on a copy of the matrix
A = st.session_state["ahp_matrix"].copy()

with col_comparisons:
    st.markdown("### 🔄 Pairwise Criteria Comparisons")
    st.markdown(
        "For each pair, select which criterion is more critical in your decision and its relative intensity "
        "on Saaty's 1–9 fundamental scale:"
    )

    pairs = []
    for i in range(n):
        for j in range(i + 1, n):
            pairs.append((i, j))

    # Tabs to organize 15 comparisons neatly
    tab_cost, tab_quality, tab_other = st.tabs([
        "Cost Criteria Pairs (1–8)",
        "Quality Criteria Pairs (9–12)",
        "Accessibility & Support (13–15)",
    ])

    def render_pair_slider(idx_pair: int, i: int, j: int, container):
        crit_a = CRITERIA_DISPLAY_NAMES[CRITERIA_COLUMNS[i]]
        crit_b = CRITERIA_DISPLAY_NAMES[CRITERIA_COLUMNS[j]]
        current_val = A[i, j]

        # Determine current preference state
        if np.isclose(current_val, 1.0, atol=1e-3):
            preferred = "Equal Importance"
            intensity = 1
        elif current_val > 1.0:
            preferred = crit_a
            intensity = int(round(current_val))
        else:
            preferred = crit_b
            intensity = int(round(1.0 / current_val))

        intensity = max(1, min(9, intensity))

        container.markdown(f"**Comparison {idx_pair + 1}: {crit_a} vs. {crit_b}**")
        p_col1, p_col2 = container.columns([1, 1])

        with p_col1:
            pref_choice = st.radio(
                "Preferred Criterion",
                options=[crit_a, "Equal Importance", crit_b],
                index=[crit_a, "Equal Importance", crit_b].index(preferred),
                key=f"pref_{i}_{j}",
                label_visibility="collapsed",
            )

        with p_col2:
            scale_val = st.select_slider(
                "Saaty Intensity Scale",
                options=list(range(1, 10)),
                value=intensity,
                format_func=lambda x: f"{x} - {SAATY_SCALE[x]}",
                key=f"scale_{i}_{j}",
                label_visibility="collapsed",
                disabled=(pref_choice == "Equal Importance"),
            )

        # Update matrix
        if pref_choice == "Equal Importance":
            A[i, j] = 1.0
            A[j, i] = 1.0
        elif pref_choice == crit_a:
            A[i, j] = float(scale_val)
            A[j, i] = 1.0 / float(scale_val)
        else:
            A[i, j] = 1.0 / float(scale_val)
            A[j, i] = float(scale_val)

        container.markdown("<hr style='margin: 8px 0; border: none; border-top: 1px solid #eee;' />", unsafe_allow_html=True)

    # Render pairs into tabs
    for k, (i, j) in enumerate(pairs):
        if k < 8:
            render_pair_slider(k, i, j, tab_cost)
        elif k < 12:
            render_pair_slider(k, i, j, tab_quality)
        else:
            render_pair_slider(k, i, j, tab_other)

    # Save updated matrix to session state
    st.session_state["ahp_matrix"] = A

# Compute weights and consistency
weights = calculate_weights(A)
lambda_max, ci, cr, is_consistent = calculate_consistency_ratio(A, weights)
st.session_state["ahp_weights"] = weights

with col_results:
    st.markdown("### 📊 Derived Criteria Weights")

    # Consistency Feedback Card
    ri = RANDOM_INDEX_TABLE.get(n, 1.24)
    cr_pct = cr * 100

    if is_consistent:
        st.success(
            f"✅ **Consistent Judgments (CR = {cr_pct:.2f}% < 10%):**\n\n"
            f"The pairwise comparison matrix satisfies Saaty's consistency condition. "
            f"λ_max = {lambda_max:.4f}, CI = {ci:.4f}, RI = {ri:.2f}."
        )
    else:
        st.warning(
            f"⚠️ **Inconsistency Warning (CR = {cr_pct:.2f}% ≥ 10%):**\n\n"
            f"Judgments contain circular or transitive inconsistencies. "
            f"Consider reviewing comparisons where intensity is extreme (7–9) or conflicting."
        )

    # Weights table & metrics
    weights_data = []
    for col_name, w_val in zip(CRITERIA_COLUMNS, weights):
        weights_data.append({
            "Criterion": CRITERIA_DISPLAY_NAMES[col_name],
            "Weight": round(w_val, 4),
            "Percentage": f"{w_val * 100:.2f}%",
        })

    weights_df = pd.DataFrame(weights_data).sort_values(by="Weight", ascending=False).reset_index(drop=True)

    # Bar chart of criteria weights
    fig_bar = px.bar(
        weights_df,
        x="Weight",
        y="Criterion",
        orientation="h",
        text="Percentage",
        title="Derived AHP Criteria Weights",
        color="Weight",
        color_continuous_scale="Blues",
    )
    fig_bar.update_layout(
        yaxis=dict(autorange="reversed"),
        xaxis=dict(range=[0, max(weights) * 1.2]),
        margin=dict(l=10, r=10, t=40, b=20),
        height=320,
        coloraxis_showscale=False,
    )
    fig_bar.update_traces(textposition="outside")
    st.plotly_chart(fig_bar, use_container_width=True)

    # Donut chart
    fig_donut = go.Figure(
        data=[
            go.Pie(
                labels=weights_df["Criterion"],
                values=weights_df["Weight"],
                hole=0.45,
                textinfo="label+percent",
                showlegend=False,
            )
        ]
    )
    fig_donut.update_layout(
        title="Weight Distribution",
        margin=dict(l=10, r=10, t=40, b=10),
        height=280,
    )
    st.plotly_chart(fig_donut, use_container_width=True)

    # Expander for full reciprocal matrix
    with st.expander("🔍 View Full Reciprocal Comparison Matrix (A)"):
        matrix_df = pd.DataFrame(
            np.round(A, 3),
            index=[CRITERIA_DISPLAY_NAMES[c] for c in CRITERIA_COLUMNS],
            columns=[CRITERIA_DISPLAY_NAMES[c] for c in CRITERIA_COLUMNS],
        )
        st.dataframe(matrix_df, use_container_width=True)

    st.markdown("---")
    st.markdown("#### ➡️ Next Step")
    st.markdown(
        "With criteria weights derived and validated, proceed to **[Module 3: Hospital Rankings](3_Hospital_Rankings)** "
        "to execute TOPSIS and inspect ranked candidate hospitals."
    )
