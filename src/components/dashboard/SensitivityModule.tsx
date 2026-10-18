import React, { useState, useEffect } from 'react';
import { useDSS } from '@/context/DSSContext';
import * as api from '@/services/api';
import { SensitivityOATResult, RankedHospital } from '@/types/dss';
import { AlertCircle, CheckCircle2, ArrowRight, Activity, Sliders, Info } from 'lucide-react';

interface SensitivityModuleProps {
  onNavigateNext: () => void;
}

const CRITERIA_KEYS = [
  'procedure_cost_usd',
  'hospital_quality_score_1_to_15',
  'waiting_time_days',
  'travel_accommodation_cost_usd',
  'language_accessibility_score_1_to_5',
  'postoperative_support_score_1_to_5',
];

const CRITERIA_LABELS: Record<string, string> = {
  procedure_cost_usd: 'Procedure Cost',
  hospital_quality_score_1_to_15: 'Hospital Quality',
  waiting_time_days: 'Waiting Time',
  travel_accommodation_cost_usd: 'Travel Cost',
  language_accessibility_score_1_to_5: 'Language Accessibility',
  postoperative_support_score_1_to_5: 'Post-op Support',
};

const HOSPITAL_COLORS = [
  '#1D3045',
  '#0D9488',
  '#E11D48',
  '#D97706',
  '#7C3AED',
  '#2563EB',
  '#059669',
  '#DC2626',
];

