import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Hospital,
  RankedHospital,
  AHPResult,
  SystemMeta,
  KneeProcedure,
  TOPSISResult,
} from '@/types/dss';
import * as api from '@/services/api';
import { DSSContext, DEFAULT_PROFILE, PatientProfile } from './DSSContext';

export const DSSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMeta] = useState<SystemMeta | null>(null);
  const [procedures, setProcedures] = useState<KneeProcedure[]>([]);
  const [selectedProcedureId, setSelectedProcedureIdState] = useState<string>('KNEE01');
  const [profile, setProfile] = useState<PatientProfile>(DEFAULT_PROFILE);
  const [ahpMatrix, setAhpMatrix] = useState<number[][]>([]);
  const [ahpResult, setAhpResult] = useState<AHPResult | null>(null);
  const [rankingResult, setRankingResult] = useState<TOPSISResult | null>(null);
  const [rankedHospitals, setRankedHospitals] = useState<RankedHospital[]>([]);
  const [rawHospitals, setRawHospitals] = useState<Hospital[]>([]);
  const [activeArchetype, setActiveArchetype] = useState<string>('Illustrative Defaults');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request counter to guarantee stale async API responses never overwrite newer user selections
  const procedureReqIdRef = React.useRef<number>(0);

  const selectedProcedure = useMemo(() => {
    return procedures.find((p) => p.procedure_id === selectedProcedureId) || null;
  }, [procedures, selectedProcedureId]);

  // Initialize DSS with default preset, procedures & metadata
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setIsLoading(true);
        const [metaData, proceduresData, hospitalsData, defaultPreset] = await Promise.all([
          api.fetchMetadata(),
          api.fetchProcedures(),
          api.fetchHospitals({ procedure_id: 'KNEE01' }, 'KNEE01'),
          api.fetchAHPPreset('default'),
        ]);

        if (!isMounted) return;

        setMeta(metaData);
        setProcedures(proceduresData);
        setRawHospitals(hospitalsData);
        setAhpMatrix(defaultPreset.matrix);
        setAhpResult({
          matrix: defaultPreset.matrix,
          weights: defaultPreset.weights,
          lambda_max: defaultPreset.lambda_max,
          ci: defaultPreset.ci,
          cr: defaultPreset.cr,
          is_consistent: defaultPreset.is_consistent,
        });

        // Run initial TOPSIS ranking for KNEE01
        const topsisRes = await api.calculateTOPSIS(
          defaultPreset.weights,
          {
            countries: DEFAULT_PROFILE.countries,
            max_budget: DEFAULT_PROFILE.max_budget,
            max_waiting_time: DEFAULT_PROFILE.max_waiting_time,
            min_quality: DEFAULT_PROFILE.min_quality,
            procedure_id: 'KNEE01',
          },
          'KNEE01'
        );
        if (isMounted) {
          setRankingResult(topsisRes);
          setRankedHospitals(topsisRes.ranked_hospitals || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to initialize decision system.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Set selected procedure and refresh data with race condition protection
  const setSelectedProcedureId = useCallback(
    async (newId: string) => {
      const reqId = ++procedureReqIdRef.current;
      setSelectedProcedureIdState(newId);
      const updatedProfile = { ...profile, procedure_id: newId };
      setProfile(updatedProfile);
      setIsCalculating(true);
      try {
        const [hospitalsData, topsisRes] = await Promise.all([
          api.fetchHospitals({ procedure_id: newId }, newId, true),
          api.calculateTOPSIS(
            ahpResult?.weights || [0.243, 0.377, 0.15, 0.088, 0.054, 0.088],
            updatedProfile,
            newId
          ),
        ]);
        if (reqId !== procedureReqIdRef.current) {
          return; // Discard stale response
        }
        setRawHospitals(hospitalsData);
        setRankingResult(topsisRes);
        setRankedHospitals(topsisRes.ranked_hospitals || []);
        setErrorMessage(null);
      } catch (err: any) {
        if (reqId === procedureReqIdRef.current) {
          setErrorMessage(err.message || 'Failed to update selected procedure data.');
        }
      } finally {
        if (reqId === procedureReqIdRef.current) {
          setIsCalculating(false);
        }
      }
    },
    [profile, ahpResult]
  );

  // Update a single pairwise comparison value and recalculate AHP + TOPSIS
  const updatePairwiseValue = useCallback(
    async (i: number, j: number, value: number) => {
      if (!ahpMatrix || ahpMatrix.length === 0) return;
      const newMatrix = ahpMatrix.map((row) => [...row]);
      newMatrix[i][j] = value;
      newMatrix[j][i] = 1.0 / value;

      setAhpMatrix(newMatrix);
      setActiveArchetype('Custom Calibration');
      setIsCalculating(true);
      try {
        const ahp = await api.calculateAHP(newMatrix);
        setAhpResult(ahp);

        // Update rankings with new weights for the active procedure
        const topsisRes = await api.calculateTOPSIS(
          ahp.weights,
          {
            countries: profile.countries,
            max_budget: profile.max_budget,
            max_waiting_time: profile.max_waiting_time,
            min_quality: profile.min_quality,
            procedure_id: selectedProcedureId,
          },
          selectedProcedureId
        );
        setRankingResult(topsisRes);
        setRankedHospitals(topsisRes.ranked_hospitals || []);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error calculating AHP weights.');
      } finally {
        setIsCalculating(false);
      }
    },
    [ahpMatrix, profile, selectedProcedureId]
  );

  // Apply a predefined preset
  const applyPreset = useCallback(
    async (presetName: string) => {
      setIsCalculating(true);
      try {
        let presetKey = 'default';
        if (presetName === 'Cost-Conscious') presetKey = 'cost_conscious';
        else if (presetName === 'Quality-First') presetKey = 'quality_first';
        else if (presetName === 'Expedited Care') presetKey = 'expedited_care';
        else if (presetName === 'Equal Weights') presetKey = 'equal_weights';

        let res: AHPResult;
        if (presetName === 'Equal Weights') {
          const n = 6;
          const equalMatrix = Array(n).fill(0).map(() => Array(n).fill(1.0));
          res = await api.calculateAHP(equalMatrix);
        } else {
          res = await api.fetchAHPPreset(presetKey);
        }

        setAhpMatrix(res.matrix);
        setAhpResult(res);
        setActiveArchetype(presetName);

        // Update rankings
        const topsisRes = await api.calculateTOPSIS(
          res.weights,
          {
            countries: profile.countries,
            max_budget: profile.max_budget,
            max_waiting_time: profile.max_waiting_time,
            min_quality: profile.min_quality,
            procedure_id: selectedProcedureId,
          },
          selectedProcedureId
        );
        setRankingResult(topsisRes);
        setRankedHospitals(topsisRes.ranked_hospitals || []);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to apply preset.');
      } finally {
        setIsCalculating(false);
      }
    },
    [profile, selectedProcedureId]
  );

  // Refresh rankings with given or current weights/profile
  const refreshRankings = useCallback(
    async (
      customWeights?: number[],
      customProfile?: PatientProfile,
      customProcedureId?: string
    ) => {
      const activeWeights = customWeights || ahpResult?.weights;
      if (!activeWeights) return;
      const targetProfile = customProfile || profile;
      const targetProc = customProcedureId || targetProfile.procedure_id || selectedProcedureId;

      const reqId = ++procedureReqIdRef.current;
      setIsCalculating(true);
      try {
        const topsisRes = await api.calculateTOPSIS(
          activeWeights,
          {
            countries: targetProfile.countries,
            max_budget: targetProfile.max_budget,
            max_waiting_time: targetProfile.max_waiting_time,
            min_quality: targetProfile.min_quality,
            procedure_id: targetProc,
          },
          targetProc
        );
        if (reqId !== procedureReqIdRef.current) return;
        setRankingResult(topsisRes);
        setRankedHospitals(topsisRes.ranked_hospitals || []);
        setErrorMessage(null);
      } catch (err: any) {
        if (reqId === procedureReqIdRef.current) {
          setErrorMessage(err.message || 'Failed to update rankings.');
        }
      } finally {
        if (reqId === procedureReqIdRef.current) {
          setIsCalculating(false);
        }
      }
    },
    [ahpResult, profile, selectedProcedureId]
  );

  // Save profile and trigger updates
  const saveProfileAndRecalculate = useCallback(
    async (newProfile: PatientProfile) => {
      const reqId = ++procedureReqIdRef.current;
      setProfile(newProfile);
      const targetProc = newProfile.procedure_id || selectedProcedureId;
      if (newProfile.procedure_id && newProfile.procedure_id !== selectedProcedureId) {
        setSelectedProcedureIdState(newProfile.procedure_id);
      }

      // Map archetype to preset
      let archPreset = 'default';
      if (newProfile.archetype === 'Cost-Conscious') archPreset = 'cost_conscious';
      else if (newProfile.archetype === 'Quality-First') archPreset = 'quality_first';
      else if (newProfile.archetype === 'Expedited Care') archPreset = 'expedited_care';

      setIsCalculating(true);
      try {
        const [presetRes, hospitalsData] = await Promise.all([
          api.fetchAHPPreset(archPreset),
          api.fetchHospitals({ procedure_id: targetProc }, targetProc, true),
        ]);
        if (reqId !== procedureReqIdRef.current) return;
        setAhpMatrix(presetRes.matrix);
        setAhpResult(presetRes);
        setActiveArchetype(newProfile.archetype);
        setRawHospitals(hospitalsData);

        const topsisRes = await api.calculateTOPSIS(
          presetRes.weights,
          {
            countries: newProfile.countries,
            max_budget: newProfile.max_budget,
            max_waiting_time: newProfile.max_waiting_time,
            min_quality: newProfile.min_quality,
            procedure_id: targetProc,
          },
          targetProc
        );
        if (reqId !== procedureReqIdRef.current) return;
        setRankingResult(topsisRes);
        setRankedHospitals(topsisRes.ranked_hospitals || []);
        setErrorMessage(null);
      } catch (err: any) {
        if (reqId === procedureReqIdRef.current) {
          setErrorMessage(err.message || 'Failed to update preferences.');
        }
      } finally {
        if (reqId === procedureReqIdRef.current) {
          setIsCalculating(false);
        }
      }
    },
    [selectedProcedureId]
  );

  return (
    <DSSContext.Provider
      value={{
        meta,
        profile,
        setProfile,
        procedures,
        selectedProcedureId,
        selectedProcedure,
        setSelectedProcedureId,
        ahpMatrix,
        setAhpMatrix,
        ahpResult,
        rankedHospitals,
        rawHospitals,
        rankingResult,
        isLoading,
        isCalculating,
        errorMessage,
        activeArchetype,
        updatePairwiseValue,
        applyPreset,
        refreshRankings,
        saveProfileAndRecalculate,
      }}
    >
      {children}
    </DSSContext.Provider>
  );
};
