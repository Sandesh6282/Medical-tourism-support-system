# Medical Tourism Decision Support System Using AHP-TOPSIS

**Final Year Engineering Project (FYP)**  
*An interactive Multi-Criteria Decision Analysis (MCDA) web application designed to help international patients evaluate, compare, and rank hospitals for knee replacement surgery across India, Turkey, Thailand, and the USA.*

---

## 📌 Project Overview

Medical tourism has experienced rapid global growth, yet patients face substantial decision complexity when attempting to balance healthcare affordability against clinical excellence, wait times, and travel logistics. 

This project implements a clinical and analytical decision support system tailored for **knee replacement surgery** (unilateral and bilateral arthroplasty). By synthesizing subjective patient priorities with objective hospital performance data, the platform eliminates guesswork through a mathematically rigorous hybrid decision model.

---

## 🎯 Evaluated Countries & Procedure

- **Target Procedure:** Knee Replacement Surgery (Arthroplasty)
- **Geographic Scope:**
  - 🇮🇳 **India:** Recognized for high surgical volume, cost efficiency, and accredited multi-specialty hospital chains.
  - 🇹🇷 **Turkey:** Renowned medical tourism hub bridging Europe and Asia with cutting-edge medical technologies.
  - 🇹🇭 **Thailand:** Pioneer in medical hospitality, renowned international accreditations (JCI), and patient service.
  - 🇺🇸 **USA:** Benchmark for clinical research, advanced robotic surgery, and clinical protocols.

---

## 📊 The Six Decision Criteria

The evaluation framework incorporates six conflicting quantitative and qualitative criteria:

| # | Criterion | Type | Description | Unit / Measurement |
|---|-----------|------|-------------|--------------------|
| 1 | **Procedure Cost** | **Cost** *(lower is better)* | Inpatient surgical package, surgeon fee, implant cost, and hospital stay | USD ($) |
| 2 | **Hospital Quality** | **Benefit** *(higher is better)* | International accreditations (e.g., JCI), patient safety record, infection rate | Index Score (0–100) |
| 3 | **Waiting Time** | **Cost** *(lower is better)* | Elapsed duration between medical clearance and surgical procedure date | Days / Weeks |
| 4 | **Travel & Accommodation Cost** | **Cost** *(lower is better)* | Estimated round-trip flights, visa fees, and local hotel stay for patient & companion | USD ($) |
| 5 | **Language Accessibility** | **Benefit** *(higher is better)* | Multilingual medical staff, dedicated international patient coordinators, interpreters | Score (1–5 scale) |
| 6 | **Post-operative Support** | **Benefit** *(higher is better)* | Discharge follow-up protocols, telemedicine consultations, rehabilitation care | Score (1–5 scale) |

---

## 🔬 Methodology: Hybrid AHP-TOPSIS Framework

The decision engine combines two complementary multi-criteria decision-making techniques:

```
┌─────────────────────────────────┐
│   Patient / Expert Judgments    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Analytic Hierarchy Process     │ ──> Computes criteria weights (w_j)
│  (AHP)                          │ ──> Validates Consistency Ratio (CR < 0.10)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  TOPSIS Multi-Criteria Engine   │ ──> Normalizes decision matrix
│                                 │ ──> Identifies Ideal Solutions (PIS / NIS)
│                                 │ ──> Calculates relative closeness (C_i*)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Hospital Leaderboard &         │ ──> Sensitivity Analysis (weight perturbation)
│  Comparative Dashboard         │ ──> Dynamic radar charts & trade-off insights
└─────────────────────────────────┘
```

1. **Analytic Hierarchy Process (AHP):**
   - Uses Saaty's 1–9 pairwise comparison scale to derive criteria priority weights.
   - Computes the Consistency Index ($CI$) and Consistency Ratio ($CR$) to verify that patient preferences remain rational and logically consistent ($CR < 0.10$).

2. **TOPSIS (Technique for Order Preference by Similarity to Ideal Solution):**
   - Applies vector normalization to handle heterogeneous units (currency, days, accreditation scores).
   - Establishes the Positive Ideal Solution ($A^+$) and Negative Ideal Solution ($A^-$).
   - Computes Euclidean separation distances ($S_i^+, S_i^-$) and determines the relative closeness score ($C_i^* = S_i^- / (S_i^+ + S_i^-)$).
   - Ranks hospitals in descending order of closeness score.

3. **Sensitivity Analysis:**
   - Tests the robustness of top hospital rankings by perturbing individual criteria weights and identifying critical rank reversal points.

---

## 📁 Project Directory Structure

```
FYP/
├── app.py                     # Streamlit application entry point & dashboard placeholder
├── requirements.txt           # Project dependencies (streamlit, pandas, numpy, plotly)
├── README.md                  # Project documentation, methodology, and setup guide
├── .gitignore                 # Exclusions for virtual envs, caches, and system files
├── data/
│   └── .gitkeep               # Directory for raw and processed hospital datasets
├── assets/
│   └── .gitkeep               # Directory for mockups, diagrams, and media
├── utils/
│   ├── __init__.py            # Utils package initialization
│   ├── ahp.py                 # Analytic Hierarchy Process calculation module
│   ├── topsis.py              # TOPSIS multi-criteria ranking module
│   ├── sensitivity.py         # Weight perturbation and sensitivity analysis module
│   └── data_loader.py         # Hospital data loading, filtering, and schema validation
└── pages/
    ├── 1_Patient_Preferences.py   # Module 1: Patient priorities and filter presets
    ├── 2_Criteria_Weights.py      # Module 2: AHP pairwise comparison & consistency check
    ├── 3_Hospital_Rankings.py     # Module 3: TOPSIS closeness score leaderboard
    ├── 4_Hospital_Comparison.py   # Module 4: Side-by-side hospital radar comparison
    ├── 5_Sensitivity_Analysis.py  # Module 5: Robustness testing & weight perturbation
    └── 6_Methodology.py           # Module 6: Theoretical formulations & mathematical equations
```

---

## 🚀 Setup and Execution Instructions

### Prerequisites
- Python 3.9+ (Python 3.10+ recommended)
- `pip` package manager

### 1. Clone or Navigate to the Project Directory
```bash
cd FYP
```

### 2. Create and Activate a Virtual Environment

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**
```cmd
python -m venv venv
.\venv\Scripts\activate.bat
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Streamlit Application
```bash
streamlit run app.py
```

The application will start locally at `http://localhost:8501`.

---

## 🧭 Navigation & Workflow

When launched, the Streamlit sidebar provides access to all modules:
1. **Home (`app.py`):** Executive overview of the medical tourism decision framework.
2. **1. Patient Preferences:** Define budget, travel timeline, and select destination countries.
3. **2. Criteria Weights:** Calibrate the 6 criteria with Saaty pairwise sliders and check $CR < 0.10$.
4. **3. Hospital Rankings:** View the computed TOPSIS closeness scores and hospital leaderboard.
5. **4. Hospital Comparison:** Compare shortlisted hospitals across radar charts and metric tables.
6. **5. Sensitivity Analysis:** Test ranking stability across varying criteria weight scenarios.
7. **6. Methodology:** Deep dive into the mathematical proofs, normalization formulas, and literature.

---

## 👥 Authors & Academic Context
- **Project:** Final Year Engineering Project (FYP)
- **Domain:** Health Informatics & Multi-Criteria Decision Analysis (MCDA)
