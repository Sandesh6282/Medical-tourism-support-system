"""
Page 6: Methodology & Theoretical Framework.

This module provides the comprehensive mathematical formulation, algorithmic proofs,
and literature citations underpinning the AHP-TOPSIS hybrid model.
"""

import streamlit as st
import pandas as pd

from utils.data_loader import (
    CRITERIA_COLUMNS,
    CRITERIA_DISPLAY_NAMES,
    CRITERIA_TYPES,
    SYNTHETIC_DATA_DISCLAIMER,
)
from utils.ahp import RANDOM_INDEX_TABLE, SAATY_SCALE

st.set_page_config(
    page_title="Methodology | Medical Tourism DSS",
    page_icon="📚",
    layout="wide",
)

st.title("📚 Methodology & Theoretical Framework")
st.caption("Module 6: Mathematical formulation and academic foundation of the hybrid AHP-TOPSIS decision model.")

# Data transparency disclaimer
st.info(f"📌 **Data Note:** {SYNTHETIC_DATA_DISCLAIMER}")

st.markdown("---")

tab_overview, tab_ahp, tab_topsis, tab_criteria = st.tabs([
    "🔬 System Architecture",
    "⚖️ AHP Mathematical Formulation",
    "🏆 TOPSIS Algorithmic Framework",
    "📊 Decision Criteria Taxonomy",
])

with tab_overview:
    st.markdown("### 🔬 Multi-Criteria Decision-Making (MCDM) Pipeline")
    st.markdown(
        """
        Cross-border surgical decisions involve multi-attribute trade-offs across non-commensurate 
        dimensions (e.g., dollars, days, accreditation scores). Combining **AHP** (for priority weight calibration) 
        and **TOPSIS** (for geometric alternative ranking) eliminates subjective scoring bias while 
        guaranteeing transparent, reproducible outcomes:
        """
    )

    st.code(
        """
        [1. Patient Profile & Constraints] 
                  │
                  ▼
        [2. AHP Pairwise Comparisons (1-9 Scale)] 
                  │──> [Consistency Ratio Verification: CR < 0.10]
                  ▼
        [3. Derived Weight Vector (w)]
                  │
                  ▼
        [4. Hospital Dataset Decision Matrix (X)] ──> [Vector Normalization (R)]
                  │
                  ▼
        [5. Weighted Normalized Matrix (V = w * R)]
                  │
                  ▼
        [6. Benchmark Solutions: PIS (A+) & NIS (A-)]
                  │
                  ▼
        [7. Separation Distances (S+ & S-)] ──> [Relative Closeness: Ci* = S- / (S+ + S-)]
                  │
                  ▼
        [8. Ranked Hospital Leaderboard & Sensitivity Robustness Testing]
        """,
        language="text",
    )

with tab_ahp:
    st.markdown("### 1. Analytic Hierarchy Process (AHP)")
    st.markdown(
        "Developed by Thomas L. Saaty (1980), AHP derives ratio-scale priorities from paired comparisons."
    )

    st.markdown("#### Step 1: Pairwise Comparison Matrix ($A$)")
    st.markdown(
        r"""
        Construct a positive reciprocal matrix $A = [a_{ij}]_{n \times n}$ where $a_{ij}$ denotes the 
        relative importance of criterion $i$ compared to criterion $j$:
        $$a_{ji} = \frac{1}{a_{ij}}, \quad a_{ii} = 1, \quad a_{ij} > 0$$
        Judgments are scaled using Saaty's 1–9 fundamental scale:
        """
    )

    scale_df = pd.DataFrame([
        {"Scale Value": k, "Definition": v} for k, v in SAATY_SCALE.items()
    ])
    st.dataframe(scale_df, use_container_width=True, hide_index=True)

    st.markdown("#### Step 2: Weight Vector ($w$) Derivation")
    st.markdown(
        r"""
        The priority vector $w = [w_1, w_2, ..., w_n]^T$ is computed using the principal eigenvector method:
        $$A w = \lambda_{\max} w, \quad \sum_{i=1}^n w_i = 1$$
        """
    )

    st.markdown("#### Step 3: Consistency Verification")
    st.markdown(
        r"""
        The maximum eigenvalue $\lambda_{\max}$ is approximated via:
        $$\lambda_{\max} = \frac{1}{n} \sum_{i=1}^n \frac{(A w)_i}{w_i}$$
        The Consistency Index ($CI$) and Consistency Ratio ($CR$) evaluate deviation from transitivity:
        $$CI = \frac{\lambda_{\max} - n}{n - 1}, \qquad CR = \frac{CI}{RI}$$
        """
    )

    st.markdown("Saaty's Standard Random Index ($RI$) Table ($n=1$ to $10$):")
    ri_df = pd.DataFrame([
        {"Matrix Dimension (n)": k, "Random Index (RI)": v}
        for k, v in RANDOM_INDEX_TABLE.items()
    ])
    st.dataframe(ri_df.T, use_container_width=True)

    st.markdown(
        r"""
        *Acceptance Criterion:* If $CR < 0.10$ ($10\%$), the judgments are considered consistent. 
        If $CR \ge 0.10$, revision of pairwise judgments is required.
        """
    )

