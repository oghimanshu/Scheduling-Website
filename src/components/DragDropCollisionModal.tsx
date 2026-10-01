import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, UserCheck, X, AlertCircle } from 'lucide-react';
import { Assignment, Faculty } from '../types';

export interface DragDropCollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAssignment: Assignment | null;
  sourceFaculty: Faculty | null;
  targetFaculty: Faculty | null;
  targetAssignment: Assignment | null;
  dateDisplay: string;
  onResolve: (action: 'swap' | 'replace') => void;
}

export const DragDropCollisionModal: React.FC<DragDropCollisionModalProps> = ({
  isOpen,
  onClose,
  sourceAssignment,
  sourceFaculty,
  targetFaculty,
  targetAssignment,
  dateDisplay,
  onResolve,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sourceAssignment || !sourceFaculty || !targetFaculty || !targetAssignment) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Duty Assignment Collision</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                  {sourceAssignment.session}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target faculty member already holds an assignment in this session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Source Faculty Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dragged Duty (Source)
            </span>
            <div className="font-bold text-slate-900 dark:text-white truncate">
              {sourceFaculty.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              #{sourceFaculty.srNo} &bull; {sourceFaculty.arrival}
            </div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              {sourceAssignment.session} &bull; {dateDisplay}
            </div>
          </div>

          {/* Target Faculty Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Existing Duty (Target)
            </span>
            <div className="font-bold text-slate-900 dark:text-white truncate">
              {targetFaculty.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              #{targetFaculty.srNo} &bull; {targetFaculty.arrival}
            </div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              {targetAssignment.session} &bull; {dateDisplay}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          How would you like to resolve this duty allocation on <strong className="text-slate-900 dark:text-white">{dateDisplay}</strong>?
        </p>

        {/* Resolution Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option A: Two-Way Duty Swap */}
          <button
            type="button"
            onClick={() => onResolve('swap')}
            className="btn-spring p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-left cursor-pointer transition shadow-2xs group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                <ArrowRightLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Two-Way Duty Swap</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Exchange duties between both colleagues so both stay assigned.
              </p>
            </div>
            <span className="mt-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              Select Swap &rarr;
            </span>
          </button>

          {/* Option B: One-Way Replace */}
          <button
            type="button"
            onClick={() => onResolve('replace')}
            className="btn-spring p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-left cursor-pointer transition shadow-2xs group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-300 font-bold text-xs mb-1">
                <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>One-Way Replace</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Assign duty to {targetFaculty.name}; unassign {sourceFaculty.name}.
              </p>
            </div>
            <span className="mt-3 text-[10px] font-bold text-sky-600 dark:text-sky-400">
              Select Replace &rarr;
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="btn-spring px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
