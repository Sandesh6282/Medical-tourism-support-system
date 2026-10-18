import React, { useState, useEffect } from 'react';
import { useDSS } from '@/context/DSSContext';
import {
  User,
  Scale,
  Trophy,
  GitCompare,
  TrendingUp,
  BookOpen,
  ArrowLeft,
  RotateCw,
  LucideIcon,
} from 'lucide-react';
import { PreferencesModule } from './PreferencesModule';
import { AHPWeightsModule } from './AHPWeightsModule';
import { RankingsModule } from './RankingsModule';
import { ComparisonModule } from './ComparisonModule';
import { SensitivityModule } from './SensitivityModule';
import { MethodologyModule } from './MethodologyModule';

export type DashboardTab =
  | 'preferences'
  | 'weights'
  | 'rankings'
  | 'comparison'
  | 'sensitivity'
  | 'methodology';

interface DashboardWorkspaceProps {
  onBackToHome: () => void;
  initialTab?: DashboardTab;
}

const TABS: { id: DashboardTab; label: string; icon: LucideIcon }[] = [
  { id: 'preferences', label: '1. Patient Preferences', icon: User },
  { id: 'weights', label: '2. Criteria Weights (AHP)', icon: Scale },
  { id: 'rankings', label: '3. Hospital Rankings (TOPSIS)', icon: Trophy },
  { id: 'comparison', label: '4. Hospital Comparison', icon: GitCompare },
  { id: 'sensitivity', label: '5. Sensitivity Analysis', icon: TrendingUp },
  { id: 'methodology', label: '6. Methodology', icon: BookOpen },
];

export const DashboardWorkspace = React.memo<DashboardWorkspaceProps>(({
  onBackToHome,
  initialTab = 'rankings',
}) => {
  const { isCalculating, selectedProcedure } = useDSS();
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  // Sync hash when activeTab changes
  useEffect(() => {
    window.location.hash = `#dashboard/${activeTab}`;
  }, [activeTab]);

  // Handle hash changes if user uses browser forward/backward buttons
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#dashboard/')) {
        const tab = hash.replace('#dashboard/', '') as DashboardTab;
        if (TABS.some((t) => t.id === tab)) {
          setActiveTab(tab);
        }
      } else if (hash === '#dashboard') {
        setActiveTab('rankings');
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-teal-500/20">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Back button & Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                title="Return to Home"
              >
                <ArrowLeft size={14} />
                <span>Home</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div>
                <h1 className="text-base sm:text-lg font-semibold text-[#1D3045] tracking-tight leading-tight">
                  Medical Tourism Decision Support System
                </h1>
                <p className="text-[11px] text-slate-500 font-light hidden sm:block">
                  Hybrid AHP-TOPSIS Multi-Criteria Decision Model • Knee Replacement Surgery
                </p>
              </div>
            </div>

            {/* Right: Active Procedure Badge & Calculation Indicator */}
            <div className="flex items-center gap-3">
              {selectedProcedure && (
                <div className="hidden md:flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-200"
                    title={selectedProcedure.display_label || selectedProcedure.procedure_name}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold font-mono text-[10px]">{selectedProcedure.procedure_id}:</span>
                    <span className="max-w-[180px] truncate">{selectedProcedure.display_label || selectedProcedure.procedure_name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 border border-current">
                      Synthetic Demonstration Mode
                    </span>
                  </div>
                </div>
              )}
              {isCalculating && (
                <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium animate-pulse">
                  <RotateCw size={14} className="animate-spin" />
                  <span className="hidden sm:inline">Recalculating...</span>
                </div>
              )}
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav
            aria-label="Dashboard Modules"
            className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2 border-t border-slate-100"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#1D3045] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Global Academic Disclaimer Banner for Synthetic Demonstration Mode */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-xs text-amber-950 font-normal">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
            Synthetic Demonstration Mode
          </span>
          <span className="leading-snug text-slate-700 text-xs font-light">
            Results are based on procedure-specific synthetic simulation data for academic AHP-TOPSIS evaluation. Hospital-specific prices, waiting times, and scores have not been independently verified. Rankings are illustrative and are not medical advice or verified hospital recommendations.
          </span>
        </div>
      </div>

      {/* Main Workspace View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'preferences' && (
          <PreferencesModule onNavigateNext={() => setActiveTab('weights')} />
        )}
        {activeTab === 'weights' && (
          <AHPWeightsModule onNavigateNext={() => setActiveTab('rankings')} />
        )}
        {activeTab === 'rankings' && (
          <RankingsModule
            onNavigateCompare={() => setActiveTab('comparison')}
            onNavigateSensitivity={() => setActiveTab('sensitivity')}
          />
        )}
        {activeTab === 'comparison' && (
          <ComparisonModule onNavigateNext={() => setActiveTab('sensitivity')} />
        )}
        {activeTab === 'sensitivity' && (
          <SensitivityModule onNavigateNext={() => setActiveTab('methodology')} />
        )}
        {activeTab === 'methodology' && <MethodologyModule />}
      </main>

      {/* Workspace Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 font-light">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Final Year Project (FYP) • Medical Tourism Decision Support System</span>
          <span className="font-mono text-[11px] text-slate-400">
            AHP-TOPSIS Analytical Engine • Ported to Unified React
          </span>
        </div>
      </footer>
    </div>
  );
});
