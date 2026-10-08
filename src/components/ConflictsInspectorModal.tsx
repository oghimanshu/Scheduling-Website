import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Crosshair,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ValidationConflict } from '../types';

export const ConflictsInspectorModal: React.FC<{ forceOpen?: boolean }> = ({
  forceOpen,
}) => {
  const {
    project,
    validation,
    isConflictsModalOpen,
    setIsConflictsModalOpen,
    setActiveTab,
    setTargetedConflictCell,
    removeAssignment,
    cleanExcludedDateAssignments,
  } = useScheduler();

  const [activeFilter, setActiveFilter] = useState<'all' | 'hard' | 'soft' | 'unfilled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Check how many orphan assignments exist on excluded examination dates
  const orphanExcludedDuties = useMemo(() => {
    const excludedDatesSet = new Set(
      project.examPeriod.dates.filter((d) => d.isExcluded).map((d) => d.date)
    );
    return project.assignments.filter((a) => excludedDatesSet.has(a.date));
  }, [project.assignments, project.examPeriod.dates]);

  const conflictsList = useMemo(() => {
    return validation.conflicts.filter((c) => {
      if (activeFilter === 'hard' && c.type !== 'hard') return false;
      if (activeFilter === 'soft' && c.type !== 'soft') return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = (c.facultyName || '').toLowerCase().includes(query);
        const matchesMessage = c.message.toLowerCase().includes(query);
        const matchesDate = (c.date || '').toLowerCase().includes(query);
        const matchesSrNo = c.facultySrNo?.toString().includes(query);
        if (!matchesName && !matchesMessage && !matchesDate && !matchesSrNo) return false;
      }
      return true;
    });
  }, [validation.conflicts, activeFilter, searchTerm]);

  if (!isConflictsModalOpen && !forceOpen) return null;

  const handleLocateOnGrid = (conflict: ValidationConflict) => {
    if (conflict.facultySrNo && conflict.date) {
      setTargetedConflictCell({
        facultySrNo: conflict.facultySrNo,
        date: conflict.date,
        session: conflict.session,
      });
      setActiveTab('schedule');
      setIsConflictsModalOpen(false);
    } else if (conflict.facultySrNo) {
      const firstActiveDate = project.examPeriod.dates.find((d) => !d.isExcluded)?.date || '';
      setTargetedConflictCell({
        facultySrNo: conflict.facultySrNo,
        date: firstActiveDate,
        session: conflict.session,
      });
      setActiveTab('schedule');
      setIsConflictsModalOpen(false);
    }
  };

  const handleRemoveConflictingDuty = (conflict: ValidationConflict) => {
    if (!conflict.facultySrNo || !conflict.date || !conflict.session) return;
    const assignment = project.assignments.find(
      (a) =>
        a.facultySrNo === conflict.facultySrNo &&
        a.date === conflict.date &&
        a.session === conflict.session
    );
    if (assignment) {
      removeAssignment(assignment.id);
      setSuccessToast(`Removed conflicting duty for ${conflict.facultyName || `Sr #${conflict.facultySrNo}`}`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const handleCleanAllExcludedDuties = () => {
    const res = cleanExcludedDateAssignments();
    setSuccessToast(`Cleaned ${res.cleanedCount} orphan duty assignment(s) from non-examination dates.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={() => setIsConflictsModalOpen(false)}
    >
      <div
        className="apple-glass-card w-full max-w-3xl max-h-[90vh] flex flex-col bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-specular-rim" />

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Schedule Conflicts &amp; Rule Violations
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 tabular-nums font-mono">
                  {validation.hardConflictsCount} Critical
                </span>
                {validation.softWarningsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 tabular-nums font-mono">
                    {validation.softWarningsCount} Warnings
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mathematical validator inspection: identify rule breaches, orphan slots, and jump directly to conflicting schedule cells.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConflictsModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {successToast && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Orphan Excluded Dates Banner */}
        {orphanExcludedDuties.length > 0 && (
          <div className="mx-5 mt-3 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-100 block">
                  {orphanExcludedDuties.length} Duty Slot(s) Assigned on Non-Examination / Excluded Dates
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300/90 block">
                  These duties increment the faculty workload count but do not appear in the active timetable grid.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCleanAllExcludedDuties}
              className="btn-spring px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Excluded Duties</span>
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({validation.conflicts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('hard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'hard'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hard Conflicts ({validation.hardConflictsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('soft')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'soft'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Warnings ({validation.softWarningsCount})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search faculty, date, rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Conflicts List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 touch-scroll">
          {conflictsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 opacity-80 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {validation.conflicts.length === 0
                  ? 'All Scheduling Constraints Satisfied'
                  : 'No conflicts match the current search filter.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {validation.conflicts.length === 0
                  ? 'The current examination duty schedule has 0 mathematical rule conflicts.'
                  : 'Try clearing the search query or selecting a different filter tab.'}
              </p>
            </div>
          ) : (
            conflictsList.map((c) => {
              const isHard = c.type === 'hard';
              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isHard
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isHard
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {isHard ? 'Critical Violation' : 'Warning'}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 uppercase">
                          {c.category.replace(/_/g, ' ')}
                        </span>

                        {c.facultyName && (
                          <span className="flex items-center space-x-1 text-xs font-bold text-slate-900 dark:text-white">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.facultyName}</span>
                            {c.facultySrNo && (
                              <span className="text-[10px] font-mono text-slate-400">
                                (#{c.facultySrNo})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {c.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {c.date && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{c.date}</span>
                          </span>
                        )}
                        {c.session && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold">{c.session}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => handleLocateOnGrid(c)}
                        className="btn-spring flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs cursor-pointer transition"
                        title="Jump to this faculty member and date in the schedule matrix"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Locate on Grid</span>
                      </button>

                      {c.facultySrNo && c.date && c.session && (
                        <button
                          type="button"
                          onClick={() => handleRemoveConflictingDuty(c)}
                          className="btn-spring flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition cursor-pointer"
                          title="Remove this duty assignment to resolve conflict"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Remove Duty</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Positions: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{validation.totalFilledPositions}</strong> / <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{validation.totalRequiredPositions}</strong>
          </div>
          <button
            type="button"
            onClick={() => setIsConflictsModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );

  return modalContent;
};
