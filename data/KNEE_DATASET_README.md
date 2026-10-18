# Medical Tourism Decision Support System — Knee Procedure Dataset

> [!WARNING]
> **ACADEMIC INTEGRITY NOTICE — SYNTHETIC SIMULATION DATA — FOR ACADEMIC DEMONSTRATION ONLY**
>
> The numeric data contained in this project (`FYP_hospital_dataset.csv` and `hospital_procedure_data.csv`) represent **synthetic simulation data** engineered strictly for demonstrating and evaluating the Analytic Hierarchy Process (AHP) and Technique for Order Preference by Similarity to Ideal Solution (TOPSIS) decision-support algorithms.
>
> These figures **are not** verified hospital prices, measured clinical outcomes, audited waiting times, or official quotations from the named healthcare institutions. Do not cite or utilize these records for medical decisions or clinical research.

---

## 1. Overview and Scope

The system supports **nine knee-procedure categories (`KNEE01`–`KNEE09`)** evaluated across **16 candidate hospitals** (four per destination country: India, Türkiye, Thailand, and USA), totaling exactly **144 unique hospital-procedure combinations**.

Every combination possesses complete, verified numeric values across all six decision criteria, allowing robust multi-criteria evaluation, feasibility filtering, sensitivity analysis, and comparative hospital benchmarking.

---

## 2. Decision Criteria Framework

| Criterion | Key Name | Direction | Scale / Unit | Clinical Justification & Source Rationale |
| :--- | :--- | :---: | :---: | :--- |
| **Procedure Cost** | `procedure_cost_usd` | **Cost (↓)** | USD ($) | Total surgical package including implant, surgeon fees, operating theatre, and routine post-op inpatient stay. Varies by surgical complexity and technology. |
| **Hospital Quality** | `hospital_quality_score_1_to_15` | **Benefit (↑)** | 1–15 Integer | Composite proxy for institutional accreditation (JCI, NABH, TEMOS), surgical volume, and infection-control safety protocols. |
| **Waiting Time** | `waiting_time_days` | **Cost (↓)** | Days | Preoperative scheduling lead time from international patient intake to surgical intervention. |
| **Travel & Accommodation** | `travel_accommodation_cost_usd` | **Cost (↓)** | USD ($) | Destination-associated round-trip airfare, companion hotel stay, local ground transfers, and international travel logistics. |
| **Language Accessibility** | `language_accessibility_score_1_to_5` | **Benefit (↑)** | 1–5 Integer | Multilingual medical coordinator support, interpreter lounges, and English clinical documentation fluency. |
| **Post-operative Support** | `postoperative_support_score_1_to_5` | **Benefit (↑)** | 1–5 Integer | Post-discharge tele-rehabilitation protocol, home orthopedic liaison, and cross-border clinical follow-up. |

---

## 3. The 9 Knee Procedures & Calibration Rationale

The baseline surgical costs and waiting times derive from published medical tourism studies (e.g., Indian Council for Medical Tourism Research, Turkish Ministry of Health, Thai Joint Commission reports) for Primary Total Knee Replacement (`KNEE01`). Other procedures are mathematically calibrated using clinical complexity multipliers:

| Procedure ID | Clinical Name | Cost Multiplier | Wait Time Offset | Travel Multiplier | Clinical Rationale |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **KNEE01** | Knee replacement | 1.00× (Baseline) | +0 days | 1.00× | Standard unilateral primary total knee arthroplasty benchmark (exact match with legacy dataset). |
| **KNEE02** | Total knee replacement (TKR) with OMNI | 1.12× | +2 days | 1.00× | Computer-navigated OMNIBotics precision resection with sensor-assisted ligament balancing surcharge. |
| **KNEE03** | Knee MAKoplasty | 1.26× | +3 days | 1.00× | Stryker Mako robotic-arm assisted arthroplasty; includes specialized single-use robotic blades and CT segmentation. |
| **KNEE04** | Total Knee Replacement (Arthroplasty) | 1.02× | +1 day | 1.00× | Conventional mechanical alignment total joint replacement; clinically aligned with primary baseline with minor package variance. |
| **KNEE05** | Robotic knee replacement surgery | 1.22× | +3 days | 1.00× | General robotic platform assistance (ROSA, VELYS, NAVIO); includes capital amortization fee and specialized robotics theatre booking. |
| **KNEE06** | Knee arthroplastic | 1.04× | +1 day | 1.00× | Broad joint reconstructive resurfacing category. |
| **KNEE07** | Unilateral knee arthroplasty | 0.99× | +0 days | 1.00× | Single-compartment / single-knee anatomical arthroplasty equivalent to primary unilateral baseline. |
| **KNEE08** | Unicompartmental (partial) knee replacement | 0.80× | -2 days | 0.92× | Partial knee replacement involving solely the medial or lateral compartment. Minimally invasive, shorter hospital stay, lower implant cost. |
| **KNEE09** | Revision knee arthroplasty | 1.55× | +8 to +14 days | 1.15× | Secondary revision surgery. Requires implant extraction, augments/cones, bone graft, and subspecialist orthopedic revision surgeons. |

---

## 4. Destination Travel Cost Estimation Methodology

Travel and accommodation costs (`travel_accommodation_cost_usd`) reflect destination-specific logistics:
- **India (Chennai, Gurugram, Bengaluru):** $1,100 – $1,800. Low cost of local 4-star lodging and ground transport; moderate flight costs from major international hubs.
- **Türkiye (Istanbul, Gebze):** $1,550 – $1,800. Strategic geographic crossroad with competitive hotel tariffs and convenient flight connectivity.
- **Thailand (Bangkok):** $1,650 – $1,900. World-class medical hospitality infrastructure with established patient-hotel packages.
- **USA (Rochester, Cleveland, New York, Baltimore):** $5,800 – $7,200. High domestic flight, accommodation, and per-diem living expenses for international visitors.

For **Partial Knee Replacement (`KNEE08`)**, the shorter expected length of stay reduces travel and accommodation by ~8%. For **Revision Surgery (`KNEE09`)**, the extended post-operative recovery and mandatory clinical surveillance period prior to long-haul flight clearance increases travel budgets by ~15%.

---

## 5. File Architecture

1. `data/hospitals.csv`: Master repository of 16 hospitals across India, Türkiye, Thailand, and USA (4 per country).
2. `data/knee_procedures.csv`: Definitions of all 9 knee procedures with standardized IDs and clinical categorization.
3. `data/FYP_hospital_dataset.csv`: 16-row benchmark demonstration dataset for standard Knee Replacement (`KNEE01`).
4. `data/hospital_procedure_data.csv`: 144-row multi-procedure dataset (16 hospitals × 9 procedures) with complete 6-criterion vectors for all procedures.