export const SensitivityModule: React.FC<SensitivityModuleProps> = ({ onNavigateNext }) => {
  const {
    ahpResult,
    profile,
    selectedProcedure,
    selectedProcedureId,
    rankingResult,
    rankedHospitals,
  } = useDSS();

  const [scenariosData, setScenariosData] = useState<Record<string, RankedHospital[]> | null>(null);
  const [selectedCritIdx, setSelectedCritIdx] = useState<number>(0);
  const [oatResult, setOatResult] = useState<SensitivityOATResult | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(true);
  const [isLoadingOAT, setIsLoadingOAT] = useState<boolean>(true);

  const baseWeights = ahpResult?.weights || [0.243, 0.377, 0.15, 0.088, 0.054, 0.088];
  const targetBaseWeight = baseWeights[selectedCritIdx] || 0.243;

  // Load scenarios on mount or when profile/weights/procedure change
  useEffect(() => {
    let isMounted = true;
    async function loadScenarios() {
      if (rankingResult?.eligible === false || rankedHospitals.length === 0) {
        setIsLoadingScenarios(false);
        return;
      }
      try {
        setIsLoadingScenarios(true);
        const data = await api.fetchSensitivityScenarios(
          baseWeights,
          {
            countries: profile.countries,
            max_budget: profile.max_budget,
            max_waiting_time: profile.max_waiting_time,
            min_quality: profile.min_quality,
          },
          selectedProcedureId
        );
        if (isMounted) setScenariosData(data.scenarios);
      } catch (err) {
        console.error('Failed to load scenarios', err);
      } finally {
        if (isMounted) setIsLoadingScenarios(false);
      }
    }
    loadScenarios();
    return () => {
      isMounted = false;
    };
  }, [baseWeights, profile, selectedProcedureId, rankingResult?.eligible, rankedHospitals.length]);

  // Load OAT trajectory when selected criterion or procedure changes
  useEffect(() => {
    let isMounted = true;
    async function loadOAT() {
      if (rankingResult?.eligible === false || rankedHospitals.length === 0) {
        setIsLoadingOAT(false);
        return;
      }
      try {
        setIsLoadingOAT(true);
        const data = await api.fetchSensitivityOAT(
          baseWeights,
          selectedCritIdx,
          {
            countries: profile.countries,
            max_budget: profile.max_budget,
            max_waiting_time: profile.max_waiting_time,
            min_quality: profile.min_quality,
          },
          0.05,
          0.65,
          13,
          selectedProcedureId
        );
        if (isMounted) setOatResult(data);
      } catch (err) {
        console.error('Failed to load OAT data', err);
      } finally {
        if (isMounted) setIsLoadingOAT(false);
      }
    }
    loadOAT();
    return () => {
      isMounted = false;
    };
  }, [selectedCritIdx, baseWeights, profile, selectedProcedureId, rankingResult?.eligible, rankedHospitals.length]);

  // If procedure data is insufficient for ranking or no hospitals match filters, show paused view
  if (rankingResult?.eligible === false || rankedHospitals.length === 0) {
    const procedureLabel = selectedProcedure?.display_label || selectedProcedure?.procedure_name || selectedProcedureId;
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <span>Module 5</span>
            <span>•</span>
            <span>Sensitivity Analysis & Stability Bounds</span>
          </div>
          <h2 className="text-2xl font-light text-[#1D3045] tracking-tight">
            Algorithmic Robustness & Ranking Stability: {procedureLabel}
          </h2>
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 uppercase tracking-wide text-xs bg-amber-200/80 px-2 py-0.5 rounded">
                Sensitivity Testing Paused
              </span>
              <span className="font-semibold text-slate-800">
                {rankedHospitals.length === 0
                  ? `No hospitals match active filters for ${procedureLabel}`
                  : `Sensitivity Simulations Require Active Rankings for ${procedureLabel}`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-light leading-relaxed">
              One-At-a-Time (OAT) weight perturbation and scenario stress-testing simulate how rank reversals occur when decision priorities shift. Please ensure at least one candidate hospital satisfies your feasibility filters in Module 1 to compute sensitivity stability bounds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unique hospitals in OAT trajectory
  const oatHospitals = Array.from(
    new Set(oatResult?.trajectory.map((p) => p.hospital_name) || [])
  );

  // SVG dimensions for OAT trajectory line plot
  const svgW = 600;
  const svgH = 320;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const plotW = svgW - padLeft - padRight;
  const plotH = svgH - padTop - padBottom;

  const minW = 0.05;
  const maxW = 0.65;
  const minScore = 0.1;
  const maxScore = 0.9;

  const scaleX = (val: number) => padLeft + ((val - minW) / (maxW - minW)) * plotW;
  const scaleY = (val: number) => padTop + plotH - ((val - minScore) / (maxScore - minScore)) * plotH;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 5</span>
              <span>•</span>
              <span>Sensitivity Analysis & Robustness Testing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Ranking Stability & Weight Perturbation
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Evaluate how hospital rankings respond under distinct decision paradigms and continuous
              One-At-A-Time (OAT) weight adjustments from 5% to 65%.
            </p>
          </div>
        </div>

        {/* Synthetic Demonstration Data Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Synthetic Demonstration Mode:</strong> Results are based on synthetic demonstration data for academic AHP-TOPSIS evaluation. Hospital-specific prices, waiting times, and scores have not been independently verified. Rankings are illustrative and are not medical advice or verified hospital recommendations.
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Pre-Packaged Scenario Testing */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h3 className="font-medium text-lg text-[#1D3045]">
            🎭 Scenario Comparison: Cost vs. Quality vs. Time Priorities
          </h3>
          <p className="text-xs text-slate-500 font-light">
            Examine the top recommendations across 5 standard decision paradigms
          </p>
        </div>

        {isLoadingScenarios || !scenariosData ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading scenario models...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Scenario Paradigm</th>
                  <th className="py-3 px-4">🥇 Rank 1 Hospital</th>
                  <th className="py-3 px-3 text-right">Top Score (Ci*)</th>
                  <th className="py-3 px-4">🥈 Runner-Up Hospital</th>
                  <th className="py-3 px-3 text-right">Runner-Up Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {Object.entries(scenariosData).map(([scName, list]) => {
                  const top1 = list[0];
                  const top2 = list[1];
                  const isCurrent = scName === 'Patient AHP Weights';

                  return (
                    <tr
                      key={scName}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-teal-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                        {isCurrent && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                        <span>{scName}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {top1?.hospital_name}{' '}
                        <span className="text-slate-400 text-[11px]">({top1?.country})</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                        {top1?.closeness_score.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {top2?.hospital_name}{' '}
                        <span className="text-slate-400 text-[11px]">({top2?.country})</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {top2?.closeness_score.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Interactive One-At-A-Time (OAT) Sensitivity Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls & Critical Switching Points (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-[#1D3045] font-medium text-base">
              <Sliders size={18} className="text-teal-600" />
              <span>OAT Simulation Controls</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Target Criterion to Perturb:
              </label>
              <select
                value={selectedCritIdx}
                onChange={(e) => setSelectedCritIdx(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {CRITERIA_KEYS.map((key, idx) => (
                  <option key={key} value={idx}>
                    {CRITERIA_LABELS[key]}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-500 font-light">
                Base AHP weight for <strong>{CRITERIA_LABELS[CRITERIA_KEYS[selectedCritIdx]]}</strong>:{' '}
                <span className="font-mono font-bold text-teal-800">
                  {(targetBaseWeight * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Critical Switching Points Feedback */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                ⚡ Critical Switching Points (Rank Reversals):
              </span>

              {oatResult?.crossovers && oatResult.crossovers.length > 0 ? (
                <div className="space-y-2">
                  {oatResult.crossovers.map((c, i) => {
                    const low = (c.weight_interval[0] * 100).toFixed(1);
                    const high = (c.weight_interval[1] * 100).toFixed(1);
                    return (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed space-y-1"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Rank Reversal around {low}% – {high}% Weight:</span>
                        </div>
                        <p>
                          <strong>{c.new_top[1]}</strong> overtakes <strong>{c.previous_top[1]}</strong> for the #1 position!
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Robust Ranking:</strong>
                    <span>
                      The #1 ranked hospital remains invariant across the entire weight perturbation spectrum (5% to 65%).
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Next Module Step CTA */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onNavigateNext}
                className="w-full py-3 px-4 rounded-xl bg-[#1D3045] hover:bg-[#253f5b] text-white font-medium text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Review Mathematical Methodology (Module 6)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: SVG Trajectory Line Plot (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg text-[#1D3045]">Ranking Trajectory Plot</h3>
              <p className="text-xs text-slate-500 font-light">
                TOPSIS Closeness Score (C<sub>i</sub><sup>*</sup>) vs. Weight on{' '}
                {CRITERIA_LABELS[CRITERIA_KEYS[selectedCritIdx]]}
              </p>
            </div>
            <Activity size={18} className="text-teal-600" />
          </div>

          {isLoadingOAT || !oatResult ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-xs">
              Calculating trajectory...
            </div>
          ) : (
            <div className="overflow-x-auto py-2">
              <svg width={svgW} height={svgH} className="w-full max-w-[600px] mx-auto overflow-visible">
                {/* Horizontal Grid lines */}
                {[0.2, 0.4, 0.6, 0.8].map((score) => {
                  const y = scaleY(score);
                  return (
                    <g key={score}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotW}
                        y2={y}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize="9"
                        fill="#94A3B8"
                        fontFamily="monospace"
                      >
                        {score.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical X-axis ticks (5%, 20%, 35%, 50%, 65%) */}
                {[0.05, 0.2, 0.35, 0.5, 0.65].map((w) => {
                  const x = scaleX(w);
                  return (
                    <g key={w}>
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={padTop + plotH}
                        stroke="#F8FAFC"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={padTop + plotH + 15}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94A3B8"
                        fontFamily="monospace"
                      >
                        {(w * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {/* Base Weight Vertical Line */}
                {targetBaseWeight >= minW && targetBaseWeight <= maxW && (
                  <g>
                    <line
                      x1={scaleX(targetBaseWeight)}
                      y1={padTop}
                      x2={scaleX(targetBaseWeight)}
                      y2={padTop + plotH}
                      stroke="#0D9488"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={scaleX(targetBaseWeight)}
                      y={padTop - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#0D9488"
                      fontWeight="600"
                    >
                      Base Weight ({(targetBaseWeight * 100).toFixed(1)}%)
                    </text>
                  </g>
                )}

                {/* Trajectory Polylines for Top Hospitals */}
                {oatHospitals.slice(0, 8).map((hName, idx) => {
                  const color = HOSPITAL_COLORS[idx % HOSPITAL_COLORS.length];
                  const points = oatResult.trajectory
                    .filter((p) => p.hospital_name === hName)
                    .map((p) => `${scaleX(p.test_weight)},${scaleY(p.closeness_score)}`)
                    .join(' ');

                  return (
                    <g key={hName}>
                      <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.85}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Trajectory Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center pt-4 border-t border-slate-100">
                {oatHospitals.slice(0, 8).map((hName, idx) => (
                  <div key={hName} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: HOSPITAL_COLORS[idx % HOSPITAL_COLORS.length] }}
                    />
                    <span>{hName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
