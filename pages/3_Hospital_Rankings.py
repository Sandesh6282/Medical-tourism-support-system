"""
Page 3: Hospital Rankings (TOPSIS).

This module executes the TOPSIS ranking engine, evaluating candidate hospitals
across India, Turkey, Thailand, and the USA based on AHP criteria weights
and geometric proximity to the Positive Ideal Solution.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

from utils.data_loader import (
    load_hospital_data,
    filter_hospitals,
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    TARGET_COUNTRIES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import (
    calculate_weights,
    get_illustrative_default_matrix,
)
from utils.topsis import calculate_topsis_rankings

st.set_page_config(
    page_title="Hospital Rankings (TOPSIS) | Medical Tourism DSS",
    page_icon="🏆",
    layout="wide",
)

st.title("🏆 Hospital Rankings (TOPSIS)")
st.caption("Module 3: Multi-criteria evaluation of candidate hospitals using TOPSIS relative closeness scores (Ci*).")

# Prominent Mandatory Data Transparency Disclaimer
st.warning(f"⚠️ **DATA TRANSPARENCY NOTICE:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

# Load hospital dataset
try:
    raw_df = load_hospital_data()
except Exception as e:
    st.error(f"Error loading hospital data: {e}")
    st.stop()

# Retrieve or initialize AHP weights
if "ahp_weights" not in st.session_state:
    st.session_state["ahp_matrix"] = get_illustrative_default_matrix()
    st.session_state["ahp_weights"] = calculate_weights(st.session_state["ahp_matrix"])

weights = st.session_state["ahp_weights"]
criteria_types_list = [CRITERIA_TYPES[c] for c in CRITERIA_COLUMNS]

# Patient profile constraints if set
profile = st.session_state.get("patient_profile", {
    "selected_countries": list(TARGET_COUNTRIES),
    "max_budget": 50000,
    "max_waiting_time": 20,
    "min_quality": 1,
    "archetype": "Illustrative Default",
})

# Sidebar or Top Filters
with st.sidebar:
    st.markdown("### 🔍 Filter Candidate Hospitals")
    filter_countries = st.multiselect(
        "Destination Countries",
        options=TARGET_COUNTRIES,
        default=profile.get("selected_countries", list(TARGET_COUNTRIES)),
    )
    if not filter_countries:
        filter_countries = list(TARGET_COUNTRIES)

    filter_budget = st.slider(
        "Max Total Budget (USD)",
        min_value=5000,
        max_value=50000,
        value=int(profile.get("max_budget", 50000)),
        step=1000,
        help="Combined procedure and travel/accommodation cost.",
    )

    filter_wait = st.slider(
        "Max Waiting Time (Days)",
        min_value=1,
        max_value=20,
        value=int(profile.get("max_waiting_time", 20)),
        step=1,
    )

    filter_quality = st.slider(
        "Min Hospital Quality (1-15)",
        min_value=1,
        max_value=15,
        value=int(profile.get("min_quality", 1)),
        step=1,
    )

    st.markdown("---")
    st.markdown("#### ⚖️ Active AHP Weights")
    for col_name, w_val in zip(CRITERIA_COLUMNS, weights):
        st.caption(f"**{CRITERIA_DISPLAY_NAMES[col_name]}**: {w_val * 100:.1f}%")

# Filter raw dataset based on active filters
filtered_data = filter_hospitals(
    raw_df,
    countries=filter_countries,
    max_budget=filter_budget,
    max_waiting_time=filter_wait,
    min_quality=filter_quality,
)

if filtered_data.empty:
    st.error("No hospitals match the selected filter criteria. Please broaden your budget, wait time, or country filters.")
    st.stop()

# Execute TOPSIS ranking
try:
    ranked_df = calculate_topsis_rankings(
        filtered_data,
        CRITERIA_COLUMNS,
        weights,
        criteria_types_list,
    )
    st.session_state["ranked_df"] = ranked_df
except Exception as e:
    st.error(f"Error computing TOPSIS rankings: {e}")
    st.stop()

# Flag mapping helper
COUNTRY_FLAGS = {
    "India": "🇮🇳",
    "Turkey": "🇹🇷",
    "Thailand": "🇹🇭",
    "USA": "🇺🇸",
}

# Top Performer Spotlight
st.markdown("### 🌟 Top Performer Spotlight")
top_overall = ranked_df.iloc[0]

spot_col1, spot_col2, spot_col3, spot_col4 = st.columns(4)

with spot_col1:
    flag = COUNTRY_FLAGS.get(top_overall["country"], "🏥")
    st.metric(
        label=f"🥇 Overall Rank 1 ({flag} {top_overall['country']})",
        value=top_overall["hospital_name"],
        delta=f"Closeness: {top_overall['closeness_score']:.4f}",
    )

with spot_col2:
    st.metric(
        label="Procedure Cost",
        value=f"${top_overall['procedure_cost_usd']:,}",
        delta=f"Travel: ${top_overall['travel_accommodation_cost_usd']:,}",
        delta_color="off",
    )

with spot_col3:
    st.metric(
        label="Clinical Quality Score",
        value=f"{top_overall['hospital_quality_score_1_to_15']} / 15",
        delta="Accredited Facility",
        delta_color="off",
    )

with spot_col4:
    st.metric(
        label="Surgical Waiting Time",
        value=f"{top_overall['waiting_time_days']} Days",
        delta=f"Post-op: {top_overall['postoperative_support_score_1_to_5']}/5",
        delta_color="off",
    )

st.markdown("---")

# Best per Country Spotlight
st.markdown("#### 🌍 Top Hospital by Destination Country")
country_cols = st.columns(len(filter_countries))

for idx, country_name in enumerate(filter_countries):
    country_sub = ranked_df[ranked_df["country"] == country_name]
    with country_cols[idx]:
        if not country_sub.empty:
            c_top = country_sub.iloc[0]
            c_flag = COUNTRY_FLAGS.get(country_name, "🏥")
            st.markdown(
                f"""
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #fafafa;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600;">
                        {c_flag} Top in {country_name}
                    </div>
                    <div style="font-weight: 600; font-size: 14px; margin-top: 4px; color: #1D3045;">
                        {c_top['hospital_name']}
                    </div>
                    <div style="font-size: 12px; color: #444; margin-top: 4px;">
                        <b>Rank:</b> #{c_top['rank']} • <b>Score:</b> {c_top['closeness_score']:.4f}
                    </div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">
                        Cost: ${c_top['procedure_cost_usd']:,} • Wait: {c_top['waiting_time_days']}d
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

