import React, { useState } from 'react';
import { useDSS, PatientProfile } from '@/context/DSSContext';
import {
  Check,
  Sliders,
  Globe,
  DollarSign,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Activity,
  Info,
} from 'lucide-react';

interface PreferencesModuleProps {
  onNavigateNext: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  'Türkiye': '🇹🇷',
  Turkey: '🇹🇷',
  Thailand: '🇹🇭',
  USA: '🇺🇸',
};

const ARCHETYPES = [
  {
    name: 'Balanced',
    description: 'Harmonious weights across clinical quality, total expenditure, and waiting time.',
    badge: 'Popular',
  },
  {
    name: 'Cost-Conscious',
    description: 'Prioritizes total procedure and travel savings while satisfying baseline safety.',
    badge: 'Affordable',
  },
  {
    name: 'Quality-First',
    description: 'Heavily weights international accreditations (JCI) and post-operative follow-up.',
    badge: 'Premium',
  },
  {
    name: 'Expedited Care',
    description: 'Minimizes waiting time between diagnosis and scheduled surgery admission.',
    badge: 'Fast-Track',
  },
];

// Fallback list of 9 required knee procedures with exact labels and IDs
const KNEE_PROCEDURE_FALLBACKS = [
  { id: 'KNEE01', label: 'Knee replacement' },
  { id: 'KNEE02', label: 'Total knee replacement (TKR) with OMNI' },
  { id: 'KNEE03', label: 'Knee MAKoplasty' },
  { id: 'KNEE04', label: 'Total Knee Replacement (Arthroplasty)' },
  { id: 'KNEE05', label: 'Robotic knee replacement surgery' },
  { id: 'KNEE06', label: 'Knee arthroplastic' },
  { id: 'KNEE07', label: 'Unilateral knee arthroplasty' },
  { id: 'KNEE08', label: 'Unicompartmental (partial) knee replacement' },
  { id: 'KNEE09', label: 'Revision knee arthroplasty' },
];

