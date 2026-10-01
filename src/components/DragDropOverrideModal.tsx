import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, AlertTriangle, Lock } from 'lucide-react';
import { Assignment, Faculty } from '../types';

export interface DragDropOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAssignment: Assignment | null;
  sourceFaculty: Faculty | null;
  targetFaculty: Faculty | null;
  conflictReasons: string[];
  dateDisplay: string;
  onConfirmOverride: (reason: string, lockAfter: boolean) => void;
}

export const DragDropOverrideModal: React.FC<DragDropOverrideModalProps> = ({
  isOpen,
  onClose,
  sourceAssignment,
  sourceFaculty,
  targetFaculty,
  conflictReasons,
  dateDisplay,
  onConfirmOverride,
}) => {
  const [reason, setReason] = useState('Authorized by Chief Superintendent / Special Administrative Reallocation');
  const [lockAfter, setLockAfter] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('Authorized by Chief Superintendent / Special Administrative Reallocation');
      setLockAfter(true);
    }
  }, [isOpen, sourceAssignment?.id]);

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

  if (!isOpen || !sourceAssignment || !sourceFaculty || !targetFaculty) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmOverride(reason.trim() || 'Administrator Override', lockAfter);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-rose-300/80 dark:border-rose-900/50 space-y-4 animate-sheet-up sm:animate-modal-spring sm:my-auto flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Scheduling Rule Conflict</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300/40">
                  {sourceAssignment.session}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target faculty member violates one or more scheduling constraints.
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

        {/* Conflict Details Box */}
        <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/50 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Detected Constraints for {targetFaculty.name}:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-700 dark:text-rose-300 text-[11px]">
            {conflictReasons.map((r, i) => (
              <li key={i} className="leading-snug">{r}</li>
            ))}
          </ul>
        </div>

        {/* Transfer Summary */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Transfer Duty:</span>{' '}
            <strong className="text-slate-800 dark:text-slate-100">{sourceAssignment.session}</strong> ({dateDisplay})
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">From:</span>{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{sourceFaculty.name}</span> &rarr;{' '}
            <strong className="text-sky-600 dark:text-sky-400">{targetFaculty.name}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Administrator Override Justification / Reason:
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Authorized by Dean / Special examination emergency duty"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lockAfter}
              onChange={(e) => setLockAfter(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <span className="flex items-center space-x-1 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Lock this assignment after transfer (protects against auto-rebalance)</span>
            </span>
          </label>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-spring px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-spring px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition cursor-pointer"
            >
              Authorize Override &amp; Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
