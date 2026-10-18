import React, { useState } from 'react';
import { ExternalLink, BookOpen, Layers, CheckSquare, BarChart3, Database, ShieldCheck } from 'lucide-react';

export const MethodologyModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'ahp' | 'topsis' | 'taxonomy' | 'datasets'>(
    'architecture'
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>Module 6</span>
              <span>•</span>
              <span>Methodology & Theoretical Framework</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1D3045] tracking-tight">
              Mathematical Formulations & Algorithmic Foundations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-light mt-1 max-w-2xl">
              Comprehensive academic foundation of the hybrid AHP-TOPSIS multi-criteria decision-making pipeline,
              equations, consistency indices, and clinical literature benchmarks.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
          {[
            { id: 'architecture', label: 'System Architecture', icon: Layers },
            { id: 'ahp', label: 'AHP Formulation', icon: CheckSquare },
            { id: 'topsis', label: 'TOPSIS Algorithm', icon: BarChart3 },
            { id: 'taxonomy', label: 'Criteria Taxonomy & References', icon: BookOpen },
            { id: 'datasets', label: 'Dataset Integration & Schema', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#1D3045] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: System Architecture */}
      {activeTab === 'architecture' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">
              🔬 Multi-Criteria Decision-Making (MCDM) Pipeline
            </h3>
            <p className="text-xs text-slate-500 font-light mt-1">
              Hybrid integration of Analytic Hierarchy Process (AHP) and Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)
            </p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed font-light">
            Cross-border elective surgical decisions present multi-dimensional trade-offs across non-commensurate scales
            (e.g., dollars, days, composite quality ratings). Combining <strong>AHP</strong> (for priority weighting) and{' '}
            <strong>TOPSIS</strong> (for geometric alternative ranking) eliminates subjective scoring bias while guaranteeing
            mathematically reproducible outcomes:
          </p>

          <div className="p-6 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
            <pre>{`[1. Patient Profile & Feasibility Filter]
          │
          ▼
[2. AHP Pairwise Comparisons (1–9 Saaty Scale)]
          │──> [Consistency Ratio Verification: CR = CI / RI < 0.10]
          ▼
[3. Derived Normalized Priority Vector (w = [w1, ..., wn])]
          │
          ▼
[4. Decision Matrix Normalization: r_ij = x_ij / √(Σ x_kj²)]
          │
          ▼
[5. Weighted Normalized Matrix: v_ij = w_j · r_ij]
          │
          ▼
[6. Benchmark Solutions: PIS (A⁺) & NIS (A⁻)]
          │  • Benefit Criteria: A⁺ = max(v_ij), A⁻ = min(v_ij)
          │  • Cost Criteria:    A⁺ = min(v_ij), A⁻ = max(v_ij)
          ▼
[7. Euclidean Separation Distances: S_i⁺ & S_i⁻]
          │
          ▼
[8. Relative Closeness: C_i* = S_i⁻ / (S_i⁺ + S_i⁻),  0 ≤ C_i* ≤ 1]
          │
          ▼
[9. Ranked Leaderboard & One-At-A-Time Sensitivity Robustness Testing]`}</pre>
          </div>
        </div>
      )}

      {/* Tab 2: AHP Formulation */}
      {activeTab === 'ahp' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">
              ⚖️ Analytic Hierarchy Process (Saaty, 1980)
            </h3>
            <p className="text-xs text-slate-500 font-light mt-1">
              Pairwise reciprocal comparison matrix, principal eigenvector derivation, and transitivity consistency verification
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed font-light">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 1: Positive Reciprocal Matrix (A)</h4>
              <p>
                Construct a square matrix <em>A</em> = [<em>a<sub>ij</sub></em>]<sub>6×6</sub> where <em>a<sub>ij</sub></em> represents
                the relative importance of criterion <em>i</em> over criterion <em>j</em>:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                a<sub>ji</sub> = 1 / a<sub>ij</sub>, &nbsp;&nbsp; a<sub>ii</sub> = 1, &nbsp;&nbsp; a<sub>ij</sub> &gt; 0
              </div>
            </div>

            {/* Saaty Scale Table */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Saaty's 1–9 Fundamental Scale of Absolute Numbers</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-20">Intensity</th>
                      <th className="py-2.5 px-4 w-48">Definition</th>
                      <th className="py-2.5 px-4">Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-bold font-mono">1</td>
                      <td className="py-2 px-4 font-medium">Equal Importance</td>
                      <td className="py-2 px-4 text-slate-600">Two criteria contribute equally to the clinical objective</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold font-mono">3</td>
                      <td className="py-2 px-4 font-medium">Moderate Importance</td>
                      <td className="py-2 px-4 text-slate-600">Experience and judgment slightly favor one criterion over another</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold font-mono">5</td>
                      <td className="py-2 px-4 font-medium">Strong Importance</td>
                      <td className="py-2 px-4 text-slate-600">Experience and judgment strongly favor one criterion over another</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold font-mono">7</td>
                      <td className="py-2 px-4 font-medium">Very Strong Importance</td>
                      <td className="py-2 px-4 text-slate-600">A criterion is favored very strongly over another; its dominance is demonstrated</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold font-mono">9</td>
                      <td className="py-2 px-4 font-medium">Extreme / Absolute</td>
                      <td className="py-2 px-4 text-slate-600">The evidence favoring one criterion over another is of the highest possible order</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono text-slate-400">2, 4, 6, 8</td>
                      <td className="py-2 px-4 text-slate-500">Intermediate Values</td>
                      <td className="py-2 px-4 text-slate-500">Used when compromise is needed between two adjacent definitions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Principal Eigenvector & Consistency */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 2: Priority Vector (w) & Consistency Verification</h4>
              <p>
                The weight vector <em>w</em> is calculated as the normalized principal right eigenvector associated with the largest eigenvalue λ<sub>max</sub>:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                A · w = λ<sub>max</sub> · w, &nbsp;&nbsp;&nbsp; Σ w<sub>i</sub> = 1
              </div>
              <p className="pt-2">
                The Consistency Index (<em>CI</em>) and Consistency Ratio (<em>CR</em>) quantify transitivity adherence:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                CI = (λ<sub>max</sub> - n) / (n - 1), &nbsp;&nbsp;&nbsp; CR = CI / RI
              </div>
              <p className="text-xs text-slate-500">
                For <em>n</em> = 6 criteria, Saaty's empirical Random Index is <strong>RI = 1.24</strong>.
                If <strong>CR &lt; 0.10 (10%)</strong>, the comparison matrix is deemed consistent and accepted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: TOPSIS Algorithm */}
      {activeTab === 'topsis' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">
              🏆 TOPSIS Algorithmic Formulation (Hwang & Yoon, 1981)
            </h3>
            <p className="text-xs text-slate-500 font-light mt-1">
              Vector normalization, weighted matrix formulation, Euclidean distance from ideal benchmarks
            </p>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed font-light">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 1: Vector Normalization</h4>
              <p>
                To eliminate disparity among measurement dimensions (e.g., $5,000–$40,000 USD vs. 1–15 quality score vs. 1–20 days),
                each raw element <em>x<sub>ij</sub></em> is normalized into <em>r<sub>ij</sub></em>:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                r<sub>ij</sub> = x<sub>ij</sub> / √( Σ<sub>k=1</sub><sup>m</sup> x<sub>kj</sub>² )
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 2: Weighted Normalized Matrix</h4>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                v<sub>ij</sub> = w<sub>j</sub> · r<sub>ij</sub>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 3: Positive (A⁺) and Negative (A⁻) Ideal Solutions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="font-semibold text-xs text-emerald-900 block mb-1">
                    Benefit Criteria (Quality, Language, Post-Op):
                  </span>
                  <code className="text-xs text-emerald-950 font-mono">
                    A<sub>j</sub>⁺ = max<sub>i</sub>(v<sub>ij</sub>), &nbsp; A<sub>j</sub>⁻ = min<sub>i</sub>(v<sub>ij</sub>)
                  </code>
                </div>
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="font-semibold text-xs text-amber-900 block mb-1">
                    Cost Criteria (Procedure Cost, Waiting Time, Travel Cost):
                  </span>
                  <code className="text-xs text-amber-950 font-mono">
                    A<sub>j</sub>⁺ = min<sub>i</sub>(v<sub>ij</sub>), &nbsp; A<sub>j</sub>⁻ = max<sub>i</sub>(v<sub>ij</sub>)
                  </code>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Step 4 & 5: Euclidean Separation & Relative Closeness</h4>
              <p>
                Euclidean distances to the positive and negative benchmarks:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-[#1D3045] border border-slate-200">
                S<sub>i</sub>⁺ = √( Σ<sub>j=1</sub><sup>n</sup> (v<sub>ij</sub> - A<sub>j</sub>⁺)² ), &nbsp;&nbsp;&nbsp;
                S<sub>i</sub>⁻ = √( Σ<sub>j=1</sub><sup>n</sup> (v<sub>ij</sub> - A<sub>j</sub>⁻)² )
              </div>
              <p className="pt-2">
                The relative closeness coefficient <em>C<sub>i</sub><sup>*</sup></em> ranks alternatives:
              </p>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl font-mono text-xs text-teal-950 font-bold">
                C<sub>i</sub><sup>*</sup> = S<sub>i</sub>⁻ / (S<sub>i</sub>⁺ + S<sub>i</sub>⁻), &nbsp;&nbsp;&nbsp; 0 ≤ C<sub>i</sub><sup>*</sup> ≤ 1
              </div>
              <p className="text-xs text-slate-500">
                Hospitals are ordered in descending order of <em>C<sub>i</sub><sup>*</sup></em>. As <em>C<sub>i</sub><sup>*</sup> → 1</em>,
                the alternative approaches optimal multi-criteria proximity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Criteria Taxonomy & References */}
      {activeTab === 'taxonomy' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">
              📊 Decision Criteria Taxonomy & Clinical Scope
            </h3>
            <p className="text-xs text-slate-500 font-light mt-1">
              Formal mapping of variables, optimization directions, units, and literature references
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-semibold border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Criterion</th>
                  <th className="py-2.5 px-3">Variable</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-4">Clinical Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Procedure Cost</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">procedure_cost_usd</td>
                  <td className="py-2.5 px-3 text-amber-700 font-medium">Cost (↓)</td>
                  <td className="py-2.5 px-3">USD ($)</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Comprehensive surgical package: prosthesis implant, OR fees, surgeon/anesthesia fees, inpatient ward bed.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Hospital Quality</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">hospital_quality_score_1_to_15</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">Benefit (↑)</td>
                  <td className="py-2.5 px-3">Scale (1–15)</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    International accreditations (JCI, ISO 9001), orthopedic surgical volume, infection controls, clinical governance.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Waiting Time</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">waiting_time_days</td>
                  <td className="py-2.5 px-3 text-amber-700 font-medium">Cost (↓)</td>
                  <td className="py-2.5 px-3">Days</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Time between clinical clearance/consultation approval and scheduled surgical admission.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Travel & Lodging</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">travel_accommodation_cost_usd</td>
                  <td className="py-2.5 px-3 text-amber-700 font-medium">Cost (↓)</td>
                  <td className="py-2.5 px-3">USD ($)</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Estimated round-trip flights, transit, visa fees, and hotel stay for patient plus one companion.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Language Access</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">language_accessibility_score_1_to_5</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">Benefit (↑)</td>
                  <td className="py-2.5 px-3">Scale (1–5)</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    English fluency of clinical teams, dedicated international patient liaisons, certified medical translation.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Post-op Support</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">postoperative_support_score_1_to_5</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">Benefit (↑)</td>
                  <td className="py-2.5 px-3">Scale (1–5)</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Remote teleconsultation follow-up, structured physical therapy protocols, electronic health record handoffs.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Academic References */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-semibold text-slate-900 text-sm">Academic & Industry Literature Citations</h4>
            <div className="space-y-2 text-xs">
              <a
                href="https://circ.in/pdf/Report-ICRR2023.pdf"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-all text-slate-700"
              >
                <div>
                  <strong>India Competitiveness Report 2023:</strong> Clinical cost differentials and medical tourism benchmarks.
                </div>
                <ExternalLink size={14} className="text-teal-600 shrink-0 ml-2" />
              </a>
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10368258/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-all text-slate-700"
              >
                <div>
                  <strong>PubMed Central PMC10368258:</strong> Systematic Review of Total Knee Replacement Costs and Outcomes.
                </div>
                <ExternalLink size={14} className="text-teal-600 shrink-0 ml-2" />
              </a>
              <a
                href="https://www.jointcommission.org/en/about-us/recognizing-excellence/find-accredited-international-organizations"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-all text-slate-700"
              >
                <div>
                  <strong>Joint Commission International (JCI):</strong> Official global directory of accredited healthcare organizations.
                </div>
                <ExternalLink size={14} className="text-teal-600 shrink-0 ml-2" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Dataset Integration & Schema */}
      {activeTab === 'datasets' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
          <div>
            <h3 className="font-medium text-lg text-[#1D3045]">
              🗄️ Relational Dataset Integration & Data Flow
            </h3>
            <p className="text-xs text-slate-500 font-light mt-1">
              Multi-file schema, normalization integrity, and scientific missing-data governance
            </p>
          </div>

          {/* Dataset Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1D3045]">
                <span>1. hospitals.csv</span>
                <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px]">16 Entities</span>
              </div>
              <p className="text-xs text-slate-600 font-light leading-relaxed">
                Primary entity table containing validated hospital metadata: <code>hospital_id</code> (IN01–IN04, TR01–TR04, TH01–TH04, US01–US04), hospital name, destination country (India, Türkiye, Thailand, USA), city, accreditation body, and destination travel/lodging cost estimates.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1D3045]">
                <span>2. knee_procedures.csv</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px]">9 Procedures</span>
              </div>
              <p className="text-xs text-slate-600 font-light leading-relaxed">
                Standardized procedure catalog defining stable IDs (<code>KNEE01</code>–<code>KNEE09</code>), medical procedure names, clinical categorizations, and descriptive diagnostic definitions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1D3045]">
                <span>3. hospital_procedure_data.csv</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">144 Combinations</span>
              </div>
              <p className="text-xs text-slate-600 font-light leading-relaxed">
                Relational bridge table mapping each hospital to each knee procedure (16 × 9). Contains procedure availability status, audited procedure costs, waiting times, and data verification tracking.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1D3045]">
                <span>4. FYP_hospital_dataset.csv</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">Baseline Demo</span>
              </div>
              <p className="text-xs text-slate-600 font-light leading-relaxed">
                Legacy synthetic demonstration benchmark dataset powering the illustrative Knee Replacement (<code>KNEE01</code>) workflow to ensure complete backwards reproducibility.
              </p>
            </div>
          </div>

          {/* Procedure Registry Table */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-sm">Nine Standardized Knee Procedure Classifications</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-4">Standardized Procedure Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-4">Clinical Description</th>
                    <th className="py-2.5 px-3 text-center">Dataset Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {[
                    { id: 'KNEE01', name: 'Knee replacement', cat: 'Standard Arthroplasty', desc: 'Standard total joint replacement benchmark baseline', status: 'SYNTHETIC_DEMO' },
                    { id: 'KNEE02', name: 'Total knee replacement (TKR) with OMNI', cat: 'Robotic-Assisted', desc: 'OMNIBotics robotic navigation with dynamic ligament balancing (+12% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE03', name: 'Knee MAKoplasty', cat: 'Robotic-Assisted', desc: 'Mako robotic-arm assisted partial or total knee arthroplasty (+26% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE04', name: 'Total Knee Replacement (Arthroplasty)', cat: 'Standard Arthroplasty', desc: 'Complete resurfacing of femoral, tibial, and patellar articular surfaces (+2% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE05', name: 'Robotic knee replacement surgery', cat: 'Robotic-Assisted', desc: 'Generic robotic platform assisted knee reconstruction (+22% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE06', name: 'Knee arthroplastic', cat: 'Arthroplasty Variant', desc: 'Surgical repair, reconstruction, or replacement of the diseased joint (+4% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE07', name: 'Unilateral knee arthroplasty', cat: 'Unilateral / Partial', desc: 'Single-compartment knee resurfacing preserving healthy ligaments (-1% cost)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE08', name: 'Unicompartmental (partial) knee replacement', cat: 'Unilateral / Partial', desc: 'Minimally invasive resurfacing of medial or lateral compartment (-20% cost, -8% travel)', status: 'SYNTHETIC_SIMULATION' },
                    { id: 'KNEE09', name: 'Revision knee arthroplasty', cat: 'Revision Arthroplasty', desc: 'Complex removal and replacement of previously failed prosthetic components (+55% cost, +15% travel)', status: 'SYNTHETIC_SIMULATION' },
                  ].map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{p.id}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.cat}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.desc}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Data & Integrity Principles */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <ShieldCheck size={18} className="text-teal-700" />
              <span>Scientific Data Integrity & Governance Principles</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 font-light leading-relaxed">
              <li>
                <strong>Technique Modalities vs. Anatomical Procedures:</strong> Entries like <em>Robotic knee replacement surgery</em> (<code>KNEE05</code>) are enabling technological techniques (e.g., Stryker Mako, Smith & Nephew NAVIO/CORI, Zimmer Biomet ROSA) rather than stand-alone anatomical surgery classifications. Actual hospital cost contracts, surgical admissions, and wait queues are documented under distinct arthroplasty procedures.
              </li>
              <li>
                <strong>Separation of Demonstration & Production Datasets:</strong> The six-criterion benchmark dataset in <code>FYP_hospital_dataset.csv</code> is explicitly designated as an illustrative synthetic baseline for the <em>Knee replacement</em> (<code>KNEE01</code>) software demonstration. It is never silently mixed with or copied into procedure-specific records in <code>hospital_procedure_data.csv</code>.
              </li>
              <li>
                <strong>Zero-Imputation Prohibition:</strong> Blanks in <code>hospital_procedure_data.csv</code> are mapped to <code>null</code> (displayed as <code>UNKNOWN</code>), never $0 or 0 days waiting time, preventing catastrophic ranking distortions.
              </li>
              <li>
                <strong>Mathematical Safeguard on Incomplete Data:</strong> TOPSIS relative closeness calculations require a complete $m \times n$ decision matrix. When required criteria values are missing, rankings are withheld to preserve methodological validity and prevent fictitious clinical recommendations.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
