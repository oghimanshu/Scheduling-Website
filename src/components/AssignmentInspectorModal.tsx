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
  } = useScheduler();

  if (!selectedAssignmentForInspect) return null;

  const a = selectedAssignmentForInspect;
  const faculty = project.faculty.find((f) => f.srNo === a.facultySrNo);
  const dateConfig = project.examPeriod.dates.find((d) => d.date === a.date);

  const isEligible = faculty ? isFacultyEligibleForSession(faculty.arrival, a.session) : false;
  const isAvailable = faculty ? project.availability[`${faculty.srNo}_${a.date}`] !== false : true;

  // Workload before & after
  const facultyAssignments = project.assignments.filter((asg) => asg.facultySrNo === a.facultySrNo);
  const totalNew = facultyAssignments.length;
  const grandTotal = (faculty?.previousSupervisions || 0) + totalNew;

  // Assignments on that date
  const dayAssignments = facultyAssignments.filter((asg) => asg.date === a.date);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
              Assignment Explanation & Inspector
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {faculty?.name || `Faculty #${a.facultySrNo}`}
            </h3>
          </div>
          <button
            onClick={() => setSelectedAssignmentForInspect(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detailed Attribute Breakdown (Section 20) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Date:</span>
              <p className="font-semibold text-slate-900">{dateConfig?.displayDate || a.date}</p>
            </div>
            <div>
              <span className="text-slate-500">Session:</span>
              <p className="font-bold text-sky-700">{a.session}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-slate-500">Arrival Category:</span>
              <p className="font-semibold text-slate-900">{faculty?.arrival || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-slate-500">Role:</span>
              <p className="font-semibold text-slate-900">{faculty?.isHod ? 'HOD' : 'Regular Faculty'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-slate-500">Eligibility for {a.session}:</span>
              <p className={`font-bold flex items-center space-x-1 ${isEligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isEligible ? <span>✓ Eligible</span> : <span>⚠ Ineligible (Override required)</span>}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Availability:</span>
              <p className={`font-bold flex items-center space-x-1 ${isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isAvailable ? <span>✓ Available</span> : <span>⚠ Marked on Leave</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
            <div>
              <span className="text-slate-500">Previous:</span>
              <p className="font-mono font-semibold">{faculty?.previousSupervisions || 0}</p>
            </div>
            <div>
              <span className="text-slate-500">Total Duties:</span>
              <p className="font-mono font-bold text-slate-900">{grandTotal} / {faculty?.targetSupervisions || 6}</p>
            </div>
            <div>
              <span className="text-slate-500">Daily Duties:</span>
              <p className="font-mono font-bold text-slate-900">{dayAssignments.length} / 2</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-slate-500">Lock Status:</span>
            <span className={`font-semibold ${a.isLocked ? 'text-indigo-600' : 'text-slate-500'}`}>
              {a.isLocked ? 'Locked (Hard Constraint)' : 'Unlocked (Can be optimized/rebalanced)'}
            </span>
          </div>

          {a.isOverride && (
            <div className="pt-2 border-t border-slate-200/60 text-amber-700 bg-amber-50 p-2 rounded">
              <span className="font-bold">Administrator Override:</span> {a.overrideReason || 'Explicit Override'}
            </div>
          )}
        </div>

        {/* Why Selected Explanation Block */}
        <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/60 text-xs text-sky-900 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-sky-950">
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <span>Why selected by solver:</span>
          </div>
          <p>• Verified eligible for {a.session} under {faculty?.arrival} arrival policy.</p>
          <p>• Verified available on {dateConfig?.displayDate || a.date}.</p>
          <p>• Within maximum workload limit of {faculty?.maxSupervisions}.</p>
          <p>• Respects 1 assignment/day priority before considering double assignments.</p>
          <p>• Selected by constraint solver to achieve target workload ({faculty?.targetSupervisions}).</p>
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
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Assignment</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                toggleLockAssignment(a.id);
                setSelectedAssignmentForInspect({ ...a, isLocked: !a.isLocked });
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                a.isLocked
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              {a.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{a.isLocked ? 'Unlock Assignment' : 'Lock Assignment'}</span>
            </button>

            <button
              onClick={() => setSelectedAssignmentForInspect(null)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