st.markdown("---")

# Leaderboard Visualization & Table
st.markdown("### 📊 Interactive Hospital Leaderboard")

tab_table, tab_chart = st.tabs(["📋 Detailed Ranking Leaderboard", "📈 Closeness Score Chart"])

with tab_table:
    # Prepare clean presentation columns
    display_df = ranked_df.copy()
    display_df["country_badge"] = display_df["country"].apply(
        lambda c: f"{COUNTRY_FLAGS.get(c, '')} {c}"
    )
    display_df["total_cost_usd"] = (
        display_df["procedure_cost_usd"] + display_df["travel_accommodation_cost_usd"]
    )

    cols_order = [
        "rank",
        "hospital_name",
        "country_badge",
        "closeness_score",
        "procedure_cost_usd",
        "travel_accommodation_cost_usd",
        "total_cost_usd",
        "waiting_time_days",
        "hospital_quality_score_1_to_15",
        "language_accessibility_score_1_to_5",
        "postoperative_support_score_1_to_5",
        "s_plus",
        "s_minus",
    ]

    rename_map = {
        "rank": "Rank",
        "hospital_name": "Hospital Name",
        "country_badge": "Country",
        "closeness_score": "Closeness (Ci*)",
        "procedure_cost_usd": "Procedure ($)",
        "travel_accommodation_cost_usd": "Travel ($)",
        "total_cost_usd": "Total Cost ($)",
        "waiting_time_days": "Wait (Days)",
        "hospital_quality_score_1_to_15": "Quality (1-15)",
        "language_accessibility_score_1_to_5": "Language (1-5)",
        "postoperative_support_score_1_to_5": "Post-Op (1-5)",
        "s_plus": "Distance Ideal (S+)",
        "s_minus": "Distance Anti-Ideal (S-)",
    }

    final_table = display_df[cols_order].rename(columns=rename_map)

    st.dataframe(
        final_table,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Closeness (Ci*)": st.column_config.ProgressColumn(
                "Closeness Score (Ci*)",
                help="Relative closeness coefficient between 0 and 1. Higher is superior.",
                format="%.4f",
                min_value=0.0,
                max_value=1.0,
            ),
            "Procedure ($)": st.column_config.NumberColumn(format="$%d"),
            "Travel ($)": st.column_config.NumberColumn(format="$%d"),
            "Total Cost ($)": st.column_config.NumberColumn(format="$%d"),
        },
    )

    # Download CSV export with disclaimer
    csv_content = f"# DISCLAIMER: {SYNTHETIC_DATA_DISCLAIMER}\n" + final_table.to_csv(index=False)
    st.download_button(
        label="📥 Export Ranked Hospital Leaderboard (CSV)",
        data=csv_content,
        file_name="FYP_hospital_rankings_topsis.csv",
        mime="text/csv",
    )

with tab_chart:
    # Bar chart of closeness scores
    fig_scores = px.bar(
        ranked_df,
        x="closeness_score",
        y="hospital_name",
        color="country",
        orientation="h",
        text="closeness_score",
        title="TOPSIS Closeness Coefficients (Ci*) by Candidate Hospital",
        color_discrete_map={
            "India": "#FF9933",
            "Turkey": "#E30A17",
            "Thailand": "#00247D",
            "USA": "#3C3B6E",
        },
    )
    fig_scores.update_layout(
        yaxis=dict(autorange="reversed", title="Hospital"),
        xaxis=dict(title="Relative Closeness Score (Ci*)", range=[0, 1.05]),
        height=520,
        margin=dict(l=10, r=10, t=40, b=20),
    )
    fig_scores.update_traces(texttemplate="%{text:.3f}", textposition="outside")
    st.plotly_chart(fig_scores, use_container_width=True)

st.markdown("---")
st.markdown("#### ➡️ Next Step")
st.markdown(
    "Select top alternatives for head-to-head evaluation in **[Module 4: Hospital Comparison](4_Hospital_Comparison)**, "
    "or test ranking resilience under varying weight scenarios in **[Module 5: Sensitivity Analysis](5_Sensitivity_Analysis)**."
)