with tab_topsis:
    st.markdown("### 2. Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)")
    st.markdown(
        "Developed by Hwang and Yoon (1981), TOPSIS ranks alternatives by their geometric closeness to an ideal benchmark."
    )

    st.markdown("#### Step 1: Decision Matrix Normalization")
    st.markdown(
        r"""
        To eliminate non-commensurate measurement units (USD, days, ratings), vector normalization is applied:
        $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}, \quad i=1,\dots,m; \quad j=1,\dots,n$$
        """
    )

    st.markdown("#### Step 2: Weighted Normalized Matrix ($V$)")
    st.markdown(
        r"""
        Multiply each normalized column by its corresponding AHP weight $w_j$:
        $$v_{ij} = w_j \cdot r_{ij}$$
        """
    )

    st.markdown("#### Step 3: Determine Positive ($A^+$) and Negative ($A^-$) Ideal Solutions")
    st.markdown(
        r"""
        - **Benefit Criteria** (Higher is better: Quality, Language, Post-op):
          $$A_j^+ = \max_i(v_{ij}), \qquad A_j^- = \min_i(v_{ij})$$
        - **Cost Criteria** (Lower is better: Procedure Cost, Waiting Time, Travel Cost):
          $$A_j^+ = \min_i(v_{ij}), \qquad A_j^- = \max_i(v_{ij})$$
        """
    )

    st.markdown("#### Step 4: Calculate Separation Distances")
    st.markdown(
        r"""
        Compute Euclidean distance of each candidate hospital $i$ from $A^+$ and $A^-$:
        $$S_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - A_j^+)^2}, \qquad S_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - A_j^-)^2}$$
        """
    )

    st.markdown("#### Step 5: Relative Closeness Coefficient ($C_i^*$)")
    st.markdown(
        r"""
        Calculate relative closeness to the ideal solution:
        $$C_i^* = \frac{S_i^-}{S_i^+ + S_i^-}, \qquad 0 \le C_i^* \le 1$$
        Hospitals are ranked in descending order of $C_i^*$, where $C_i^* \to 1$ represents optimal proximity.
        """
    )

with tab_criteria:
    st.markdown("### 📊 Decision Criteria Taxonomy")
    st.markdown(
        "The six criteria evaluated in this decision support system for knee replacement surgery:"
    )

    criteria_table = [
        {
            "Criterion": "Procedure Cost",
            "Variable": "procedure_cost_usd",
            "Type": "Cost (Lower is Better)",
            "Unit": "USD ($)",
            "Clinical Scope": "Complete surgical package including surgeon fee, prostheses implants, OR time, and inpatient hospital bed.",
        },
        {
            "Criterion": "Hospital Quality",
            "Variable": "hospital_quality_score_1_to_15",
            "Type": "Benefit (Higher is Better)",
            "Unit": "Index (1-15)",
            "Clinical Scope": "International healthcare accreditations (e.g. JCI, ISO), orthopedic volume, and clinical safety standards.",
        },
        {
            "Criterion": "Waiting Time",
            "Variable": "waiting_time_days",
            "Type": "Cost (Lower is Better)",
            "Unit": "Days",
            "Clinical Scope": "Lead time elapsed between clinical clearance approval and scheduled surgical admission.",
        },
        {
            "Criterion": "Travel & Accommodation Cost",
            "Variable": "travel_accommodation_cost_usd",
            "Type": "Cost (Lower is Better)",
            "Unit": "USD ($)",
            "Clinical Scope": "Round-trip flights, transit, visa fees, and hotel lodging for patient and companion.",
        },
        {
            "Criterion": "Language Accessibility",
            "Variable": "language_accessibility_score_1_to_5",
            "Type": "Benefit (Higher is Better)",
            "Unit": "Score (1-5)",
            "Clinical Scope": "English fluency of medical teams, dedicated patient liaisons, and certified translation services.",
        },
        {
            "Criterion": "Post-operative Support",
            "Variable": "postoperative_support_score_1_to_5",
            "Type": "Benefit (Higher is Better)",
            "Unit": "Score (1-5)",
            "Clinical Scope": "Remote teleconsultation follow-up, discharge planning, and rehabilitation exercise protocols.",
        },
    ]

    st.dataframe(pd.DataFrame(criteria_table), use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### 📖 External Academic & Literature References")
    st.markdown(
        """
        1. **India Competitiveness Report 2023:** Historical treatment cost benchmarks across cross-border destinations. 
           [Report PDF Link](https://circ.in/pdf/Report-ICRR2023.pdf)
        2. **Systematic Review of Total Knee Replacement Costs:** Clinical economics and international price variance. 
           [PubMed Central PMC10368258](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368258/)
        3. **Joint Commission International (JCI):** Official directory of accredited healthcare organizations. 
           [JCI Directory Link](https://www.jointcommission.org/en/about-us/recognizing-excellence/find-accredited-international-organizations)
        """
    )
