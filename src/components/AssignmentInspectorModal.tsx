import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Shield,
  ArrowRightLeft,
  User,
  Calendar,
  Layers,
  BarChart3,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { isFacultyEligibleForSession } from '../services/validation/validator';
import { useScrollIsolation } from '../hooks/useScrollIsolation';

export const AssignmentInspectorModal: React.FC = () => {
  const {
    project,
    selectedAssignmentForInspect,
    setSelectedAssignmentForInspect,
    toggleLockAssignment,
    removeAssignment,
    setSelectedForSubstitute,
    setIsSubstituteModalOpen,
  } = useScheduler();

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollIsolation(scrollRef);

  if (!selectedAssignmentForInspect) return null;

  const a = selectedAssignmentForInspect;
  const faculty = project.faculty.find((f) => f.srNo === a.facultySrNo);
  const dateConfig = project.examPeriod.dates.find((d) => d.date === a.date);

  const isEligible = faculty
    ? isFacultyEligibleForSession(faculty.arrival, a.session, project.sessions, dateConfig)
    : false;
  const isDateExcluded =
    Array.isArray(faculty?.excludedDates) && faculty.excludedDates.includes(a.date);
  const isAvailable =
    faculty
      ? (project.availability || {})[`${faculty.srNo}_${a.date}`] !== false && !isDateExcluded
      : true;

  // Workload stats
  const facultyAssignments = (project.assignments || []).filter(
    (asg) => asg.facultySrNo === a.facultySrNo
  );
  const totalNew = facultyAssignments.length;
  const previousSupervisions = faculty?.previousSupervisions || 0;
  const grandTotal = previousSupervisions + totalNew;
  const maxCap = faculty?.maxSupervisions || 6;
  const targetQuota = faculty?.targetSupervisions || 6;
  const workloadPercent = Math.min(100, Math.round((grandTotal / maxCap) * 100));

  // Assignments on that date
  const dayAssignments = facultyAssignments.filter((asg) => asg.date === a.date);

  // Color for workload progress
  const workloadColor =
    grandTotal > maxCap
      ? 'bg-rose-500'
      : grandTotal === maxCap
      ? 'bg-amber-500'
      : grandTotal >= targetQuota
      ? 'bg-emerald-500'
      : 'bg-sky-500';

  const workloadTextColor =
    grandTotal > maxCap
      ? 'text-rose-600 dark:text-rose-400'
      : grandTotal === maxCap
      ? 'text-amber-600 dark:text-amber-400'
      : grandTotal >= targetQuota
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-sky-600 dark:text-sky-400';

  const content = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      data-lenis-prevent
      onClick={() => setSelectedAssignmentForInspect(null)}
    >
      <div
        className="apple-glass-card bg-white/97 dark:bg-slate-900/97 rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/80 dark:border-white/10 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-start px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-widest uppercase text-sky-600 dark:text-sky-400">
                Assignment Inspector
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {faculty?.name || `Faculty #${a.facultySrNo}`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {faculty?.isHod ? 'HOD' : 'Regular Faculty'}
                {faculty?.role && faculty.role !== 'Regular Faculty' && ` · ${faculty.role}`}
                {' · '}Sr. #{a.facultySrNo}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedAssignmentForInspect(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">

          {/* Reserve Badge */}
          {a.isReserve && (
            <div className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200">
              <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block">Standby / Reserve Supervisor</span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Designated standby for this session.{' '}
                  {project.settings.reserveCanExceedCap
                    ? 'Does not count towards workload limit.'
                    : 'Counts towards workload limit.'}
                </p>
              </div>
            </div>
          )}

          {/* Override Badge */}
          {a.isOverride && (
            <div className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <div>
                <span className="font-bold block">Administrator Override</span>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  {a.overrideReason || 'Explicit override applied by administrator.'}
                </p>
              </div>
            </div>
          )}

          {/* Assignment Details Grid */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200/80 dark:divide-white/10">
              <div className="p-3 space-y-0.5">
                <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium">Date</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {dateConfig?.displayDate || a.date}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {dateConfig?.dayOfWeek || ''}
                </p>
              </div>
              <div className="p-3 space-y-0.5">
                <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="font-medium">Session</span>
                </div>
                <p className="font-bold text-sky-600 dark:text-sky-400 text-sm">{a.session}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {faculty?.arrival || 'Unknown'} arrival
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-white/10 grid grid-cols-2 divide-x divide-slate-200/80 dark:divide-white/10">
              {/* Eligibility */}
              <div className="p-3">
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-1.5">Eligibility</p>
                {isEligible ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Eligible</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Ineligible</span>
                  </span>
                )}
              </div>
              {/* Availability */}
              <div className="p-3">
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-1.5">Availability</p>
                {isAvailable ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Available</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>On Leave</span>
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-white/10 p-3 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Lock Status</span>
              <span
                className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  a.isLocked
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {a.isLocked ? (
                  <><Lock className="w-3 h-3" /><span>Locked</span></>
                ) : (
                  <><Unlock className="w-3 h-3" /><span>Unlocked</span></>
                )}
              </span>
            </div>
          </div>

          {/* Workload Progress Card */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Workload</span>
              </div>
              <span className={`font-bold text-sm ${workloadTextColor}`}>
                {grandTotal} / {maxCap}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${workloadColor}`}
                style={{ width: `${workloadPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div className="text-center">
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{previousSupervisions}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Previous</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{totalNew}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">New This Session</p>
              </div>
              <div className="text-center">
                <p className={`font-mono font-bold ${workloadTextColor}`}>{dayAssignments.length} / 2</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Today's Duties</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-200/60 dark:border-white/10">
              <span>Target: <strong className="text-slate-700 dark:text-slate-200">{targetQuota}</strong></span>
              <span>Max Cap: <strong className="text-slate-700 dark:text-slate-200">{maxCap}</strong></span>
              <span className={workloadPercent >= 100 ? 'text-rose-500 font-bold' : workloadPercent >= 80 ? 'text-amber-500 font-semibold' : ''}>
                {workloadPercent}% utilized
              </span>
            </div>
          </div>

          {/* Why Selected By Solver */}
          <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 text-sky-900 dark:text-sky-300 space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5 text-sky-800 dark:text-sky-200 mb-2">
              <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Why selected by solver</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p>Verified eligible for <strong>{a.session}</strong> under <strong>{faculty?.arrival}</strong> arrival policy.</p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p>Verified available on <strong>{dateConfig?.displayDate || a.date}</strong>.</p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p>Within maximum workload limit of <strong>{faculty?.maxSupervisions}</strong>.</p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p>Respects faculty-first prioritization to fulfill duty workloads before HODs.</p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <p>Respects 1 assignment/day priority before considering double assignments.</p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0">
          {/* Top row: Remove + Find Substitute */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                if (confirm('Remove this assignment from the schedule?')) {
                  removeAssignment(a.id);
                  setSelectedAssignmentForInspect(null);
                }
              }}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Remove Assignment</span>
            </button>

            <button
              onClick={() => {
                setSelectedForSubstitute(a);
                setSelectedAssignmentForInspect(null);
                setIsSubstituteModalOpen(true);
              }}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/40 transition cursor-pointer"
              title="Search and assign a conflict-free substitute colleague"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Find Substitute</span>
            </button>
          </div>

          {/* Bottom row: Lock + Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleLockAssignment(a.id);
                setSelectedAssignmentForInspect({ ...a, isLocked: !a.isLocked });
              }}
              className={`flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                a.isLocked
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800/40'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/40'
              }`}
            >
              {a.isLocked ? <Unlock className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
              <span>{a.isLocked ? 'Unlock Assignment' : 'Lock Assignment'}</span>
            </button>

            <button
              onClick={() => setSelectedAssignmentForInspect(null)}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
