# FYP Hospital Dataset — Synthetic Demonstration Dataset

This CSV contains 16 hospitals across India, Türkiye, Thailand, and the USA for demonstrating the existing AHP–TOPSIS knee-replacement DSS. **All hospital-specific numeric values are simulated**; they are not current hospital quotations, confirmed waiting times, verified clinical outcomes, measured quality ratings, or verified language/post-operative service audits. Do not use rankings for patient-care decisions.

## Calibration context (not hospital-level evidence)
- India Competitiveness Report 2023, Table 14.2, presents historical 2021 country-level knee-replacement price comparisons: https://circ.in/pdf/Report-ICRR2023.pdf
- Gandhi et al. (2023), systematic review of total knee replacement costs: https://pmc.ncbi.nlm.nih.gov/articles/PMC10368258/

These sources use different years, definitions, and methodologies. They inform broad plausibility only; neither verifies any value for a named hospital.

## Main fields
- `procedure_cost_usd`: simulated unilateral primary TKA estimate.
- `hospital_quality_score`: simulated 1–15 score.
- `waiting_time_days`: simulated waiting-time assumption.
- `travel_accommodation_cost_usd`: simulated travel/accommodation budget.
- `language_accessibility_score`, `postoperative_support_score`: simulated 1–5 scores.
- `*_status`: per-criterion evidence status.

## Criterion directions
Minimize procedure cost, waiting time, and travel/accommodation cost. Maximize quality, language accessibility, and post-operative support.

## Recommended disclaimer
“Illustrative AHP–TOPSIS ranking using synthetic demonstration data. Hospital-level values are simulated, not verified quotes, waiting times, quality measurements, or clinical recommendations.”

Keep genuinely unknown records in `hospital_procedure_data.csv` as unknown/null. Do not replace missing data with zero or copy synthetic values into the procedure catalogue.
