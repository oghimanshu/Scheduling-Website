import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Assignment, Faculty, SessionType } from '../types';
import { useScheduler } from '../context/SchedulerContext';
import { isFacultyEligibleForSession, isFacultyAvailableForSlot } from '../services/validation/validator';

interface MoveDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  faculty: Faculty | null;
  onExecuteMove: (params: {
    targetDate: string;
    targetSession: SessionType;
    targetFacultySrNo: number;
    lockDuty: boolean;
  }) => void;
}

export const MoveDutyModal: React.FC<MoveDutyModalProps> = ({
  isOpen,
  onClose,
  assignment,
  faculty,
  onExecuteMove,
}) => {
  const { project } = useScheduler();

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  const [targetDate, setTargetDate] = useState<string>('');
  const [targetSession, setTargetSession] = useState<SessionType>('JRS 1');
  const [targetFacultySrNo, setTargetFacultySrNo] = useState<number>(0);
  const [lockDuty, setLockDuty] = useState<boolean>(true);
  const [allowOverride, setAllowOverride] = useState<boolean>(false);

  // Initialize form state when assignment or faculty changes
  useEffect(() => {
    if (assignment && faculty) {
      // Default to next active date, or the same date if only 1 active date
      const otherDate = activeDates.find((d) => d.date !== assignment.date)?.date || assignment.date;
      setTargetDate(otherDate);
      setTargetSession(assignment.session);
      setTargetFacultySrNo(faculty.srNo);
      setLockDuty(true);
      setAllowOverride(false);
    }
  }, [assignment, faculty, activeDates]);

  const targetFaculty = useMemo(() => {
    return project.faculty.find((f) => Number(f.srNo) === Number(targetFacultySrNo)) || faculty;
  }, [project.faculty, targetFacultySrNo, faculty]);

  const selectedDateConfig = useMemo(() => {
    return activeDates.find((d) => d.date === targetDate);
  }, [activeDates, targetDate]);

  // Available sessions for the selected target date
  const availableSessions = useMemo(() => {
    if (!selectedDateConfig) return ['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[];
    const sessions = Object.keys(selectedDateConfig.sessionRequirements) as SessionType[];
    return sessions.length > 0 ? sessions : (['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]);
  }, [selectedDateConfig]);

  // Ensure targetSession remains valid when changing dates
  useEffect(() => {
    if (availableSessions.length > 0 && !availableSessions.includes(targetSession)) {
      setTargetSession(availableSessions[0]);
    }
  }, [availableSessions, targetSession]);

  // Current duty workload stats
  const currentFacultyDuties = useMemo(() => {
    if (!faculty) return 0;
    return (project.assignments || []).filter((a) => a.facultySrNo === faculty.srNo).length;
  }, [faculty, project.assignments]);

  // Conflict evaluation for target date, session, and faculty
  const conflictWarnings = useMemo(() => {
    if (!assignment || !targetFaculty || !selectedDateConfig) return [];
    const warnings: string[] = [];

    // 1. Availability check
    const isAvail = isFacultyAvailableForSlot(
      targetFaculty,
      targetDate,
      targetSession,
      project.availability
    );
    if (!isAvail) {
      warnings.push(`${targetFaculty.name} is marked unavailable or on leave on ${selectedDateConfig.displayDate}.`);
    }

    // 2. Arrival category eligibility
    const isEligibleArrival = isFacultyEligibleForSession(
      targetFaculty.arrival,
      targetSession,
      project.sessions,
      selectedDateConfig
    );
    if (!isEligibleArrival) {
      warnings.push(`Arrival category '${targetFaculty.arrival}' is not eligible for ${targetSession}.`);
    }

    // 3. Daily duty count check (max 2 per day)
    const dutiesOnTargetDate = (project.assignments || []).filter(
      (a) => a.facultySrNo === targetFaculty.srNo && a.date === targetDate && a.id !== assignment.id
    );
    if (dutiesOnTargetDate.length >= 2) {
      warnings.push(`${targetFaculty.name} already has 2 duties on this date (daily limit reached).`);
    }

    // 4. Duplicate assignment in exact same slot
    const alreadyInSlot = dutiesOnTargetDate.some((a) => a.session === targetSession);
    if (alreadyInSlot) {
      warnings.push(`${targetFaculty.name} already has a duty in ${targetSession} on this date.`);
    }

    // 5. Workload cap check (only if transferring to a different faculty member)
    if (targetFaculty.srNo !== assignment.facultySrNo) {
      const tgtDutiesCount = (project.assignments || []).filter(
        (a) => a.facultySrNo === targetFaculty.srNo
      ).length;
      const totalProjected = tgtDutiesCount + (targetFaculty.previousSupervisions || 0) + 1;
      if (totalProjected > targetFaculty.maxSupervisions) {
        warnings.push(`Transfer would exceed maximum workload cap (${totalProjected}/${targetFaculty.maxSupervisions}).`);
      }
    }

    return warnings;
  }, [assignment, targetFaculty, selectedDateConfig, targetDate, targetSession, project.availability, project.sessions, project.assignments]);

  if (!isOpen || !assignment || !faculty) return null;

  const isSameSlot =
    targetDate === assignment.date &&
    targetSession === assignment.session &&
    targetFacultySrNo === faculty.srNo;

  const hasConflicts = conflictWarnings.length > 0;
  const canSubmit = !isSameSlot && (!hasConflicts || allowOverride);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onExecuteMove({
      targetDate,
      targetSession,
      targetFacultySrNo,
      lockDuty,
    });
    onClose();
  };

  const sourceDateConfig = project.examPeriod.dates.find((d) => d.date === assignment.date);
  const sourceDateDisplay = sourceDateConfig?.displayDate || assignment.date;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print"
      data-lenis-prevent
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-modal-spring flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Move Duty Across Dates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer duty to another date and auto-fill the vacated slot
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Current Duty Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center">
                  #{faculty.srNo}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {faculty.name}
                </span>
                {faculty.isHod && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    HOD
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Workload: {currentFacultyDuties}/{faculty.maxSupervisions}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Current Duty:</span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-sky-600 dark:text-sky-400">
                {sourceDateDisplay}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-indigo-600 dark:text-indigo-400">
                {assignment.session}
              </span>
              {assignment.roomName && (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                  {assignment.roomName}
                </span>
              )}
            </div>
          </div>

          {/* Transfer Target Form */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Transfer Destination
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Target Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Date
                </label>
                <select
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  {activeDates.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.displayDate} ({d.dayOfWeek})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Session
                </label>
                <select
                  value={targetSession}
                  onChange={(e) => setTargetSession(e.target.value as SessionType)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  {availableSessions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Faculty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Faculty
              </label>
              <select
                value={targetFacultySrNo}
                onChange={(e) => setTargetFacultySrNo(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option value={faculty.srNo}>
                  Keep {faculty.name} (move duty date for this person)
                </option>
                <optgroup label="Or transfer to another colleague:">
                  {project.faculty
                    .filter((f) => f.srNo !== faculty.srNo && !f.isExcluded)
                    .map((f) => (
                      <option key={f.srNo} value={f.srNo}>
                        #{f.srNo} {f.name} ({f.arrival} Arrival, {f.department || 'General'})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Automatic Lock Option */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
              <input
                type="checkbox"
                id="lockMovedDuty"
                checked={lockDuty}
                onChange={(e) => setLockDuty(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="lockMovedDuty" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <span className="font-semibold flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lock duty after transfer (Recommended)</span>
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Protects this duty so automated rebalancing will never unassign or move it.
                </span>
              </label>
            </div>
          </div>

          {/* Informative Auto-Backfill Notice */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <span className="font-semibold">Automatic Source Backfill:</span>
              <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                The vacated slot on {sourceDateDisplay} ({assignment.session}) will be automatically filled with an optimal eligible substitute. A 1-click option to rebalance the rest of the schedule will appear right after.
              </p>
            </div>
          </div>

          {/* Conflict Warnings (if any) */}
          {hasConflicts && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Scheduling Conflicts Detected:</span>
              </div>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 pl-6 list-disc">
                {conflictWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowOverride"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="allowOverride" className="text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer select-none">
                  Authorize Administrative Override for this transfer
                </label>
              </div>
            </div>
          )}

          {isSameSlot && (
            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
              Please choose a different date, session, or faculty member to perform a transfer.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-spring px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn-spring px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md flex items-center space-x-1.5 cursor-pointer ${
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <span>Confirm Move & Auto-fill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
