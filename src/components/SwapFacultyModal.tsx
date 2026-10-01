import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeftRight, User, Calendar, Check, AlertCircle } from 'lucide-react';
import { Assignment, Faculty, ProjectState } from '../types';

interface SwapFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAssignment: Assignment | null;
  sourceFaculty: Faculty | null;
  project: ProjectState;
  onConfirmSwap: (sourceAssignment: Assignment, targetFacultySrNo: number) => void;
}

export const SwapFacultyModal: React.FC<SwapFacultyModalProps> = ({
  isOpen,
  onClose,
  sourceAssignment,
  sourceFaculty,
  project,
  onConfirmSwap,
}) => {
  const [selectedTargetSrNo, setSelectedTargetSrNo] = useState<number | null>(null);

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

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTargetSrNo(null);
    }
  }, [isOpen, sourceAssignment?.id]);

  if (!isOpen || !sourceAssignment || !sourceFaculty) return null;

  // Find all faculty who have an assignment on this same date
  const assignmentsOnSameDate = project.assignments.filter(
    (a) => a.date === sourceAssignment.date && a.facultySrNo !== sourceFaculty.srNo
  );

  // Unique faculty with duties today
  const targetFacultyMap = new Map<number, { faculty: Faculty; duties: Assignment[] }>();
  assignmentsOnSameDate.forEach((a) => {
    const f = project.faculty.find((fac) => fac.srNo === a.facultySrNo);
    if (f) {
      if (!targetFacultyMap.has(f.srNo)) {
        targetFacultyMap.set(f.srNo, { faculty: f, duties: [] });
      }
      targetFacultyMap.get(f.srNo)!.duties.push(a);
    }
  });

  const targetList = Array.from(targetFacultyMap.values());
  const dateCfg = project.examPeriod.dates.find((d) => d.date === sourceAssignment.date);

  const handleSwap = () => {
    if (!selectedTargetSrNo) return;
    onConfirmSwap(sourceAssignment, selectedTargetSrNo);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden animate-modal-spring pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Two-Way Duty Exchange
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Swap examination duty on {dateCfg?.displayDate || sourceAssignment.date}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Duty Information */}
        <div className="mt-4 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
          <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">
            Source Assignment
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {sourceFaculty.name} (#{sourceFaculty.srNo})
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-bold text-[11px]">
              {sourceAssignment.session}
            </span>
          </div>
        </div>

        {/* Target Faculty Selection List */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Faculty Member to Exchange Duties With ({targetList.length} available):
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1" data-lenis-prevent>
            {targetList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No other faculty members have duties scheduled on this date.
              </div>
            ) : (
              targetList.map(({ faculty, duties }) => {
                const isSelected = selectedTargetSrNo === faculty.srNo;
                const dutiesStr = duties.map((d) => d.session + (d.isReserve ? ' (R)' : '')).join(', ');

                return (
                  <button
                    key={faculty.srNo}
                    type="button"
                    onClick={() => setSelectedTargetSrNo(faculty.srNo)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 shadow-xs'
                        : 'bg-white/60 dark:bg-slate-850/60 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                        {faculty.name}{' '}
                        <span className="text-[10px] text-slate-400 font-mono">#{faculty.srNo}</span>
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Currently: {dutiesStr}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/10 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTargetSrNo}
            onClick={handleSwap}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Confirm Exchange</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
