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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-rose-100 bg-rose-50/60 rounded-t-2xl flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded">
                Mathematical Constraint Infeasibility
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                No fully valid schedule exists under the current constraints.
              </h3>
            </div>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Report Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <p className="text-slate-600">
            The scheduler refuses to fabricate an invalid schedule. The diagnostic report below identifies the exact constraints preventing a mathematically sound solution:
          </p>

          {/* Capacity Deficit Warning if overall capacity is short */}
          {infeasibilityReport.capacityDeficit > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Overall Workload Deficit:</span>
              </div>
              <p>
                Total Required Positions: <strong>{infeasibilityReport.totalRequired}</strong> vs
                Total Faculty Workload Capacity: <strong>{infeasibilityReport.totalCapacity}</strong>.
              </p>
              <p className="font-semibold text-rose-700">
                Shortage: {infeasibilityReport.capacityDeficit} assignments.
              </p>
            </div>
          )}

          {/* Bottlenecks List */}
          {infeasibilityReport.bottlenecks.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Bottleneck Dates & Sessions ({infeasibilityReport.bottlenecks.length})
              </h4>
              <div className="space-y-2">
                {infeasibilityReport.bottlenecks.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>
                        {b.displayDate} • {b.session}
                      </span>
                      <span className="text-rose-600 font-bold">
                        Deficit: -{b.shortage} Supervisors
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                      <div>
                        Required: <strong className="text-slate-900">{b.required}</strong>
                      </div>
                      <div>
                        Eligible & Avail: <strong className="text-slate-900">{b.availableEligibleCount}</strong>
                      </div>
                      <div>
                        At Max Cap: <strong className="text-slate-900">{b.facultyAtMaxCount}</strong>
                      </div>
                      <div>
                        On Leave: <strong className="text-slate-900">{b.unavailableCount}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      {b.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Administrator Actions (Section 17) */}
          {infeasibilityReport.recommendedActions.length > 0 && (
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/70 text-sky-950 space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-sky-900">
                <Wrench className="w-4 h-4 text-sky-600" />
                <span>Recommended Administrator Actions:</span>
              </div>
              <ul className="space-y-1.5 pl-4 list-disc text-sky-900">
                {infeasibilityReport.recommendedActions.map((act, aIdx) => (
                  <li key={aIdx}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer with shortcut navigation */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setInfeasibilityReport(null);
                setActiveTab('availability');
              }}
              className="text-sky-700 hover:text-sky-800 font-semibold underline"
            >
              Adjust Faculty Availability →
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setInfeasibilityReport(null);
                setActiveTab('faculty');
              }}
              className="text-sky-700 hover:text-sky-800 font-semibold underline"
            >
              Modify HOD Max Workloads →
            </button>
          </div>

          <button
            onClick={() => setInfeasibilityReport(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
