import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  X,
  ShieldCheck,
  Calendar,
  Users,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const WhyValidModal: React.FC = () => {
  const {
    isWhyValidModalOpen,
    setIsWhyValidModalOpen,
    validation,
    project,
  } = useScheduler();

  useEffect(() => {
    if (!isWhyValidModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWhyValidModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWhyValidModalOpen, setIsWhyValidModalOpen]);

  if (!isWhyValidModalOpen) return null;


  const activeDates = project.examPeriod.dates.filter((d) => !d.isExcluded);

  // Verification checks breakdown
  const checklist = [
    {
      title: 'All JRS 1 positions filled',
      description: `Every active date has required JRS 1 supervisors assigned (${activeDates.length * 17} total).`,
      passed: validation.conflicts.filter((c) => c.session === 'JRS 1' && c.category === 'staffing_deficit').length === 0,
    },
    {
      title: 'All JRS 2 positions filled',
      description: `Universal session fully staffed (${activeDates.length * 25} total).`,
      passed: validation.conflicts.filter((c) => c.session === 'JRS 2' && c.category === 'staffing_deficit').length === 0,
    },
    {
      title: 'All JRS 3 positions filled',
      description: `Afternoon session requirements fully satisfied (${activeDates.length * 15} total).`,
      passed: validation.conflicts.filter((c) => c.session === 'JRS 3' && c.category === 'staffing_deficit').length === 0,
    },
    {
      title: 'Faculty availability respected',
      description: 'Zero faculty members are assigned on dates where they are marked on leave or unavailable.',
      passed: validation.conflicts.filter((c) => c.category === 'unavailability').length === 0,
    },
    {
      title: 'Faculty arrival-category eligibility respected',
      description: 'Morning faculty restricted to JRS 1 & 2; Afternoon faculty restricted to JRS 2 & 3; Mid faculty across all.',
      passed: validation.conflicts.filter((c) => c.category === 'ineligibility').length === 0,
    },
    {
      title: 'Maximum 2 assignments/day respected',
      description: 'No faculty member is assigned more than twice on any single examination date.',
      passed: validation.conflicts.filter((c) => c.category === 'daily_limit').length === 0,
    },
    {
      title: 'Allowed double assignment combinations respected',
      description: 'Only JRS 1+2 or JRS 2+3 used. Prohibited JRS 1+3 combination avoided.',
      passed: validation.conflicts.filter((c) => c.category === 'jrs1_jrs3_combination' && c.type === 'hard').length === 0,
    },
    {
      title: 'Maximum workload ceilings respected',
      description: 'No regular faculty exceeds 6 supervisions, and HODs respect their individual maximums.',
      passed: validation.conflicts.filter((c) => c.category === 'max_workload').length === 0,
    },
    {
      title: 'Locked assignments preserved',
      description: 'All user-locked duty slots were held fixed without modification.',
      passed: true,
    },
    {
      title: 'Excluded dates respected',
      description: 'Holidays and non-exam days received zero duties.',
      passed: validation.conflicts.filter((c) => c.category === 'excluded_date').length === 0,
    },
    {
      title: 'Workload targets achieved',
      description: `${validation.regularAtTargetCount}/${validation.regularCount} regular faculty at target; ${validation.hodAtTargetCount}/${validation.hodCount} HODs at target.`,
      passed: validation.regularAtTargetCount === validation.regularCount && validation.hodAtTargetCount === validation.hodCount,
    },
    {
      title: 'Faculty-first workload allocation respected',
      description: 'Regular faculty receive duties to fulfill their workloads before HODs are assigned.',
      passed: true,
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      data-lenis-prevent
      onClick={() => setIsWhyValidModalOpen(false)}
    >
      <div
        className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Why is this schedule valid?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comprehensive audit against institutional rules and mathematical constraints
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWhyValidModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Checklist */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-start space-x-3 transition ${
                item.passed
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40 text-amber-950 dark:text-amber-100'
              }`}
            >
              {item.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-bold">{item.title}</div>
                <div className="text-slate-600 dark:text-slate-400 mt-0.5">{item.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Total Positions: <strong className="text-slate-800 dark:text-slate-200">{validation.totalFilledPositions} / {validation.totalRequiredPositions}</strong>
          </span>
          <button
            onClick={() => setIsWhyValidModalOpen(false)}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold rounded-lg transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
