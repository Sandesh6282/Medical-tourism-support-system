/**
 * API Service Client for Medical Tourism Decision Support System.
 * Connects frontend to the FastAPI backend via Vite proxy (/api).
 */

import {
  Hospital,
  RankedHospital,
  FilterParams,
  AHPResult,
  SensitivityOATResult,
  SensitivityScenariosResult,
  SystemMeta,
  KneeProcedure,
  TOPSISResult,
} from '@/types/dss';

const BASE_URL = '/api';

// In-memory promise cache for deduplicating repeated network requests
let metadataCachePromise: Promise<SystemMeta> | null = null;
let proceduresCachePromise: Promise<KneeProcedure[]> | null = null;
const hospitalCache = new Map<string, Promise<Hospital[]>>();
const ahpPresetCache = new Map<string, Promise<AHPResult & { archetype: string }>>();

export async function fetchMetadata(forceRefresh = false): Promise<SystemMeta> {
  if (!forceRefresh && metadataCachePromise) {
    return metadataCachePromise;
  }
  metadataCachePromise = (async () => {
    const res = await fetch(`${BASE_URL}/meta`);
    if (!res.ok) {
      metadataCachePromise = null;
      throw new Error(`Failed to fetch system metadata: ${res.statusText}`);
    }
    return res.json();
  })();
  return metadataCachePromise;
}

export async function fetchProcedures(forceRefresh = false): Promise<KneeProcedure[]> {
  if (!forceRefresh && proceduresCachePromise) {
    return proceduresCachePromise;
  }
  proceduresCachePromise = (async () => {
    const res = await fetch(`${BASE_URL}/procedures`);
    if (!res.ok) {
      proceduresCachePromise = null;
      throw new Error(`Failed to fetch procedures: ${res.statusText}`);
    }
    return res.json();
  })();
  return proceduresCachePromise;
}

export async function fetchHospitals(
  filters?: FilterParams,
  procedureId: string = 'KNEE01',
  forceRefresh = false
): Promise<Hospital[]> {
  const params = new URLSearchParams();
  const proc = filters?.procedure_id || procedureId;
  if (proc) {
    params.set('procedure_id', proc);
  }
  if (filters?.countries && filters.countries.length > 0) {
    [...filters.countries].sort().forEach((c) => params.append('countries', c));
  }
  if (filters?.max_budget !== undefined) {
    params.set('max_budget', filters.max_budget.toString());
  }
  if (filters?.max_waiting_time !== undefined) {
    params.set('max_waiting_time', filters.max_waiting_time.toString());
  }
  if (filters?.min_quality !== undefined) {
    params.set('min_quality', filters.min_quality.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const cacheKey = query;

  if (!forceRefresh && hospitalCache.has(cacheKey)) {
    return hospitalCache.get(cacheKey)!;
  }

  const promise = (async () => {
    const res = await fetch(`${BASE_URL}/hospitals${query}`);
    if (!res.ok) {
      hospitalCache.delete(cacheKey);
      throw new Error(`Failed to fetch hospitals: ${res.statusText}`);
    }
    return res.json();
  })();

  hospitalCache.set(cacheKey, promise);
  return promise;
}

export async function fetchAHPPreset(
  archetype: string,
  forceRefresh = false
): Promise<AHPResult & { archetype: string }> {
  if (!forceRefresh && ahpPresetCache.has(archetype)) {
    return ahpPresetCache.get(archetype)!;
  }

  const promise = (async () => {
    const res = await fetch(`${BASE_URL}/ahp/preset/${encodeURIComponent(archetype)}`);
    if (!res.ok) {
      ahpPresetCache.delete(archetype);
      throw new Error(`Failed to load AHP preset '${archetype}': ${res.statusText}`);
    }
    return res.json();
  })();

  ahpPresetCache.set(archetype, promise);
  return promise;
}

export async function calculateAHP(matrix: number[][]): Promise<AHPResult> {
  const res = await fetch(`${BASE_URL}/ahp/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matrix }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `AHP calculation failed: ${res.statusText}`);
  }
  return res.json();
}

export async function calculateTOPSIS(
  weights: number[],
  filters?: FilterParams,
  procedureId: string = 'KNEE01'
): Promise<TOPSISResult> {
  const proc = filters?.procedure_id || procedureId;
  const res = await fetch(`${BASE_URL}/topsis/rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weights,
      filter_params: filters || null,
      procedure_id: proc,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `TOPSIS ranking failed: ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return {
      eligible: true,
      procedure_id: proc,
      procedure_label: 'Knee replacement',
      message: 'Demonstration mode',
      is_demonstration: true,
      ranked_hospitals: data,
    };
  }
  return data;
}

export async function fetchSensitivityScenarios(
  baseWeights?: number[],
  filters?: FilterParams,
  procedureId: string = 'KNEE01'
): Promise<SensitivityScenariosResult> {
  const proc = filters?.procedure_id || procedureId;
  const res = await fetch(`${BASE_URL}/sensitivity/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_weights: baseWeights || null,
      filter_params: filters || null,
      procedure_id: proc,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Scenario evaluation failed: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.scenarios !== undefined) {
    return data;
  }
  return {
    eligible: true,
    procedure_id: proc,
    message: '',
    scenarios: data as Record<string, RankedHospital[]>,
  };
}

export async function fetchSensitivityOAT(
  baseWeights: number[],
  targetCriterionIdx: number,
  filters?: FilterParams,
  weightMin = 0.05,
  weightMax = 0.65,
  steps = 13,
  procedureId: string = 'KNEE01'
): Promise<SensitivityOATResult> {
  const proc = filters?.procedure_id || procedureId;
  const res = await fetch(`${BASE_URL}/sensitivity/oat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_weights: baseWeights,
      target_criterion_idx: targetCriterionIdx,
      weight_min: weightMin,
      weight_max: weightMax,
      steps: steps,
      filter_params: filters || null,
      procedure_id: proc,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `OAT sensitivity simulation failed: ${res.statusText}`);
  }
  return res.json();
}
