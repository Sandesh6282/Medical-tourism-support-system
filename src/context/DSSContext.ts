import { createContext, useContext } from 'react';
import type React from 'react';
import {
  Hospital,
  RankedHospital,
  AHPResult,
  SystemMeta,
  KneeProcedure,
  TOPSISResult,
} from '@/types/dss';

export interface PatientProfile {
  countries: string[];
  max_budget: number;
  max_waiting_time: number;
  min_quality: number;
  archetype: string;
  procedure_id?: string;
}

export interface DSSContextType {
  meta: SystemMeta | null;
  profile: PatientProfile;
  setProfile: React.Dispatch<React.SetStateAction<PatientProfile>>;
  procedures: KneeProcedure[];
  selectedProcedureId: string;
  selectedProcedure: KneeProcedure | null;
  setSelectedProcedureId: (id: string) => Promise<void>;
  ahpMatrix: number[][];
  setAhpMatrix: React.Dispatch<React.SetStateAction<number[][]>>;
  ahpResult: AHPResult | null;
  rankedHospitals: RankedHospital[];
  rawHospitals: Hospital[];
  rankingResult: TOPSISResult | null;
  isLoading: boolean;
  isCalculating: boolean;
  errorMessage: string | null;
  activeArchetype: string;
  updatePairwiseValue: (i: number, j: number, value: number) => Promise<void>;
  applyPreset: (presetName: string) => Promise<void>;
  refreshRankings: (
    customWeights?: number[],
    customProfile?: PatientProfile,
    customProcedureId?: string
  ) => Promise<void>;
  saveProfileAndRecalculate: (newProfile: PatientProfile) => Promise<void>;
}

export const DEFAULT_PROFILE: PatientProfile = {
  countries: ['India', 'Türkiye', 'Thailand', 'USA'],
  max_budget: 35000,
  max_waiting_time: 14,
  min_quality: 10,
  archetype: 'Balanced',
  procedure_id: 'KNEE01',
};

export const DSSContext = createContext<DSSContextType | undefined>(undefined);

export function useDSS(): DSSContextType {
  const context = useContext(DSSContext);
  if (!context) {
    throw new Error('useDSS must be used within a DSSProvider');
  }
  return context;
}

