import React, { useState } from 'react';
import { useDSS } from '@/context/DSSContext';
import { CheckCircle2, AlertTriangle, ArrowRight, Table as TableIcon, Info } from 'lucide-react';

interface AHPWeightsModuleProps {
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

const SAATY_SCALE_DESCRIPTIONS: Record<number, string> = {
  1: 'Equal Importance',
  2: 'Weak / Slight',
  3: 'Moderate Importance',
  4: 'Moderate Plus',
  5: 'Strong Importance',
  6: 'Strong Plus',
  7: 'Very Strong / Demonstrated',
  8: 'Very, Very Strong',
  9: 'Extreme / Absolute Importance',
};

// Generate 15 distinct pairs (i < j)
const PAIRS: { idx: number; i: number; j: number }[] = [];
let pairIdx = 0;
for (let i = 0; i < 6; i++) {
  for (let j = i + 1; j < 6; j++) {
    PAIRS.push({ idx: pairIdx++, i, j });
  }
}

export const AHPWeightsModule: React.FC<AHPWeightsModuleProps> = ({ onNavigateNext }) => {
  const {
    ahpMatrix,
    ahpResult,
    activeArchetype,
    applyPreset,
    updatePairwiseValue,
    isCalculating,
    selectedProcedure,
    selectedProcedureId,
  } = useDSS();

  const [activeTab, setActiveTab] = useState<'cost' | 'quality' | 'support'>('cost');
  const [showMatrixTable, setShowMatrixTable] = useState<boolean>(false);

  const cr = ahpResult?.cr ?? 0.0116;
  const crPercent = (cr * 100).toFixed(2);
  const isConsistent = ahpResult?.is_consistent ?? true;
  const lambdaMax = ahpResult?.lambda_max?.toFixed(4) ?? '6.0719';
  const ci = ahpResult?.ci?.toFixed(4) ?? '0.0144';
  const weights = ahpResult?.weights ?? [0.243, 0.377, 0.15, 0.088, 0.054, 0.088];

  // Group pairs for tabbed navigation
  const costPairs = PAIRS.slice(0, 8); // Pairs 1-8
  const qualityPairs = PAIRS.slice(8, 12); // Pairs 9-12
  const otherPairs = PAIRS.slice(12, 15); // Pairs 13-15

  const currentTabPairs =
    activeTab === 'cost' ? costPairs : activeTab === 'quality' ? qualityPairs : otherPairs;

  const procLabel = selectedProcedure?.display_label || selectedProcedure?.procedure_name || selectedProcedureId;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 2</span>
              <span>•</span>
              <span>Criteria Weight Determination (AHP)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Pairwise Judgments & Eigenvector Derivation
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Calibrate relative importance using Thomas L. Saaty's 1–9 fundamental scale.
              The system calculates the principal eigenvector and verifies consistency (CR &lt; 0.10).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Active Profile:</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                {activeArchetype}
              </span>
            </div>
            {selectedProcedure && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Target:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                  {selectedProcedureId}: {procLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Synthetic Demonstration Mode:</strong> Calibrating criteria weights for <strong>{procLabel}</strong> ({selectedProcedureId}). Rankings are evaluated across all 16 candidate hospitals using procedure-specific simulation data. Hospital figures are illustrative and are not verified hospital quotes or clinical recommendations.
            </span>
          </div>
        </div>

        {/* Quick Presets Row */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Quick Decision Presets:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Illustrative Defaults', key: 'Illustrative Defaults' },
              { label: 'Cost-Conscious', key: 'Cost-Conscious' },
              { label: 'Quality-First', key: 'Quality-First' },
              { label: 'Expedited Care', key: 'Expedited Care' },
              { label: 'Equal Weights (1.0)', key: 'Equal Weights' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                disabled={isCalculating}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeArchetype === p.key
                    ? 'bg-[#1D3045] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Pairwise Sliders Left (7 cols), Derived Weights & Consistency Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 15 Comparisons (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-medium text-base text-[#1D3045]">Pairwise Comparison Matrix</h3>
                <p className="text-xs text-slate-500 font-light">
                  Compare pairs of criteria to establish their relative importance
                </p>
              </div>

              {/* Pair Group Tabs */}
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('cost')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activeTab === 'cost' ? 'bg-white shadow-sm text-[#1D3045]' : 'text-slate-600'
                  }`}
                >
                  Cost (1–8)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quality')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activeTab === 'quality' ? 'bg-white shadow-sm text-[#1D3045]' : 'text-slate-600'
                  }`}
                >
                  Quality (9–12)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activeTab === 'support' ? 'bg-white shadow-sm text-[#1D3045]' : 'text-slate-600'
                  }`}
                >
                  Access (13–15)
                </button>
              </div>
            </div>

            {/* Comparison Cards for Active Tab */}
            <div className="space-y-4">
              {currentTabPairs.map(({ idx, i, j }) => {
                const critA = CRITERIA_LABELS[CRITERIA_KEYS[i]];
                const critB = CRITERIA_LABELS[CRITERIA_KEYS[j]];
                const matrixVal = ahpMatrix?.[i]?.[j] ?? 1.0;

                // Determine preference and intensity
                let preferred: 'A' | 'Equal' | 'B' = 'Equal';
                let intensity = 1;

                if (Math.abs(matrixVal - 1.0) < 0.001) {
                  preferred = 'Equal';
                  intensity = 1;
                } else if (matrixVal > 1.0) {
                  preferred = 'A';
                  intensity = Math.round(matrixVal);
                } else {
                  preferred = 'B';
                  intensity = Math.round(1.0 / matrixVal);
                }

                intensity = Math.max(1, Math.min(9, intensity));

                const handlePrefChange = (newPref: 'A' | 'Equal' | 'B') => {
                  if (newPref === 'Equal') {
                    updatePairwiseValue(i, j, 1.0);
                  } else if (newPref === 'A') {
                    updatePairwiseValue(i, j, intensity > 1 ? intensity : 2);
                  } else {
                    updatePairwiseValue(i, j, 1.0 / (intensity > 1 ? intensity : 2));
                  }
                };

                const handleIntensityChange = (newIntensity: number) => {
                  if (preferred === 'Equal') return;
                  if (preferred === 'A') {
                    updatePairwiseValue(i, j, newIntensity);
                  } else {
                    updatePairwiseValue(i, j, 1.0 / newIntensity);
                  }
                };

                return (
                  <div
                    key={`pair-${i}-${j}`}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider">
                        Comparison {idx + 1}
                      </span>
                      <span className="text-slate-400 font-light">
                        {preferred === 'Equal'
                          ? 'Equal Importance (1.0)'
                          : `${preferred === 'A' ? critA : critB} is ${intensity}× more important`}
                      </span>
                    </div>

                    {/* Radio Selector: A, Equal, B */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handlePrefChange('A')}
                        className={`p-2 rounded-lg border text-center font-medium transition-all ${
                          preferred === 'A'
                            ? 'bg-[#1D3045] text-white border-[#1D3045] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {critA}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrefChange('Equal')}
                        className={`p-2 rounded-lg border text-center font-medium transition-all ${
                          preferred === 'Equal'
                            ? 'bg-[#1D3045] text-white border-[#1D3045] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Equal Importance
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrefChange('B')}
                        className={`p-2 rounded-lg border text-center font-medium transition-all ${
                          preferred === 'B'
                            ? 'bg-[#1D3045] text-white border-[#1D3045] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {critB}
                      </button>
                    </div>

                    {/* Intensity Slider (disabled if equal) */}
                    {preferred !== 'Equal' && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Intensity: <strong>{intensity}</strong> — {SAATY_SCALE_DESCRIPTIONS[intensity]}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={9}
                          step={1}
                          value={intensity}
                          onChange={(e) => handleIntensityChange(Number(e.target.value))}
                          className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1 (Equal)</span>
                          <span>3 (Moderate)</span>
                          <span>5 (Strong)</span>
                          <span>7 (Very Strong)</span>
                          <span>9 (Extreme)</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Weights & Consistency Ratio (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Consistency Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isConsistent
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isConsistent ? (
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  {isConsistent
                    ? `Consistent Judgments (CR = ${crPercent}% < 10%)`
                    : `Inconsistency Warning (CR = ${crPercent}% ≥ 10%)`}
                </div>
                <p className="text-xs opacity-90 font-light leading-relaxed">
                  {isConsistent
                    ? `The pairwise comparison matrix satisfies Saaty's transitivity rule. The derived weights represent mathematically rigorous priorities.`
                    : `Judgments exhibit circular or conflicting logic. Consider easing extreme ratings (7–9) to restore transitivity.`}
                </p>
                <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 font-mono">
                  <span>λ_max = {lambdaMax}</span>
                  <span>CI = {ci}</span>
                  <span>RI = 1.24 (n=6)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Derived Criteria Weights Table & Visual Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="font-medium text-base text-[#1D3045]">Derived Priority Weights</h3>
              <p className="text-xs text-slate-500 font-light">
                Principal eigenvector normalized to Σw = 1.000
              </p>
            </div>

            {/* Horizontal Bar Visualizer */}
            <div className="space-y-3">
              {CRITERIA_KEYS.map((key, idx) => {
                const label = CRITERIA_LABELS[key];
                const weightVal = weights[idx] ?? 0;
                const pct = (weightVal * 100).toFixed(1);
                const widthPct = Math.min(100, (weightVal / 0.5) * 100);

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="font-mono font-semibold text-[#1D3045]">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-gradient-to-r from-teal-600 to-[#1D3045] rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toggle Full Comparison Matrix */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMatrixTable(!showMatrixTable)}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 transition-colors"
              >
                <TableIcon size={14} />
                <span>{showMatrixTable ? 'Hide' : 'View'} Full 6×6 Reciprocal Matrix (A)</span>
              </button>

              {showMatrixTable && ahpMatrix.length === 6 && (
                <div className="mt-3 overflow-x-auto text-[10px] font-mono border border-slate-200 rounded-lg">
                  <table className="w-full text-center">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-1.5 text-left">Crit</th>
                        <th className="p-1.5">C1</th>
                        <th className="p-1.5">C2</th>
                        <th className="p-1.5">C3</th>
                        <th className="p-1.5">C4</th>
                        <th className="p-1.5">C5</th>
                        <th className="p-1.5">C6</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ahpMatrix.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="p-1.5 text-left font-semibold text-slate-700">
                            C{rIdx + 1}
                          </td>
                          {row.map((val, cIdx) => (
                            <td
                              key={cIdx}
                              className={`p-1.5 ${
                                rIdx === cIdx ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-600'
                              }`}
                            >
                              {val < 1 ? `1/${Math.round(1 / val)}` : val.toFixed(1)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Navigation Next Step CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateNext}
                className="w-full py-3 px-4 rounded-xl bg-[#1D3045] hover:bg-[#253f5b] text-white font-medium text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Execute TOPSIS & View Hospital Rankings</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
