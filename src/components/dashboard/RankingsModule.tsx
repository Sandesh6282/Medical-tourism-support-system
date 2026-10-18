import React, { useState } from 'react';
import { useDSS } from '@/context/DSSContext';
import {
  Download,
  AlertTriangle,
  Award,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

interface RankingsModuleProps {
  onNavigateCompare: () => void;
  onNavigateSensitivity: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  'Türkiye': '🇹🇷',
  Turkey: '🇹🇷',
  Thailand: '🇹🇭',
  USA: '🇺🇸',
};

const COUNTRY_COLORS: Record<string, string> = {
  India: '#FF9933',
  'Türkiye': '#E30A17',
  Turkey: '#E30A17',
  Thailand: '#00247D',
  USA: '#3C3B6E',
};

export const RankingsModule: React.FC<RankingsModuleProps> = ({
  onNavigateCompare,
  onNavigateSensitivity,
}) => {
  const {
    rankedHospitals,
    rawHospitals,
    rankingResult,
    selectedProcedure,
    selectedProcedureId,
    setSelectedProcedureId,
    profile,
    setProfile,
    refreshRankings,
    isCalculating,
  } = useDSS();

  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Quick filter states
  const [filterBudget, setFilterBudget] = useState<number>(profile.max_budget);
  const [filterWait, setFilterWait] = useState<number>(profile.max_waiting_time);
  const [filterQuality, setFilterQuality] = useState<number>(profile.min_quality);
  const selectedCountries = profile.countries;

  const handleApplyQuickFilter = async () => {
    const updated = {
      ...profile,
      countries: selectedCountries,
      max_budget: filterBudget,
      max_waiting_time: filterWait,
      min_quality: filterQuality,
    };
    setProfile(updated);
    await refreshRankings(undefined, updated);
  };

  // If procedure data is insufficient for ranking, show data availability report
  if (rankingResult?.eligible === false) {
    const procedureLabel = selectedProcedure?.display_label || selectedProcedure?.procedure_name || selectedProcedureId;
    const countryHospitals = rawHospitals.filter((h) => profile.countries.includes(h.country));

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Notice of Data Insufficiency or Technique Category */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-4 shadow-sm">
          <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-1" />
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 uppercase tracking-wide text-xs bg-amber-200/80 px-2 py-0.5 rounded">
                Ranking Withheld
              </span>
              <span className="font-semibold text-slate-800">
                {selectedProcedure?.is_technique
                  ? `Technique Category: ${procedureLabel} (${selectedProcedureId})`
                  : `Insufficient Verified Criteria for ${procedureLabel} (${selectedProcedureId})`}
              </span>
            </div>
            {selectedProcedure?.is_technique ? (
              <p className="text-slate-700 font-light leading-relaxed">
                <strong>Technique Classification:</strong> {selectedProcedure.technique_guidance || `${procedureLabel} is an enabling surgical technology modality rather than an independent anatomical procedure. Complete hospital cost packages and wait times are tracked under full procedure categories.`}
              </p>
            ) : (
              <p className="text-slate-700 font-light leading-relaxed">
                The Technique for Order Preference by Similarity to Ideal Solution (TOPSIS) requires complete, defensible quantitative metrics across all active criteria (procedure cost, quality scores, waiting times, and post-op care).
              </p>
            )}
            <div className="p-3 bg-white/70 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-medium">Data Integrity Guarantees:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Blanks in <code>hospital_procedure_data.csv</code> are preserved as <code>UNKNOWN</code>, never converted to $0 or 0 days waiting time.</li>
                <li>Unknown clinical availability is not assumed to be confirmed availability.</li>
                <li>Generic synthetic demonstration values from <code>FYP_hospital_dataset.csv</code> are strictly isolated and never copied into specialized procedure options.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 3</span>
              <span>•</span>
              <span>Hospital Availability & Data Status</span>
            </div>
            <h2 className="text-2xl font-light text-[#1D3045] tracking-tight">
              Hospital Records for {procedureLabel}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-light mt-1">
              Showing dataset records ingested from <code>hospitals.csv</code> and <code>hospital_procedure_data.csv</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedProcedureId('KNEE01')}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Switch to Knee Replacement (KNEE01) Demo</span>
          </button>
        </div>

        {/* Hospital Data Status Table */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-medium text-sm text-[#1D3045]">
              Hospital Data Catalog ({countryHospitals.length} centers in selected countries)
            </h3>
            <span className="text-xs text-slate-500 font-light">Status: Pending Verification</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-4">Hospital Name</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3 text-center">Procedure Availability</th>
                  <th className="py-2.5 px-3 text-center">Cost (USD ↓)</th>
                  <th className="py-2.5 px-3 text-center">Wait Time (days ↓)</th>
                  <th className="py-2.5 px-3 text-center">Quality Score (1-15 ↑)</th>
                  <th className="py-2.5 px-3 text-center">Data Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {countryHospitals.map((h) => (
                  <tr key={h.hospital_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{h.hospital_id}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{h.hospital_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="mr-1">{COUNTRY_FLAGS[h.country]}</span>
                      {h.country}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{h.city || '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {h.procedure_available ?? 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] italic">
                      {h.procedure_cost_usd !== null && h.procedure_cost_usd !== undefined ? `$${h.procedure_cost_usd.toLocaleString()}` : 'UNKNOWN'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] italic">
                      {h.waiting_time_days !== null && h.waiting_time_days !== undefined ? `${h.waiting_time_days}d` : 'UNKNOWN'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] italic">
                      {h.hospital_quality_score_1_to_15 !== null && h.hospital_quality_score_1_to_15 !== undefined ? `${h.hospital_quality_score_1_to_15}/15` : 'UNKNOWN'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        {h.data_status || 'PENDING_AUDIT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const topOverall = rankedHospitals[0];

  // Group top in each country
  const countryTopMap: Record<string, typeof topOverall> = {};
  rankedHospitals.forEach((h) => {
    if (!countryTopMap[h.country]) {
      countryTopMap[h.country] = h;
    }
  });

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Rank',
      'Hospital Name',
      'Country',
      'Closeness Score (Ci*)',
      'Procedure Cost ($)',
      'Travel Cost ($)',
      'Total Cost ($)',
      'Waiting Time (Days)',
      'Quality Score (1-15)',
      'Language Score (1-5)',
      'Post-op Score (1-5)',
      'Distance Ideal (S+)',
      'Distance Anti-Ideal (S-)',
    ];

    const rows = rankedHospitals.map((h) => [
      h.rank,
      `"${h.hospital_name}"`,
      h.country,
      h.closeness_score.toFixed(4),
      h.procedure_cost_usd,
      h.travel_accommodation_cost_usd,
      h.procedure_cost_usd + h.travel_accommodation_cost_usd,
      h.waiting_time_days,
      h.hospital_quality_score_1_to_15,
      h.language_accessibility_score_1_to_5,
      h.postoperative_support_score_1_to_5,
      h.s_plus.toFixed(4),
      h.s_minus.toFixed(4),
    ]);

    const disclaimer =
      '# DISCLAIMER: Results are based on synthetic demonstration data for academic AHP-TOPSIS evaluation. Hospital-specific prices, waiting times, and scores have not been independently verified. Rankings are illustrative and are not medical advice or verified hospital recommendations.\n';
    const csvContent = disclaimer + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'FYP_hospital_rankings_topsis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Prominent Mandatory Synthetic Data Disclaimer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3 shadow-sm">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <strong className="font-semibold block mb-0.5">SYNTHETIC DEMONSTRATION MODE NOTICE:</strong>
          <span>
            Results are based on synthetic demonstration data for academic AHP-TOPSIS evaluation. Hospital-specific prices, waiting times, and scores have not been independently verified. Rankings are illustrative and are not medical advice or verified hospital recommendations.
          </span>
        </div>
      </div>

      {/* Header and Quick Filters Toggle */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 3</span>
              <span>•</span>
              <span>Hospital Rankings (TOPSIS)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Relative Closeness Leaderboard (C<sub>i</sub><sup>*</sup>)
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Evaluation of candidate medical centers across India, Türkiye, Thailand, and the USA based on vector-normalized
              separation from Positive (A<sup>+</sup>) and Negative (A<sup>-</sup>) Ideal Solutions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <SlidersHorizontal size={14} />
              <span>{showFilters ? 'Hide' : 'Adjust'} Filter Constraints</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Collapsible Quick Filters Drawer */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Total Budget: ${filterBudget.toLocaleString()}
              </label>
              <input
                type="range"
                min={5000}
                max={50000}
                step={1000}
                value={filterBudget}
                onChange={(e) => setFilterBudget(Number(e.target.value))}
                className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Waiting Time: {filterWait} Days
              </label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={filterWait}
                onChange={(e) => setFilterWait(Number(e.target.value))}
                className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Min Quality: {filterQuality} / 15
              </label>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={filterQuality}
                onChange={(e) => setFilterQuality(Number(e.target.value))}
                className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleApplyQuickFilter}
                disabled={isCalculating}
                className="w-full py-2 px-3 rounded-lg bg-[#1D3045] hover:bg-[#253f5b] text-white text-xs font-medium transition-all shadow-xs"
              >
                {isCalculating ? 'Updating...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Performer Spotlight Card */}
      {topOverall && (
        <div className="bg-gradient-to-br from-[#1D3045] via-[#243d57] to-[#142333] rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Award size={26} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-teal-300 font-semibold">
                  🥇 Overall Optimal Recommendation
                </div>
                <h3 className="text-xl sm:text-2xl font-light tracking-tight mt-0.5">
                  {topOverall.hospital_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{COUNTRY_FLAGS[topOverall.country]}</span>
              <span className="text-sm font-medium tracking-wide">{topOverall.country}</span>
              <span className="ml-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-mono font-semibold border border-teal-500/30">
                C<sub>i</sub><sup>*</sup> = {topOverall.closeness_score.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-white/60 block uppercase">Procedure Cost</span>
              <span className="text-lg sm:text-xl font-medium mt-0.5 block">
                ${topOverall.procedure_cost_usd.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-white/60 block uppercase">Travel & Lodging</span>
              <span className="text-lg sm:text-xl font-medium mt-0.5 block">
                ${topOverall.travel_accommodation_cost_usd.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-white/60 block uppercase">Quality Rating</span>
              <span className="text-lg sm:text-xl font-medium mt-0.5 block text-teal-300">
                {topOverall.hospital_quality_score_1_to_15} / 15
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-white/60 block uppercase">Waiting Time</span>
              <span className="text-lg sm:text-xl font-medium mt-0.5 block">
                {topOverall.waiting_time_days} Days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Hospital per Destination Country Spotlight */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          🌍 Top Performer by Destination Country
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['India', 'Türkiye', 'Thailand', 'USA'].map((c) => {
            const h = countryTopMap[c];
            if (!h) return null;
            return (
              <div
                key={c}
                className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span>{COUNTRY_FLAGS[c]}</span>
                    <span>{c}</span>
                  </span>
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    Rank #{h.rank}
                  </span>
                </div>
                <div className="font-medium text-sm text-[#1D3045] truncate" title={h.hospital_name}>
                  {h.hospital_name}
                </div>
                <div className="text-xs text-slate-500 flex justify-between pt-1 border-t border-slate-100 font-light">
                  <span>Score: {h.closeness_score.toFixed(3)}</span>
                  <span>${(h.procedure_cost_usd + h.travel_accommodation_cost_usd).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table / Chart Tabs */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">Candidate Evaluation Leaderboard</h3>
            <p className="text-xs text-slate-500 font-light">
              Ranked in descending order of Relative Closeness Coefficient (C<sub>i</sub><sup>*</sup>)
            </p>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'table' ? 'bg-white shadow-sm text-[#1D3045]' : 'text-slate-600'
              }`}
            >
              Detailed Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'chart' ? 'bg-white shadow-sm text-[#1D3045]' : 'text-slate-600'
              }`}
            >
              Closeness Score Chart
            </button>
          </div>
        </div>

        {/* Tab 1: Detailed Table */}
        {activeTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-4">Hospital Name</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-4 min-w-[140px]">Closeness (C<sub>i</sub><sup>*</sup> ↑)</th>
                  <th className="py-3 px-3 text-right">Procedure (USD ↓)</th>
                  <th className="py-3 px-3 text-right">Travel (USD ↓)</th>
                  <th className="py-3 px-3 text-right">Total Est. (USD ↓)</th>
                  <th className="py-3 px-3 text-center">Wait (days ↓)</th>
                  <th className="py-3 px-3 text-center">Quality (1-15 ↑)</th>
                  <th className="py-3 px-3 text-center">Lang (1-5 ↑)</th>
                  <th className="py-3 px-3 text-center">Post-Op (1-5 ↑)</th>
                  <th className="py-3 px-3 text-right">S<sup>+</sup> (dist. ↓)</th>
                  <th className="py-3 px-3 text-right">S<sup>-</sup> (dist. ↑)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {rankedHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-light text-sm">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="font-medium text-slate-700">No candidate hospitals match active feasibility filters.</p>
                        <p className="text-xs text-slate-500">
                          Please broaden your budget cap, waiting time threshold, minimum quality rating, or destination country selections.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rankedHospitals.map((h) => {
                    const totalCost = h.procedure_cost_usd + h.travel_accommodation_cost_usd;
                    const isTop3 = h.rank <= 3;
                    return (
                      <tr
                        key={h.hospital_id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          h.rank === 1 ? 'bg-teal-50/30' : ''
                        }`}
                      >
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            h.rank === 1
                              ? 'bg-amber-100 text-amber-800 font-extrabold'
                              : isTop3
                              ? 'bg-teal-100 text-teal-800'
                              : 'text-slate-500'
                          }`}
                        >
                          #{h.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {h.hospital_name}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <span className="mr-1">{COUNTRY_FLAGS[h.country]}</span>
                        <span>{h.country}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 w-12">
                            {h.closeness_score.toFixed(4)}
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                            <div
                              style={{ width: `${h.closeness_score * 100}%` }}
                              className="h-full bg-teal-600 rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        ${h.procedure_cost_usd.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ${h.travel_accommodation_cost_usd.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#1D3045]">
                        ${totalCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {h.waiting_time_days}d
                      </td>
                      <td className="py-3 px-3 text-center text-teal-700 font-semibold">
                        {h.hospital_quality_score_1_to_15}/15
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {h.language_accessibility_score_1_to_5}/5
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {h.postoperative_support_score_1_to_5}/5
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                        {h.s_plus.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                        {h.s_minus.toFixed(3)}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-light flex items-start gap-2">
              <span className="font-semibold text-emerald-800 shrink-0">Academic Demonstration Mode:</span>
              <span>
                Calculated using procedure-specific six-criterion simulation data from <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">hospital_procedure_data.csv</code>. Synthetic baseline values are provided for decision support modeling demonstration; not verified hospital clinical records or personalized clinical recommendations.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Horizontal Bar Chart */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-4 text-xs">
              {['India', 'Türkiye', 'Thailand', 'USA'].map((c) => (
                <div key={c} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COUNTRY_COLORS[c] }}
                  />
                  <span className="text-slate-600">{c}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              {rankedHospitals.map((h) => {
                const barWidth = Math.max(5, h.closeness_score * 100);
                return (
                  <div key={h.hospital_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <span className="text-slate-400 font-mono w-6 text-right">#{h.rank}</span>
                        <span>{h.hospital_name}</span>
                        <span className="text-slate-400 font-light">({h.country})</span>
                      </span>
                      <span className="font-mono font-semibold text-[#1D3045]">
                        {h.closeness_score.toFixed(4)}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: COUNTRY_COLORS[h.country] || '#1D3045',
                        }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={onNavigateCompare}
            className="flex-1 py-3 px-4 rounded-xl border border-teal-600 text-teal-800 hover:bg-teal-50 font-medium text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2"
          >
            <span>Compare Selected Hospitals Head-to-Head (Module 4)</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={onNavigateSensitivity}
            className="flex-1 py-3 px-4 rounded-xl bg-[#1D3045] hover:bg-[#253f5b] text-white font-medium text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <TrendingUp size={14} />
            <span>Test Robustness in Sensitivity Analysis (Module 5)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
