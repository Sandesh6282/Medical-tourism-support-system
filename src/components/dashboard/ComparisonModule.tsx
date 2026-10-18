import React, { useState } from 'react';
import { useDSS } from '@/context/DSSContext';
import { ArrowRight, Info, Check } from 'lucide-react';
import { RankedHospital } from '@/types/dss';

interface ComparisonModuleProps {
  onNavigateNext: () => void;
}

const PALETTE = ['#1D3045', '#E30A17', '#008080', '#FF9933'];

const RADAR_AXES = [
  { label: 'Procedure Cost (Inv)', key: 'p_cost' },
  { label: 'Hospital Quality', key: 'quality' },
  { label: 'Waiting Time (Inv)', key: 'wait' },
  { label: 'Travel Cost (Inv)', key: 't_cost' },
  { label: 'Language Access', key: 'lang' },
  { label: 'Post-op Support', key: 'postop' },
];

export const ComparisonModule: React.FC<ComparisonModuleProps> = ({ onNavigateNext }) => {
  const {
    rankedHospitals,
    rawHospitals,
    selectedProcedure,
    selectedProcedureId,
  } = useDSS();

  // Require at least 2 ranked hospitals matching filters for head-to-head comparison
  if (rankedHospitals.length < 2) {
    const procedureLabel = selectedProcedure?.display_label || selectedProcedure?.procedure_name || selectedProcedureId;
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <span>Module 4</span>
            <span>•</span>
            <span>Hospital Comparison & Trade-Off Analysis</span>
          </div>
          <h2 className="text-2xl font-light text-[#1D3045] tracking-tight">
            Head-to-Head Performance Evaluation: {procedureLabel}
          </h2>
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 uppercase tracking-wide text-xs bg-amber-200/80 px-2 py-0.5 rounded">
                Insufficient Candidates Filtered
              </span>
              <span className="font-semibold text-slate-800">
                At least 2 hospitals matching active feasibility filters are required for comparison
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-light leading-relaxed">
              Currently, {rankedHospitals.length} hospital(s) meet your active destination country, budget cap, or waiting time filters for <strong>{procedureLabel}</strong>. Please broaden your feasibility constraints in Module 1 (Patient Preferences) to enable multi-hospital radar and bar comparisons.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default select top 2 hospitals
  const defaultSelected =
    rankedHospitals.slice(0, 2).map((h) => h.hospital_id) || [];
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);

  // Synchronize selection when rankedHospitals updates (e.g. after procedure switching)
  React.useEffect(() => {
    if (rankedHospitals.length >= 2) {
      setSelectedIds((prev) => {
        const valid = prev.filter((id) => rankedHospitals.some((h) => h.hospital_id === id));
        if (valid.length >= 2) return valid;
        return rankedHospitals.slice(0, 2).map((h) => h.hospital_id);
      });
    }
  }, [rankedHospitals]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedHospitals: RankedHospital[] = rankedHospitals.filter((h) =>
    selectedIds.includes(h.hospital_id)
  );

  // Compute normalization bounds for radar chart safely
  const numericPCosts = rawHospitals.map((h) => h.procedure_cost_usd).filter((v): v is number => typeof v === 'number');
  const minPCost = numericPCosts.length > 0 ? Math.min(...numericPCosts) : 1;
  const numericTCosts = rawHospitals.map((h) => h.travel_accommodation_cost_usd).filter((v): v is number => typeof v === 'number');
  const minTCost = numericTCosts.length > 0 ? Math.min(...numericTCosts) : 1;
  const numericWaits = rawHospitals.map((h) => h.waiting_time_days).filter((v): v is number => typeof v === 'number');
  const minWait = numericWaits.length > 0 ? Math.min(...numericWaits) : 1;

  // Trade-off calculation for top 2 selected
  const sortedSelected = [...selectedHospitals].sort((a, b) => a.rank - b.rank);
  const bestH = sortedSelected[0];
  const secondH = sortedSelected[1];

  let pDiff = 0;
  let wDiff = 0;
  let qDiff = 0;
  let cheaperH = bestH;
  let costlierH = secondH;

  if (bestH && secondH) {
    pDiff = Math.abs(bestH.procedure_cost_usd - secondH.procedure_cost_usd);
    wDiff = Math.abs(bestH.waiting_time_days - secondH.waiting_time_days);
    qDiff = Math.abs(
      bestH.hospital_quality_score_1_to_15 - secondH.hospital_quality_score_1_to_15
    );
    cheaperH =
      bestH.procedure_cost_usd < secondH.procedure_cost_usd ? bestH : secondH;
    costlierH = cheaperH.hospital_id === bestH.hospital_id ? secondH : bestH;
  }

  // Radar chart SVG calculation
  const size = 340;
  const center = size / 2;
  const radius = center - 45;
  const angleStep = (Math.PI * 2) / RADAR_AXES.length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 4</span>
              <span>•</span>
              <span>Hospital Comparison & Trade-Off Analysis</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Head-to-Head Performance Evaluation
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Side-by-side comparative analysis of shortlisted candidate medical centers across all six criteria.
              Select 2 to 4 hospitals to inspect trade-offs and multi-axis performance polygons.
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

        {/* Hospital Selector Pills */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select 2 to 4 Hospitals for Direct Comparison:
          </div>
          <div className="flex flex-wrap gap-2">
            {rankedHospitals.map((h) => {
              const isSelected = selectedIds.includes(h.hospital_id);
              const colorIdx = selectedIds.indexOf(h.hospital_id);
              return (
                <button
                  key={h.hospital_id}
                  type="button"
                  onClick={() => handleToggle(h.hospital_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1D3045] text-white border-[#1D3045] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PALETTE[colorIdx % PALETTE.length] || '#1D3045' }}
                    />
                  )}
                  <span>{h.hospital_name}</span>
                  <span className="text-[10px] opacity-75">({h.country})</span>
                  {isSelected && <Check size={12} className="ml-0.5 text-teal-300" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Metric Table */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="font-medium text-lg text-[#1D3045]">Metric Comparison Matrix</h3>
          <p className="text-xs text-slate-500 font-light">
            Transposed head-to-head evaluation across clinical, financial, and logistical criteria
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold min-w-[180px]">Criterion / Dimension</th>
                {selectedHospitals.map((h, i) => (
                  <th key={h.hospital_id} className="py-3 px-4 font-semibold">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span>{h.hospital_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Rank #{h.rank} ({h.country})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">TOPSIS Closeness Score (Ci* ↑)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 font-mono font-bold text-teal-700">
                    {h.closeness_score.toFixed(4)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Procedure Cost (USD ↓)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 font-medium text-slate-900">
                    ${h.procedure_cost_usd.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Travel & Lodging (USD ↓)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 text-slate-700">
                    ${h.travel_accommodation_cost_usd.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50 bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-900">Total Estimated Cost (USD ↓)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 font-semibold text-slate-900">
                    ${(h.procedure_cost_usd + h.travel_accommodation_cost_usd).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Waiting Time (Days ↓)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 text-slate-700">
                    {h.waiting_time_days} days
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Hospital Quality (1 to 15 ↑)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 font-semibold text-teal-700">
                    {h.hospital_quality_score_1_to_15} / 15
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Language Accessibility (1 to 5 ↑)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 text-slate-700">
                    {h.language_accessibility_score_1_to_5} / 5
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-medium text-slate-800">Post-operative Support (1 to 5 ↑)</td>
                {selectedHospitals.map((h) => (
                  <td key={h.hospital_id} className="py-2.5 px-4 text-slate-700">
                    {h.postoperative_support_score_1_to_5} / 5
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-light flex items-start gap-2">
            <span className="font-semibold text-emerald-800 shrink-0">Demonstration Mode:</span>
            <span>
              Metrics populated from <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">FYP_hospital_dataset.csv</code> (illustrative synthetic baselines for multi-criteria software evaluation; not verified clinical contracts).
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Radar Chart & Trade-off Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Multi-Axis SVG Radar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">Multi-Criteria Radar Comparison</h3>
            <p className="text-xs text-slate-500 font-light">
              Normalized to [0, 100]. Cost and wait time are inverted so larger area denotes superior performance.
            </p>
          </div>

          <div className="flex justify-center py-4">
            <svg width={size} height={size} className="overflow-visible">
              {/* Concentric Polygons */}
              {[0.25, 0.5, 0.75, 1.0].map((level) => {
                const points = RADAR_AXES.map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = center + radius * level * Math.cos(angle);
                  const y = center + radius * level * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <polygon
                    key={level}
                    points={points}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray={level < 1 ? '3,3' : undefined}
                  />
                );
              })}

              {/* Axis Spoke Lines & Labels */}
              {RADAR_AXES.map((axis, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const endX = center + radius * Math.cos(angle);
                const endY = center + radius * Math.sin(angle);
                const labelX = center + (radius + 20) * Math.cos(angle);
                const labelY = center + (radius + 20) * Math.sin(angle);

                return (
                  <g key={axis.key}>
                    <line
                      x1={center}
                      y1={center}
                      x2={endX}
                      y2={endY}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fill="#64748B"
                      fontWeight="500"
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}

              {/* Hospital Overlay Polygons */}
              {selectedHospitals.map((h, hIdx) => {
                const color = PALETTE[hIdx % PALETTE.length];

                // Invert cost and wait time normalized to [0, 100]
                const pNorm = (minPCost / h.procedure_cost_usd) * 100;
                const qNorm = (h.hospital_quality_score_1_to_15 / 15.0) * 100;
                const wNorm = (minWait / h.waiting_time_days) * 100;
                const tNorm = (minTCost / h.travel_accommodation_cost_usd) * 100;
                const lNorm = (h.language_accessibility_score_1_to_5 / 5.0) * 100;
                const postNorm = (h.postoperative_support_score_1_to_5 / 5.0) * 100;

                const values = [pNorm, qNorm, wNorm, tNorm, lNorm, postNorm];

                const points = values
                  .map((val, i) => {
                    const normVal = Math.min(100, Math.max(0, val)) / 100;
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + radius * normVal * Math.cos(angle);
                    const y = center + radius * normVal * Math.sin(angle);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={h.hospital_id}>
                    <polygon
                      points={points}
                      fill={color}
                      fillOpacity={0.18}
                      stroke={color}
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Radar Legend */}
          <div className="flex flex-wrap justify-center gap-4 pt-2 border-t border-slate-100">
            {selectedHospitals.map((h, i) => (
              <div key={h.hospital_id} className="flex items-center gap-1.5 text-xs text-slate-700">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="font-medium">{h.hospital_name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Automated Trade-Off Insights (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="font-medium text-lg text-[#1D3045]">Automated Trade-Off Insights</h3>
              <p className="text-xs text-slate-500 font-light">
                Key clinical and economic differentials between leading alternatives
              </p>
            </div>

            {bestH && secondH && (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-light">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-semibold text-slate-800 block text-xs">
                    💰 Financial Spread:
                  </span>
                  <p>
                    <strong>{cheaperH.hospital_name}</strong> ({cheaperH.country}) provides an estimated procedure savings of{' '}
                    <strong className="text-emerald-700">${pDiff.toLocaleString()} USD</strong> relative to{' '}
                    <strong>{costlierH.hospital_name}</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-semibold text-slate-800 block text-xs">
                    ⏱️ Surgical Waiting Time Differential:
                  </span>
                  <p>
                    • {bestH.hospital_name}: <strong>{bestH.waiting_time_days} days</strong>
                    <br />
                    • {secondH.hospital_name}: <strong>{secondH.waiting_time_days} days</strong>
                    <br />
                    Spread: <strong>{wDiff} days</strong> between clinical approval and surgery.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="font-semibold text-slate-800 block text-xs">
                    🏥 Accreditation & Clinical Quality:
                  </span>
                  <p>
                    • {bestH.hospital_name}: <strong>{bestH.hospital_quality_score_1_to_15} / 15</strong>
                    <br />
                    • {secondH.hospital_name}: <strong>{secondH.hospital_quality_score_1_to_15} / 15</strong>
                    <br />
                    Rating gap: <strong>{qDiff} points</strong> on standardized composite quality score.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-900 text-xs flex items-start gap-2.5">
              <Info size={16} className="text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong>Decision Tip:</strong> If procedural budget is your primary constraint, cross-border centers in India or Türkiye deliver substantial savings. If zero travel or domestic follow-up is mandatory, US facilities provide benchmark clinical safety.
              </span>
            </div>

            {/* Next Module Step CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateNext}
                className="w-full py-3 px-4 rounded-xl bg-[#1D3045] hover:bg-[#253f5b] text-white font-medium text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Proceed to Module 5: Sensitivity Analysis</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
