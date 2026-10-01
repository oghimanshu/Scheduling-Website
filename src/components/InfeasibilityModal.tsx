import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  Wrench,
  Sparkles,
  Clock,
  TrendingUp,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const InfeasibilityModal: React.FC = () => {
  const {
    infeasibilityReport,
    setInfeasibilityReport,
    setActiveTab,
    generateBestEffortSchedule,
    relaxArrivalAndGenerate,
    bumpFacultyCapsAndGenerate,
    enableJrs1Jrs3AndGenerate,
    autoReduceRequirementsAndGenerate,
    isGenerating,
  } = useScheduler();

  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (!infeasibilityReport || !infeasibilityReport.isInfeasible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:my-auto flex flex-col shadow-2xl border border-sky-300/80 dark:border-sky-900/40 animate-sheet-up sm:animate-modal-spring relative overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/10 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 rounded-t-3xl flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800/60">
                  Conflict Resolution Wizard
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Constraints Need Mitigation
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Choose a Resolution to Generate Your Schedule
              </h3>
            </div>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
            title="Dismiss Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Action Center Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Primary Mitigation: Best Effort Draft */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-600 to-purple-700 text-white shadow-lg space-y-3 relative overflow-hidden">
            <div className="apple-specular-rim" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center space-x-1.5 text-sky-200 font-bold uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommended Quick Action</span>
                </div>
                <h4 className="text-base font-black text-white mt-0.5">
                  Generate Best-Effort Schedule Anyway
                </h4>
                <p className="text-xs text-sky-100 max-w-md mt-1">
                  Assigns all mathematically possible duties (typically 95%+). Any remaining bottleneck positions are clearly highlighted as unfilled slots for easy manual assignment.
                </p>
              </div>

              <button
                onClick={generateBestEffortSchedule}
                disabled={isGenerating}
                className="btn-spring shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-sky-950 hover:bg-sky-50 shadow-md transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <span>{isGenerating ? 'Generating...' : 'Generate Best-Effort Now'}</span>
                <ArrowRight className="w-4 h-4 text-sky-600" />
              </button>
            </div>
          </div>

          {/* 4 Contextual 1-Click Fast Mitigations */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Alternative 1-Click Mitigations</span>
              <span className="text-[10px] text-slate-400 font-normal">Click any to apply &amp; solve immediately</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mitigation 1: Relax Arrival Constraints */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 hover:border-amber-400/60 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Relax Arrival Shift Rules</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Allows available Mid and Afternoon faculty to cover JRS 1 (Morning) when eligible faculty are exhausted.
                  </p>
                </div>
                <button
                  onClick={relaxArrivalAndGenerate}
                  disabled={isGenerating}
                  className="btn-spring w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Relax Arrival &amp; Solve</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mitigation 2: Auto-Bump Workload Caps (+1) */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 hover:border-indigo-400/60 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>Auto-Bump Workload Caps (+1)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Increases maximum duties for all faculty by +1 to absorb institutional capacity deficits.
                  </p>
                </div>
                <button
                  onClick={bumpFacultyCapsAndGenerate}
                  disabled={isGenerating}
                  className="btn-spring w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Bump Caps (+1) &amp; Solve</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mitigation 3: Allow JRS 1 + 3 Double Duties */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 hover:border-emerald-400/60 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>Allow JRS 1 + JRS 3 Doubles</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Permits faculty to take Morning and Afternoon duties with lunch gap, solving daily staffing bottlenecks.
                  </p>
                </div>
                <button
                  onClick={enableJrs1Jrs3AndGenerate}
                  disabled={isGenerating}
                  className="btn-spring w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Enable JRS 1+3 &amp; Solve</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mitigation 4: Auto-Reduce Session Requirements */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 hover:border-purple-400/60 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Sliders className="w-4 h-4" />
                    <span>Auto-Align Session Staffing</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Scales down required supervisors on bottleneck dates to match the maximum available faculty count.
                  </p>
                </div>
                <button
                  onClick={autoReduceRequirementsAndGenerate}
                  disabled={isGenerating}
                  className="btn-spring w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Align Staffing &amp; Solve</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Details Accordion */}
          <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>View Mathematical Bottleneck Audit ({infeasibilityReport.bottlenecks.length} Bottlenecks)</span>
              </div>
              {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDiagnostics && (
              <div className="p-4 pt-1 space-y-4 border-t border-slate-200/60 dark:border-white/10">
                {/* Overall Capacity Warning */}
                {infeasibilityReport.capacityDeficit > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Capacity Deficit: Short by {infeasibilityReport.capacityDeficit} duties</span>
                    </div>
                    <p className="text-[11px]">
                      Required: <strong>{infeasibilityReport.totalRequired}</strong> positions vs Total Faculty Workload Capacity: <strong>{infeasibilityReport.totalCapacity}</strong>.
                    </p>
                  </div>
                )}

                {/* Bottlenecks list */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {infeasibilityReport.bottlenecks.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{b.displayDate} • {b.session}</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Deficit: -{b.shortage}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                        <div>Required: <strong>{b.required}</strong></div>
                        <div>Eligible &amp; Avail: <strong>{b.availableEligibleCount}</strong></div>
                        <div>At Max: <strong>{b.facultyAtMaxCount}</strong></div>
                        <div>On Leave: <strong>{b.unavailableCount}</strong></div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                        {b.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with shortcut navigation */}
        <div className="p-4 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 rounded-b-3xl flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setInfeasibilityReport(null);
                setActiveTab('availability');
              }}
              className="text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold underline cursor-pointer"
            >
              Adjust Availability Matrix →
            </button>
            <span className="text-slate-400 dark:text-slate-500">&bull;</span>
            <button
              onClick={() => {
                setInfeasibilityReport(null);
                setActiveTab('faculty');
              }}
              className="text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold underline cursor-pointer"
            >
              Modify Faculty Caps →
            </button>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white/10 dark:hover:bg-white/20 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
