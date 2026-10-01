import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Users, Calendar, RotateCcw } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const ResetSessionConfirmModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const { isResetConfirmModalOpen, setIsResetConfirmModalOpen, resetSessionToZero, project } = useScheduler();
  const [keepFaculty, setKeepFaculty] = useState<boolean>(true);
  const [keepExamDates, setKeepExamDates] = useState<boolean>(false);

  if (!forceOpen && !isResetConfirmModalOpen) return null;

  const facultyCount = project.faculty.length;
  const datesCount = project.examPeriod.dates.length;
  const assignmentsCount = project.assignments.length;

  const handleConfirmReset = () => {
    resetSessionToZero(keepFaculty && facultyCount > 0, keepExamDates && datesCount > 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-rose-300/80 dark:border-rose-900/50 space-y-5 animate-modal-spring my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Session to Zero
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                {keepFaculty && facultyCount > 0 ? 'Reset to Square One (Keep Faculty Data)' : 'Permanent Fresh Start'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsResetConfirmModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options to keep faculty and/or exam dates */}
        {facultyCount > 0 && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Reset Configuration Options
            </div>

            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={keepFaculty}
                onChange={(e) => setKeepFaculty(e.target.checked)}
                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                    Keep loaded faculty data ({facultyCount} members)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Retains faculty names, departments, designations, and custom role tiers. Resets all duty counters and carried-forward supervisions back to 0.
                </p>
              </div>
            </label>

            {datesCount > 0 && (
              <label className="flex items-start space-x-3 cursor-pointer group pt-2 border-t border-slate-200/60 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={keepExamDates}
                  onChange={(e) => setKeepExamDates(e.target.checked)}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer h-4 w-4"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Keep configured examination dates ({datesCount} dates)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Preserves the exam calendar structure and session quotas, clearing only generated schedules.
                  </p>
                </div>
              </label>
            )}
          </div>
        )}

        {/* What gets cleared summary */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {keepFaculty && facultyCount > 0
              ? 'The following items will be cleared back to zero:'
              : 'This action will permanently purge all session data from your browser:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200 font-medium bg-rose-50/70 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 text-[11px]">
            {(!keepFaculty || facultyCount === 0) && (
              <li>All {facultyCount} loaded faculty members</li>
            )}
            <li>All {assignmentsCount} duty assignments &amp; alternatives</li>
            <li>All faculty availability records &amp; leave overrides</li>
            {(!keepExamDates || datesCount === 0) && (
              <li>Custom exam dates &amp; session requirements ({datesCount} dates)</li>
            )}
          </ul>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            {keepFaculty && facultyCount > 0
              ? 'You will be returned to the Faculty Manager with your roster intact, ready to generate a brand new schedule.'
              : 'You will be returned to a clean, empty canvas ready to import a new faculty CSV roster.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={() => setIsResetConfirmModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5 ${
              keepFaculty && facultyCount > 0
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
            }`}
          >
            {keepFaculty && facultyCount > 0 ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Square One (Keep Faculty)</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Reset Everything to Zero</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
