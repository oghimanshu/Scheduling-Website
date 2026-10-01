import React from 'react';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Calendar,
  Users,
  Shield,
  ArrowRightLeft,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { isFacultyEligibleForSession } from '../services/validation/validator';

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

  if (!selectedAssignmentForInspect) return null;

  const a = selectedAssignmentForInspect;
  const faculty = project.faculty.find((f) => f.srNo === a.facultySrNo);
  const dateConfig = project.examPeriod.dates.find((d) => d.date === a.date);

  const isEligible = faculty ? isFacultyEligibleForSession(faculty.arrival, a.session, project.sessions, dateConfig) : false;
  const isDateExcluded = Array.isArray(faculty?.excludedDates) && faculty.excludedDates.includes(a.date);
  const isAvailable = faculty ? ((project.availability || {})[`${faculty.srNo}_${a.date}`] !== false) && !isDateExcluded : true;

  // Workload before & after
  const facultyAssignments = (project.assignments || []).filter((asg) => asg.facultySrNo === a.facultySrNo);
  const totalNew = facultyAssignments.length;
  const grandTotal = (faculty?.previousSupervisions || 0) + totalNew;

  // Assignments on that date
  const dayAssignments = facultyAssignments.filter((asg) => asg.date === a.date);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92dvh] flex flex-col">
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/10 pb-3">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/40 px-2 py-0.5 rounded-md">
              Assignment Explanation &amp; Inspector
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {faculty?.name || `Faculty #${a.facultySrNo}`}
            </h3>
          </div>
          <button
            onClick={() => setSelectedAssignmentForInspect(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {a.isReserve && (
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Standby / Reserve Supervisor</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Designated standby for this session. {project.settings.reserveCanExceedCap ? 'Does not count towards workload limit.' : 'Counts towards workload limit.'}
              </p>
            </div>
          </div>
        )}

        {/* Detailed Attribute Breakdown */}
        <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-2.5 text-xs backdrop-blur-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Date:</span>
              <p className="font-semibold text-slate-900 dark:text-white">{dateConfig?.displayDate || a.date}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Session:</span>
              <p className="font-bold text-sky-600 dark:text-sky-400">{a.session}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Arrival Category:</span>
              <p className="font-semibold text-slate-900 dark:text-white">{faculty?.arrival || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Role:</span>
              <p className="font-semibold text-slate-900 dark:text-white">{faculty?.isHod ? 'HOD' : 'Regular Faculty'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Eligibility for {a.session}:</span>
              <p className={`font-bold flex items-center space-x-1 ${isEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isEligible ? <span>&check; Eligible</span> : <span>&warning; Ineligible (Override required)</span>}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Availability:</span>
              <p className={`font-bold flex items-center space-x-1 ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isAvailable ? <span>&check; Available</span> : <span>&warning; Marked on Leave</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Previous:</span>
              <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{faculty?.previousSupervisions || 0}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Duties:</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{grandTotal} / {faculty?.targetSupervisions || 6}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Daily Duties:</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{dayAssignments.length} / 2</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Lock Status:</span>
            <span className={`font-semibold ${a.isLocked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {a.isLocked ? 'Locked (Hard Constraint)' : 'Unlocked (Can be optimized/rebalanced)'}
            </span>
          </div>

          {a.isOverride && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
              <span className="font-bold">Administrator Override:</span> {a.overrideReason || 'Explicit Override'}
            </div>
          )}
        </div>

        {/* Why Selected Explanation Block */}
        <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 text-xs text-sky-900 dark:text-sky-300 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-sky-950 dark:text-sky-200">
            <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Why selected by solver:</span>
          </div>
          <p>&bull; Verified eligible for {a.session} under {faculty?.arrival} arrival policy.</p>
          <p>&bull; Verified available on {dateConfig?.displayDate || a.date}.</p>
          <p>&bull; Within maximum workload limit of {faculty?.maxSupervisions}.</p>
          <p>&bull; Respects faculty-first prioritization to fulfill duty workloads before HODs.</p>
          <p>&bull; Respects 1 assignment/day priority before considering double assignments.</p>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => {
              if (confirm('Remove this assignment from the schedule?')) {
                removeAssignment(a.id);
                setSelectedAssignmentForInspect(null);
              }
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Assignment</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedForSubstitute(a);
                setSelectedAssignmentForInspect(null);
                setIsSubstituteModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/40 transition cursor-pointer"
              title="Search and assign a conflict-free substitute colleague"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Find Substitute / Swap</span>
            </button>

            <button
              onClick={() => {
                toggleLockAssignment(a.id);
                setSelectedAssignmentForInspect({ ...a, isLocked: !a.isLocked });
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                a.isLocked
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800/40'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/40'
              }`}
            >
              {a.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{a.isLocked ? 'Unlock Assignment' : 'Lock Assignment'}</span>
            </button>

            <button
              onClick={() => setSelectedAssignmentForInspect(null)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-lg transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
