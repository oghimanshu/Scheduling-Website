import React from 'react';
import {
  AlertTriangle,
  X,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Wrench,
  Users,
  Calendar,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const InfeasibilityModal: React.FC = () => {
  const {
    infeasibilityReport,
    setInfeasibilityReport,
    setActiveTab,
  } = useScheduler();

  if (!infeasibilityReport || !infeasibilityReport.isInfeasible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:my-auto flex flex-col shadow-2xl border border-rose-300/80 dark:border-rose-900/40 animate-sheet-up sm:animate-modal-spring relative overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-rose-200/60 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/40 rounded-t-3xl flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-700 dark:text-rose-300 bg-rose-200/60 dark:bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-300/50 dark:border-rose-800/50">
                Mathematical Constraint Infeasibility
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                No fully valid schedule exists under the current constraints.
              </h3>
            </div>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Report Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            The scheduler refuses to fabricate an invalid schedule. The diagnostic report below identifies the exact constraints preventing a mathematically sound solution:
          </p>

          {/* Capacity Deficit Warning if overall capacity is short */}
          {infeasibilityReport.capacityDeficit > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Overall Workload Deficit:</span>
              </div>
              <p>
                Total Required Positions: <strong className="text-slate-900 dark:text-white">{infeasibilityReport.totalRequired}</strong> vs
                Total Faculty Workload Capacity: <strong className="text-slate-900 dark:text-white">{infeasibilityReport.totalCapacity}</strong>.
              </p>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                Shortage: {infeasibilityReport.capacityDeficit} assignments.
              </p>
            </div>
          )}

          {/* Bottlenecks List */}
          {infeasibilityReport.bottlenecks.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Bottleneck Dates & Sessions ({infeasibilityReport.bottlenecks.length})
              </h4>
              <div className="space-y-2">
                {infeasibilityReport.bottlenecks.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 space-y-2"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span>
                        {b.displayDate} • {b.session}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Deficit: -{b.shortage} Supervisors
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        Required: <strong className="text-slate-900 dark:text-white">{b.required}</strong>
                      </div>
                      <div>
                        Eligible & Avail: <strong className="text-slate-900 dark:text-white">{b.availableEligibleCount}</strong>
                      </div>
                      <div>
                        At Max Cap: <strong className="text-slate-900 dark:text-white">{b.facultyAtMaxCount}</strong>
                      </div>
                      <div>
                        On Leave: <strong className="text-slate-900 dark:text-white">{b.unavailableCount}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/10">
                      {b.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Administrator Actions (Section 17) */}
          {infeasibilityReport.recommendedActions.length > 0 && (
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/50 text-sky-950 dark:text-sky-200 space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-sky-900 dark:text-sky-300">
                <Wrench className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Recommended Administrator Actions:</span>
              </div>
              <ul className="space-y-1.5 pl-4 list-disc text-sky-900 dark:text-sky-300">
                {infeasibilityReport.recommendedActions.map((act, aIdx) => (
                  <li key={aIdx}>{act}</li>
                ))}
              </ul>
            </div>
          )}
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
              Adjust Faculty Availability →
            </button>
            <span className="text-slate-400 dark:text-slate-500">&bull;</span>
            <button
              onClick={() => {
                setInfeasibilityReport(null);
                setActiveTab('faculty');
              }}
              className="text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold underline cursor-pointer"
            >
              Modify HOD Max Workloads →
            </button>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white/10 dark:hover:bg-white/20 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
