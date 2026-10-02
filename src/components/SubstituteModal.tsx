import React, { useState, useMemo } from 'react';
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Lock,
  ArrowRightLeft,
  Sparkles,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Assignment, Faculty, ExamDateConfig, SubstituteCandidate } from '../types';
import { isFacultyEligibleForSession } from '../services/validation/validator';

interface SubstituteModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
}

export const SubstituteModal: React.FC<SubstituteModalProps> = ({
  assignment,
  isOpen,
  onClose,
  forceOpen,
}) => {
  const { project, atomicTransferOrSwapDuty, setSelectedForSubstitute } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(true);
  const [lockAfterSubstitute, setLockAfterSubstitute] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fallback assignment for tests/snapshots if forceOpen
  const targetAssignment: Assignment | null = useMemo(() => {
    if (assignment) return assignment;
    if (project.assignments.length > 0) return project.assignments[0];
    if (forceOpen) {
      const activeDate = project.examPeriod.dates.find((d) => !d.isExcluded) || project.examPeriod.dates[0];
      return {
        id: 'mock-asg',
        facultySrNo: project.faculty[0]?.srNo || 1,
        date: activeDate?.date || '2026-10-06',
        session: 'JRS 1',
        isLocked: false,
        isOverride: false,
      };
    }
    return null;
  }, [assignment, project.assignments, project.examPeriod.dates, project.faculty, forceOpen]);

  const currentFaculty = useMemo(() => {
    if (!targetAssignment) return null;
    return project.faculty.find((f) => f.srNo === targetAssignment.facultySrNo) || null;
  }, [targetAssignment, project.faculty]);

  const dateConfig = useMemo(() => {
    if (!targetAssignment) return null;
    return (
      project.examPeriod.dates.find((d) => d.date === targetAssignment.date) || {
        date: targetAssignment.date,
        displayDate: targetAssignment.date,
        dayOfWeek: '',
        isExcluded: false,
        sessionRequirements: {},
        sessionTimings: {},
      }
    );
  }, [targetAssignment, project.examPeriod.dates]);

  // Evaluate all faculty members as substitute candidates
  const candidates: SubstituteCandidate[] = useMemo(() => {
    if (!targetAssignment || !dateConfig) return [];

    return project.faculty
      .filter((f) => f.srNo !== targetAssignment.facultySrNo && !f.isExcluded)
      .map((f) => {
        const conflictReasons: string[] = [];

        // 1. Availability check
        const isDateExcluded = Array.isArray(f.excludedDates) && f.excludedDates.includes(targetAssignment.date);
        const isAvail = (project.availability?.[`${f.srNo}_${targetAssignment.date}`] !== false) && !isDateExcluded;
        if (!isAvail) conflictReasons.push('Marked Unavailable on this date');

        // 2. Arrival eligibility check for this date and session
        const isEligibleArrival = isFacultyEligibleForSession(
          f.arrival,
          targetAssignment.session,
          project.sessions,
          dateConfig
        );
        if (!isEligibleArrival) {
          conflictReasons.push(`Ineligible arrival category (${f.arrival}) for ${targetAssignment.session}`);
        }

        // 3. Daily duty checks
        const dutiesOnDate = (project.assignments || []).filter(
          (a) => a.facultySrNo === f.srNo && a.date === targetAssignment.date
        );
        const inThisSession = dutiesOnDate.some((a) => a.session === targetAssignment.session);
        if (inThisSession) {
          conflictReasons.push('Already assigned in this exact session');
        }

        const hasOverlappingDuty = dutiesOnDate.length >= 2;
        if (hasOverlappingDuty) {
          conflictReasons.push('Already assigned to 2 duties today (Daily Limit Reached)');
        }

        // 4. Max workload check
        const currentDutyCount = (project.assignments || []).filter(
          (a) => a.facultySrNo === f.srNo
        ).length;
        const totalWorkload = currentDutyCount + (f.previousSupervisions || 0);
        if (totalWorkload >= f.maxSupervisions) {
          conflictReasons.push(`At maximum workload cap (${totalWorkload}/${f.maxSupervisions})`);
        }

        const isEligible = conflictReasons.length === 0;

        // Scoring: Higher score = better replacement (eligible, low current duty count)
        let score = isEligible ? 1000 : 0;
        score -= currentDutyCount * 10;
        if (f.role === 'hod') score -= 20; // Prefer regular faculty over HOD

        return {
          faculty: f,
          currentDutyCount,
          isAvailable: isAvail,
          isEligibleArrival,
          hasOverlappingDuty,
          isEligible,
          score,
          conflictReasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [targetAssignment, dateConfig, project.faculty, project.assignments, project.availability, project.sessions]);

  // Filtered candidates by search and toggle
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (filterEligibleOnly && !c.isEligible) return false;
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        c.faculty.name.toLowerCase().includes(lower) ||
        String(c.faculty.srNo).includes(lower) ||
        c.faculty.department?.toLowerCase().includes(lower)
      );
    });
  }, [candidates, filterEligibleOnly, searchTerm]);

  if (!isOpen && !forceOpen) return null;
  if (!targetAssignment || !dateConfig) return null;

  // Execute atomic replacement
  const handleExecuteSubstitute = (subCandidate: SubstituteCandidate) => {
    const res = atomicTransferOrSwapDuty(
      targetAssignment.id,
      subCandidate.faculty.srNo,
      'replace',
      !subCandidate.isEligible,
      !subCandidate.isEligible
        ? `Substituted for ${currentFaculty?.name}: ${subCandidate.conflictReasons.join('; ')}`
        : undefined,
      lockAfterSubstitute
    );

    if (res.success) {
      setSuccessMessage(
        `Successfully substituted ${currentFaculty?.name || 'Faculty'} with ${subCandidate.faculty.name}!`
      );
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedForSubstitute(null);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Find Substitute / Duty Swap</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300/40">
                  {targetAssignment.session}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Intelligently search and replace an assigned supervisor with the best conflict-free colleague.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedForSubstitute(null);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assignment Details */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold">
              Currently Assigned Supervisor
            </span>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5 mt-0.5">
              <span>{currentFaculty?.name || `Sr. #${targetAssignment.facultySrNo}`}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 font-normal">
                {currentFaculty?.arrival} Arrival
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-medium">{dateConfig.displayDate}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-medium">
                {dateConfig.sessionTimings?.[targetAssignment.session]?.start || '08:00'} -{' '}
                {dateConfig.sessionTimings?.[targetAssignment.session]?.end || '10:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty name or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={filterEligibleOnly}
                onChange={(e) => setFilterEligibleOnly(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>Conflict-Free Only ({candidates.filter((c) => c.isEligible).length})</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={lockAfterSubstitute}
                onChange={(e) => setLockAfterSubstitute(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Lock replacement</span>
              </span>
            </label>
          </div>
        </div>

        {/* Candidate List */}
        <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No substitute faculty candidates found matching current filter.
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const f = candidate.faculty;
              return (
                <div
                  key={f.srNo}
                  className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    candidate.isEligible
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-sky-400/80 shadow-2xs'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {f.name}
                      </span>
                      <span className="text-[10px] text-slate-400">Sr. #{f.srNo}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.arrival === 'Morning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : f.arrival === 'Mid'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {f.arrival}
                      </span>
                      {f.role === 'hod' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          HOD
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Duties: {candidate.currentDutyCount} / {f.maxSupervisions}</span>
                      {candidate.isEligible ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>100% Eligible &amp; Available</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{candidate.conflictReasons.join(' • ')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExecuteSubstitute(candidate)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 inline-flex items-center space-x-1.5 shadow-2xs ${
                      candidate.isEligible
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{candidate.isEligible ? 'Substitute' : 'Force Swap'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
