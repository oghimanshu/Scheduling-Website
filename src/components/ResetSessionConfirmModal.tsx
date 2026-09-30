import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const ResetSessionConfirmModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const { isResetConfirmModalOpen, setIsResetConfirmModalOpen, resetSessionToZero, project } = useScheduler();

  if (!forceOpen && !isResetConfirmModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-300/80 dark:border-rose-900/50 space-y-5 animate-in fade-in zoom-in-95 duration-150">
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
                Permanent Fresh Start
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

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            This action will <strong>permanently purge all session data</strong> from your browser, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200 font-medium bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <li>All {project.faculty.length} loaded faculty members</li>
            <li>All {project.assignments.length} duty assignments &amp; alternatives</li>
            <li>All availability records, leave exclusions &amp; overrides</li>
            <li>Custom exam dates &amp; session requirements</li>
          </ul>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            You will be returned to a clean, empty canvas ready to import a new faculty CSV roster.
          </p>
        </div>

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
            onClick={resetSessionToZero}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-500/25 transition cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Reset Everything to Zero</span>
          </button>
        </div>
      </div>
    </div>
  );
};