export const PreferencesModule: React.FC<PreferencesModuleProps> = ({ onNavigateNext }) => {
  const {
    profile,
    rawHospitals,
    procedures,
    selectedProcedureId,
    selectedProcedure,
    setSelectedProcedureId,
    saveProfileAndRecalculate,
    isCalculating,
  } = useDSS();

  const [countries, setCountries] = useState<string[]>(profile.countries);
  const [maxBudget, setMaxBudget] = useState<number>(profile.max_budget);
  const [maxWait, setMaxWait] = useState<number>(profile.max_waiting_time);
  const [minQuality, setMinQuality] = useState<number>(profile.min_quality);
  const [archetype, setArchetype] = useState<string>(profile.archetype);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const isDemonstration = true;

  // Toggle country selection
  const handleToggleCountry = (country: string) => {
    if (countries.includes(country)) {
      if (countries.length > 1) {
        setCountries(countries.filter((c) => c !== country));
      }
    } else {
      setCountries([...countries, country]);
    }
  };

  // Switch procedure in central state
  const handleProcedureChange = async (procId: string) => {
    await setSelectedProcedureId(procId);
  };

  // Live filter matching candidates
  const matchingHospitals = rawHospitals.filter((h) => {
    if (!countries.includes(h.country)) return false;
    const pCost = h.procedure_cost_usd ?? 0;
    const tCost = h.travel_accommodation_cost_usd ?? 0;
    const totalCost = pCost + tCost;
    if (totalCost > maxBudget) return false;
    if ((h.waiting_time_days ?? 0) > maxWait) return false;
    if ((h.hospital_quality_score_1_to_15 ?? 0) < minQuality) return false;
    return true;
  });

  const handleSave = async () => {
    const newProfile: PatientProfile = {
      countries,
      max_budget: maxBudget,
      max_waiting_time: maxWait,
      min_quality: minQuality,
      archetype,
      procedure_id: selectedProcedureId,
    };
    await saveProfileAndRecalculate(newProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 1</span>
              <span>•</span>
              <span>Patient Preferences & Clinical Profile</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Clinical & Logistical Boundaries
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Select your specific surgical procedure, destination countries, budgetary caps, wait tolerance, and priority archetypes.
              The model filters unfeasible institutions before calculating multi-criteria proximity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isDemonstration
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isDemonstration ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              Target: {selectedProcedure?.display_label || 'Knee Replacement'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left inputs, Right Live Feasibility Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Procedure, Constraints & Archetype (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Knee Procedure Selection Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1D3045] font-medium text-base">
                <Activity size={18} className="text-teal-600" />
                <span>Target Knee Procedure</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isDemonstration
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isDemonstration ? 'Synthetic Demonstration Data' : 'Data Unverified (Unknown)'}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-light">
              Select one of the nine standardized knee procedure categories to filter data availability and ranking eligibility:
            </p>

            {/* Dropdown with exact nine requested labels */}
            <div className="relative">
              <select
                id="procedure-selector"
                value={selectedProcedureId}
                onChange={(e) => handleProcedureChange(e.target.value)}
                disabled={isCalculating}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-[#1D3045] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {procedures.length > 0
                  ? procedures.map((p) => (
                      <option key={p.procedure_id} value={p.procedure_id}>
                        {p.display_label || p.procedure_name}
                      </option>
                    ))
                  : KNEE_PROCEDURE_FALLBACKS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
              </select>
            </div>

            {/* Procedure Metadata & Status Display */}
            {selectedProcedure && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                  isDemonstration
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-sm">
                    {selectedProcedure.display_label}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-white/90 border border-current font-medium">
                      ID: {selectedProcedure.procedure_id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/90 border border-current font-medium">
                      Status: {selectedProcedure.terminology_status}
                    </span>
                  </div>
                </div>

                <p className="font-light leading-relaxed">
                  {selectedProcedure.definition_notes}
                </p>

                <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-800 flex items-start gap-2">
                  <Info size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    <strong>Academic Demonstration Mode (Active):</strong> Powered by complete procedure-specific six-criterion simulation data (from <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">hospital_procedure_data.csv</code>). Values are synthetic demonstration baselines engineered for multi-criteria AHP-TOPSIS software evaluation — not verified clinical quotations, measured wait times, or medical advice.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Destination Countries */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#1D3045] font-medium text-base">
              <Globe size={18} className="text-teal-600" />
              <span>Destination Countries</span>
            </div>
            <p className="text-xs text-slate-500 font-light">
              Select international destinations to include in your multi-criteria evaluation (minimum 1 required).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {['India', 'Türkiye', 'Thailand', 'USA'].map((c) => {
                const isSelected = countries.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleToggleCountry(c)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#1D3045] text-white border-[#1D3045] shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{COUNTRY_FLAGS[c]}</span>
                      <span>{c}</span>
                    </span>
                    {isSelected && <Check size={14} className="text-teal-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Quantitative Threshold Sliders */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1D3045] font-medium text-base">
                <Sliders size={18} className="text-teal-600" />
                <span>Feasibility Thresholds</span>
              </div>
              {!isDemonstration && (
                <span className="text-[11px] text-slate-400 italic">
                  (Applied when numerical criteria are available)
                </span>
              )}
            </div>

            {/* Budget Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <DollarSign size={16} className="text-slate-400" />
                  Maximum Total Budget
                </span>
                <span className="font-semibold text-[#1D3045] bg-slate-100 px-2.5 py-0.5 rounded-md">
                  ${maxBudget.toLocaleString()} USD
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={50000}
                step={1000}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>$5,000 (Low-Cost)</span>
                <span>$50,000 (Domestic US Cap)</span>
              </div>
            </div>

            {/* Waiting Time Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Clock size={16} className="text-slate-400" />
                  Maximum Waiting Time
                </span>
                <span className="font-semibold text-[#1D3045] bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {maxWait} Days
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={maxWait}
                onChange={(e) => setMaxWait(Number(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1 Day (Immediate)</span>
                <span>20 Days (Standard elective window)</span>
              </div>
            </div>

            {/* Minimum Quality Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ShieldCheck size={16} className="text-slate-400" />
                  Minimum Quality Score
                </span>
                <span className="font-semibold text-[#1D3045] bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {minQuality} / 15
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={minQuality}
                onChange={(e) => setMinQuality(Number(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1 (Baseline national licensure)</span>
                <span>15 (Gold-standard JCI & orthopedic volume)</span>
              </div>
            </div>
          </div>

          {/* 4. Priority Archetypes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#1D3045] font-medium text-base">
              <Sparkles size={18} className="text-teal-600" />
              <span>Decision Priority Archetype Preset</span>
            </div>
            <p className="text-xs text-slate-500 font-light">
              Selecting an archetype pre-configures the pairwise AHP matrix in Module 2.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ARCHETYPES.map((arch) => {
                const isActive = archetype === arch.name;
                return (
                  <div
                    key={arch.name}
                    onClick={() => setArchetype(arch.name)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? 'bg-teal-50/80 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-[#1D3045]">{arch.name}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {arch.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-light leading-relaxed">{arch.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isCalculating}
              className="flex-1 py-3 px-6 rounded-xl bg-[#1D3045] hover:bg-[#253f5b] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <span>Recalculating Decision Model...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Profile & Update Decision Model</span>
                </>
              )}
            </button>
            {saveSuccess && (
              <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 animate-fadeIn">
                ✓ Preferences updated!
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Live Matching Alternatives Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-base text-[#1D3045]">Matching Candidate Hospitals</h3>
                <p className="text-xs text-slate-500 font-light">
                  {isDemonstration ? 'Real-time feasibility filter results' : 'Candidate hospitals from hospitals.csv'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-light text-[#1D3045]">
                  {matchingHospitals.length}
                </span>
                <span className="text-xs text-slate-400 block font-light">
                  of {rawHospitals.length} alternatives
                </span>
              </div>
            </div>

            {/* Feasibility Alert */}
            {matchingHospitals.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                ⚠️ No hospitals match these strict constraints. Consider increasing budget cap, waiting time, or quality threshold.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  <strong>{matchingHospitals.length} candidate hospitals</strong> satisfy all budgetary and clinical criteria.
                </span>
              </div>
            )}

            {/* Scrollable Mini Table */}
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Hospital</th>
                    <th className="py-2.5 px-2">Country</th>
                    <th className="py-2.5 px-2 text-right" title="Procedure Cost in USD (lower is better)">
                      Cost (USD ↓)
                    </th>
                    <th className="py-2.5 px-2 text-right" title="Travel & Accommodation Cost in USD (lower is better)">
                      Travel ($ ↓)
                    </th>
                    <th className="py-2.5 px-2 text-right" title="Waiting Time in Days (lower is better)">
                      Wait (d ↓)
                    </th>
                    <th className="py-2.5 px-2 text-right" title="Hospital Quality Score 1-15 (higher is better)">
                      Qual (↑)
                    </th>
                    <th className="py-2.5 px-2 text-right" title="Language Accessibility Score 1-5 (higher is better)">
                      Lang (↑)
                    </th>
                    <th className="py-2.5 px-2 text-right" title="Post-operative Support Score 1-5 (higher is better)">
                      Post-Op (↑)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {matchingHospitals.map((h) => {
                    const hasPCost = h.procedure_cost_usd !== null && h.procedure_cost_usd !== undefined;
                    const hasTCost = h.travel_accommodation_cost_usd !== null && h.travel_accommodation_cost_usd !== undefined;
                    const hasWait = h.waiting_time_days !== null && h.waiting_time_days !== undefined;
                    const hasQuality = h.hospital_quality_score_1_to_15 !== null && h.hospital_quality_score_1_to_15 !== undefined;
                    const hasLang = h.language_accessibility_score_1_to_5 !== null && h.language_accessibility_score_1_to_5 !== undefined;
                    const hasPostOp = h.postoperative_support_score_1_to_5 !== null && h.postoperative_support_score_1_to_5 !== undefined;

                    return (
                      <tr key={h.hospital_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <div>{h.hospital_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {h.city_or_region} • {h.hospital_id}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                          {COUNTRY_FLAGS[h.country] || '🏥'} {h.country}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium text-slate-900">
                          {hasPCost ? (
                            `$${h.procedure_cost_usd?.toLocaleString()}`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic" title="Missing data; not $0">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium text-slate-900">
                          {hasTCost ? (
                            `$${h.travel_accommodation_cost_usd?.toLocaleString()}`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic" title="Missing data; not $0">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-600">
                          {hasWait ? (
                            `${h.waiting_time_days}d`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic" title="Missing data; not 0 days">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-teal-700 font-semibold">
                          {hasQuality ? (
                            `${h.hospital_quality_score_1_to_15}/15`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic font-normal" title="Missing data; not 0/15">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-700">
                          {hasLang ? (
                            `${h.language_accessibility_score_1_to_5}/5`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic font-normal">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-700">
                          {hasPostOp ? (
                            `${h.postoperative_support_score_1_to_5}/5`
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic font-normal">
                              UNKNOWN
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dataset Origin Footnote */}
            <div className="text-[11px] font-light leading-relaxed px-1">
              {isDemonstration ? (
                <div className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-emerald-800">Demonstration Dataset:</span> Ingested from <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">FYP_hospital_dataset.csv</code> (illustrative synthetic baseline values; not verified hospital prices or clinical recommendations).
                </div>
              ) : (
                <div className="text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200">
                  <span className="font-semibold text-amber-900">Procedure Catalog:</span> Hospital records joined from <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-amber-200">hospitals.csv</code> and <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-amber-200">hospital_procedure_data.csv</code>. Specific clinical criteria values are UNKNOWN (blanks are not zero, and not mixed with synthetic data).
                </div>
              )}
            </div>

            {/* Next Module Step CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateNext}
                className="w-full py-3 px-4 rounded-xl border border-teal-600 text-teal-800 hover:bg-teal-50 font-medium text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Module 2: Criteria Weights (AHP)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

