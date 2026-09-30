import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  Plus,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType, Faculty } from '../types';
import { isFacultyEligibleForSession } from '../services/validation/validator';

export const ManualEditModal: React.FC = () => {
  const {
    project,
    manualEditSlot,
    setManualEditSlot,
    addOrUpdateAssignment,
    swapFacultyAssignments,
  } = useScheduler();

  const [mode, setMode] = useState<'add' | 'swap'>('add');
  const [selectedFacultySrNo, setSelectedFacultySrNo] = useState<number>(
    manualEditSlot?.facultySrNo || project.faculty[0]?.srNo || 0
  );
  const [selectedSession, setSelectedSession] = useState<SessionType>(
    manualEditSlot?.session || 'JRS 2'
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    manualEditSlot?.date || project.examPeriod.dates[0]?.date || ''
  );

  // Swap targets
  const [swapTargetSrNo, setSwapTargetSrNo] = useState<number>(project.faculty[1]?.srNo || 0);

  // Override State
  const [isOverrideAuthorized, setIsOverrideAuthorized] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!manualEditSlot) return null;

  const currentFaculty = project.faculty.find((f) => f.srNo === selectedFacultySrNo);
  const dateConfig = project.examPeriod.dates.find((d) => d.date === selectedDate);

  // Check conflicts before adding
  const isEligible = currentFaculty
    ? isFacultyEligibleForSession(currentFaculty.arrival, selectedSession, project.sessions, dateConfig)
    : true;
  const isAvailable = currentFaculty
    ? project.availability[`${currentFaculty.srNo}_${selectedDate}`] !== false
    : true;

  const existingAssignmentsToday = project.assignments.filter(
    (a) => a.facultySrNo === selectedFacultySrNo && a.date === selectedDate
  );
  const hasDailyLimitViolation = existingAssignmentsToday.length >= 2;

  const facultyAssignmentsCount = project.assignments.filter(
    (a) => a.facultySrNo === selectedFacultySrNo
  ).length;
  const hasWorkloadViolation =
    currentFaculty &&
    currentFaculty.previousSupervisions + facultyAssignmentsCount >= currentFaculty.maxSupervisions;

  const needsOverride = !isEligible || !isAvailable || hasDailyLimitViolation || hasWorkloadViolation;

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (needsOverride && !isOverrideAuthorized) {
      setErrorMessage(
        'This assignment violates scheduling rules (eligibility, availability, or workload). You must explicitly check "Authorize Administrator Override" and supply a reason.'
      );
      return;
    }

    if (needsOverride && isOverrideAuthorized && !overrideReason.trim()) {
      setErrorMessage('Please provide a valid administrative rationale for this override.');
      return;
    }

    const res = addOrUpdateAssignment(
      selectedFacultySrNo,
      selectedDate,
      selectedSession,
      needsOverride && isOverrideAuthorized,
      overrideReason
    );

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to add assignment.');
      return;
    }

    setManualEditSlot(null);
  };

  const handleSwapFaculty = () => {
    if (selectedFacultySrNo === swapTargetSrNo) {
      alert('Cannot swap a faculty member with themselves.');
      return;
    }
    swapFacultyAssignments(
      selectedFacultySrNo,
      selectedDate,
      selectedSession,
      swapTargetSrNo,
      selectedDate,
      selectedSession
    );
    setManualEditSlot(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Manual Duty Assignment &amp; Administrator Override
            </h3>
          </div>
          <button
            onClick={() => setManualEditSlot(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Add vs Swap */}
        <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'add' ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Assign Duty
          </button>
          <button
            type="button"
            onClick={() => setMode('swap')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'swap' ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Swap Duty with Peer
          </button>
        </div>

        {mode === 'add' ? (
          <form onSubmit={handleAddAssignment} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Faculty Member</label>
              <select
                value={selectedFacultySrNo}
                onChange={(e) => setSelectedFacultySrNo(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {project.faculty.map((f) => (
                  <option key={f.srNo} value={f.srNo}>
                    #{f.srNo} - {f.name} ({f.arrival} Arrival, {f.isHod ? 'HOD' : 'Regular'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                >
                  {project.examPeriod.dates
                    .filter((d) => !d.isExcluded)
                    .map((d) => (
                      <option key={d.date} value={d.date}>
                        {d.displayDate}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value as SessionType)}
                  className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="JRS 1">JRS 1 (8:00 - 10:00 AM)</option>
                  <option value="JRS 2">JRS 2 (10:30 - 12:30 PM)</option>
                  <option value="JRS 3">JRS 3 (2:00 - 4:00 PM)</option>
                </select>
              </div>
            </div>

            {/* Conflict Warnings if any */}
            {needsOverride && (
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-amber-950 dark:text-amber-100">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Rule Conflict Detected:</span>
                </div>
                {!isEligible && (
                  <p>&bull; {currentFaculty?.name} has {currentFaculty?.arrival} arrival and is normally ineligible for {selectedSession}.</p>
                )}
                {!isAvailable && (
                  <p>&bull; {currentFaculty?.name} is currently marked UNAVAILABLE / on leave on this date.</p>
                )}
                {hasDailyLimitViolation && (
                  <p>&bull; {currentFaculty?.name} already has {existingAssignmentsToday.length} duties on this date (Daily Limit is 2).</p>
                )}
                {hasWorkloadViolation && (
                  <p>&bull; {currentFaculty?.name} has reached their maximum workload limit ({currentFaculty?.maxSupervisions}).</p>
                )}
              </div>
            )}

            {/* Explicit Override Controls */}
            {needsOverride && (
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40 text-rose-950 dark:text-rose-200 space-y-2">
                <label className="flex items-center space-x-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOverrideAuthorized}
                    onChange={(e) => setIsOverrideAuthorized(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                  <span>Authorize Administrator Override (Will be logged)</span>
                </label>

                {isOverrideAuthorized && (
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-900 dark:text-rose-300 mb-1">
                      Override Reason (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Authorized by Dean / Special emergency duty..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-rose-300 dark:border-rose-700 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{errorMessage}</div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setManualEditSlot(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Swap duty for {currentFaculty?.name} on {dateConfig?.displayDate || selectedDate} ({selectedSession}) with another faculty member:
            </p>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Swap With Faculty</label>
              <select
                value={swapTargetSrNo}
                onChange={(e) => setSwapTargetSrNo(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
              >
                {project.faculty
                  .filter((f) => f.srNo !== selectedFacultySrNo)
                  .map((f) => (
                    <option key={f.srNo} value={f.srNo}>
                      #{f.srNo} - {f.name} ({f.arrival})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setManualEditSlot(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwapFaculty}
                className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center space-x-1 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Execute Swap</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
