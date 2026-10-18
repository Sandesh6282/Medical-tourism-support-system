"""
Page 4: Hospital Comparison.

This module provides side-by-side comparative analysis of shortlisted candidate
hospitals across all six evaluation criteria, featuring multi-axis radar charts
and trade-off evaluations.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go

from utils.data_loader import (
    load_hospital_data,
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import calculate_weights, get_illustrative_default_matrix
from utils.topsis import calculate_topsis_rankings

st.set_page_config(
    page_title="Hospital Comparison | Medical Tourism DSS",
    page_icon="🔍",
    layout="wide",
)

st.title("🔍 Hospital Comparison")
st.caption("Module 4: In-depth side-by-side performance and trade-off comparison of shortlisted hospitals.")

# Data transparency disclaimer
st.warning(f"⚠️ **DATA TRANSPARENCY NOTICE:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

# Retrieve ranked or raw data
try:
    raw_df = load_hospital_data()
except Exception as e:
    st.error(f"Error loading hospital data: {e}")
    st.stop()

# Ensure ranked data is available
if "ranked_df" not in st.session_state:
    weights = st.session_state.get(
        "ahp_weights", calculate_weights(get_illustrative_default_matrix())
    )
    c_types = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]
    ranked_df = calculate_topsis_rankings(raw_df, CRITERIA_COLUMNS, weights, c_types)
    st.session_state["ranked_df"] = ranked_df
else:
    ranked_df = st.session_state["ranked_df"]

hospital_options = ranked_df["hospital_name"].tolist()

# Pre-select top 2 hospitals by default
default_selection = hospital_options[:2] if len(hospital_options) >= 2 else hospital_options

selected_hospitals = st.multiselect(
    "Select 2 to 4 Hospitals for Side-by-Side Evaluation:",
    options=hospital_options,
    default=default_selection,
    max_selections=4,
    help="Select between two and four hospitals to contrast strengths, costs, and clinical ratings.",
)

if len(selected_hospitals) < 2:
    st.warning("Please select at least 2 hospitals to perform a comparative evaluation.")
    st.stop()

comparison_df = ranked_df[ranked_df["hospital_name"].isin(selected_hospitals)].copy()

# 1. Side-by-Side Comparison Table
st.markdown("### 📋 Metric Comparison Table")

table_data = []
for _, row in comparison_df.iterrows():
    total_cost = row["procedure_cost_usd"] + row["travel_accommodation_cost_usd"]
    table_data.append({
        "Hospital": row["hospital_name"],
        "Country": row["country"],
        "TOPSIS Rank": f"#{row['rank']}",
        "Closeness Score (Ci*)": f"{row['closeness_score']:.4f}",
        "Procedure Cost (USD)": f"${row['procedure_cost_usd']:,}",
        "Travel Cost (USD)": f"${row['travel_accommodation_cost_usd']:,}",
        "Total Estimated Cost": f"${total_cost:,}",
        "Waiting Time (Days)": f"{row['waiting_time_days']} days",
        "Hospital Quality (1-15)": f"{row['hospital_quality_score_1_to_15']} / 15",
        "Language Support (1-5)": f"{row['language_accessibility_score_1_to_5']} / 5",
        "Post-op Care (1-5)": f"{row['postoperative_support_score_1_to_5']} / 5",
    })

comparison_summary_df = pd.DataFrame(table_data).set_index("Hospital").T
st.dataframe(comparison_summary_df, use_container_width=True)

st.markdown("---")

# 2. Multi-Axis Radar Chart & Visual Trade-Offs
col_radar, col_tradeoffs = st.columns([1.1, 0.9], gap="large")

with col_radar:
    st.markdown("### 🕸️ Multi-Criteria Radar Comparison")
    st.caption("Performance normalized to [0, 100] where larger outer area signifies superior performance across all dimensions.")

    radar_categories = [
        "Procedure Cost (Inv)",
        "Hospital Quality",
        "Waiting Time (Inv)",
        "Travel Cost (Inv)",
        "Language Access",
        "Post-op Support",
    ]

    fig_radar = go.Figure()

    # Predefined color palette for distinct comparison lines
    palette = ["#1D3045", "#E30A17", "#008080", "#FF9933"]

    for idx, (_, row) in enumerate(comparison_df.iterrows()):
        # Normalize: for cost criteria, invert so lower cost / wait time produces higher radar value
        p_cost_norm = (raw_df["procedure_cost_usd"].min() / row["procedure_cost_usd"]) * 100
        quality_norm = (row["hospital_quality_score_1_to_15"] / 15.0) * 100
        wait_norm = (raw_df["waiting_time_days"].min() / row["waiting_time_days"]) * 100
        t_cost_norm = (raw_df["travel_accommodation_cost_usd"].min() / row["travel_accommodation_cost_usd"]) * 100
        lang_norm = (row["language_accessibility_score_1_to_5"] / 5.0) * 100
        postop_norm = (row["postoperative_support_score_1_to_5"] / 5.0) * 100

        values = [p_cost_norm, quality_norm, wait_norm, t_cost_norm, lang_norm, postop_norm]
        values.append(values[0])  # Close the radar loop

        color = palette[idx % len(palette)]
        fig_radar.add_trace(
            go.Scatterpolar(
                r=values,
                theta=radar_categories + [radar_categories[0]],
                fill="toself",
                name=row["hospital_name"][:24],
                line=dict(color=color, width=2),
                opacity=0.6,
            )
        )

    fig_radar.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 105],
                tickfont=dict(size=9),
            )
        ),
        legend=dict(orientation="h", y=-0.15),
        margin=dict(l=20, r=20, t=30, b=30),
        height=450,
    )

    st.plotly_chart(fig_radar, use_container_width=True)

with col_tradeoffs:
    st.markdown("### ⚖️ Clinical & Financial Trade-Offs")
    st.markdown("Key trade-offs observed between the selected candidates:")

    # Sort selected hospitals by rank
    sorted_selected = comparison_df.sort_values(by="rank")

    best_hospital = sorted_selected.iloc[0]
    second_hospital = sorted_selected.iloc[1]

    # Automated trade-off analysis
    p_diff = abs(best_hospital["procedure_cost_usd"] - second_hospital["procedure_cost_usd"])
    w_diff = abs(best_hospital["waiting_time_days"] - second_hospital["waiting_time_days"])
    q_diff = abs(best_hospital["hospital_quality_score_1_to_15"] - second_hospital["hospital_quality_score_1_to_15"])

    cheaper = best_hospital if best_hospital["procedure_cost_usd"] < second_hospital["procedure_cost_usd"] else second_hospital
    costlier = second_hospital if cheaper["hospital_id"] == best_hospital["hospital_id"] else best_hospital

    st.markdown(
        f"""
        - **Cost Difference:** **{cheaper['hospital_name']}** ({cheaper['country']}) provides an estimated procedure savings of **${p_diff:,} USD** relative to **{costlier['hospital_name']}**.
        - **Waiting Time Trade-Off:** 
          * {best_hospital['hospital_name']}: **{best_hospital['waiting_time_days']} days**
          * {second_hospital['hospital_name']}: **{second_hospital['waiting_time_days']} days** (Difference: **{w_diff} days**).
        - **Accreditation & Quality Score:**
          * {best_hospital['hospital_name']}: **{best_hospital['hospital_quality_score_1_to_15']} / 15**
          * {second_hospital['hospital_name']}: **{second_hospital['hospital_quality_score_1_to_15']} / 15** (Spread: **{q_diff} points**).
        """
    )

    st.info(
        "💡 **Decision Tip:** If procedural budget is your primary constraint, cross-border centers in India or Turkey "
        "deliver substantial cost advantages, whereas US institutions offer benchmark clinical facilities with domestic proximity."
    )

st.markdown("---")
st.markdown("#### ➡️ Next Step")
st.markdown(
    "Test how robust these rankings remain under fluctuating criteria weights in "
    "**[Module 5: Sensitivity Analysis](5_Sensitivity_Analysis)**."
)
