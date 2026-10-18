/**
 * TypeScript definitions for Medical Tourism Decision Support System (AHP-TOPSIS).
 */

export interface KneeProcedure {
  procedure_id: string;
  id?: string;
  procedure_name?: string;
  display_label: string;
  normalized_procedure_code: string;
  procedure_category: string;
  technique: string;
  laterality: string;
  terminology_status: string;
  definition_notes: string;
  data_source_url?: string | null;
  source_status: string;
  is_demonstration: boolean;
  ranking_eligible: boolean;
  ranking_eligible_count: number;
  data_availability_message: string;
  is_technique?: boolean;
  technique_guidance?: string | null;
  source_dataset?: string;
}

export interface Hospital {
  hospital_id: string;
  hospital_name: string;
  country: string;
  city_or_region: string;
  city?: string;
  procedure_cost_usd: number | null;
  hospital_quality_score_1_to_15: number | null;
  waiting_time_days: number | null;
  travel_accommodation_cost_usd: number | null;
  language_accessibility_score_1_to_5: number | null;
  postoperative_support_score_1_to_5: number | null;
  procedure_id?: string;
  procedure_name?: string;
  procedure_available?: boolean | string | null;
  availability_data_status?: string;
  procedure_cost_data_status?: string;
  hospital_quality_data_status?: string;
  waiting_time_data_status?: string;
  travel_accommodation_data_status?: string;
  language_accessibility_data_status?: string;
  postoperative_support_data_status?: string;
  data_status?: string;
  source?: string;
  criteria_directions?: string;
  data_notes?: string;
  ranking_eligible?: string;
  ranking_eligibility_reason?: string;
  is_demonstration?: boolean;
  source_url?: string | null;
  source_title?: string | null;
  verification_date?: string | null;
  source_scope_notes?: string | null;
  source_file?: string;
  country_cost_reference_url?: string;
  systematic_review_reference_url?: string;
  jci_verification_url?: string;
}

export interface RankedHospital extends Hospital {
  procedure_cost_usd: number;
  hospital_quality_score_1_to_15: number;
  waiting_time_days: number;
  travel_accommodation_cost_usd: number;
  language_accessibility_score_1_to_5: number;
  postoperative_support_score_1_to_5: number;
  s_plus: number;
  s_minus: number;
  closeness_score: number;
  rank: number;
}

export interface TOPSISResult {
  eligible: boolean;
  procedure_id: string;
  procedure_label: string;
  message: string;
  is_demonstration: boolean;
  ranked_hospitals: RankedHospital[];
}

export interface FilterParams {
  countries?: string[];
  max_budget?: number;
  max_waiting_time?: number;
  min_quality?: number;
  procedure_id?: string;
}

export interface AHPResult {
  matrix: number[][];
  weights: number[];
  lambda_max: number;
  ci: number;
  cr: number;
  is_consistent: boolean;
}

export interface SensitivityCrossover {
  weight_interval: [number, number];
  previous_top: [string, string];
  new_top: [string, string];
}

export interface SensitivityOATPoint {
  test_weight: number;
  hospital_id: string;
  hospital_name: string;
  country: string;
  closeness_score: number;
  rank: number;
}

export interface SensitivityOATResult {
  eligible?: boolean;
  procedure_id?: string;
  message?: string;
  trajectory: SensitivityOATPoint[];
  crossovers: SensitivityCrossover[];
}

export interface SensitivityScenariosResult {
  eligible?: boolean;
  procedure_id?: string;
  message?: string;
  scenarios: Record<string, RankedHospital[]>;
}

export interface SystemMeta {
  disclaimer: string;
  criteria_columns: string[];
  criteria_display_names: Record<string, string>;
  criteria_types: Record<string, string>;
  target_countries: string[];
  saaty_scale: Record<string, string>;
  random_index_table: Record<string, number>;
  total_hospitals: number;
  total_procedures?: number;
  procedures?: KneeProcedure[];
  active_dataset_files?: string[];
}

