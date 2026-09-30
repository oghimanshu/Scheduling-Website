import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  BarChart3,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Info,
  Sparkles,
  Users,
  Shield,
  ArrowRightLeft,
  Scale,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType, Assignment, Faculty } from '../types';
import { WorkloadAnalytics } from './WorkloadAnalytics';

export const ScheduleViewer: React.FC = () => {
  const {
    project,
    scheduleViewMode,
    setScheduleViewMode,
    toggleLockAssignment,
    setSelectedAssignmentForInspect,
    setManualEditSlot,
    validation,
    setSelectedForSubstitute,
    setIsSubstituteModalOpen,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'All' | SessionType>('All');
  const [onlyDoubleAssignments, setOnlyDoubleAssignments] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  const facultyMap = useMemo(
    () => new Map(project.faculty.map((f) => [f.srNo, f])),
    [project.faculty]
  );

  // Group assignments by faculty and date
  const assignmentsByFacultyDate = useMemo(() => {
    const map = new Map<number, Map<string, Assignment[]>>();
    project.faculty.forEach((f) => map.set(f.srNo, new Map()));

    project.assignments.forEach((a) => {
      const fMap = map.get(a.facultySrNo);
      if (fMap) {
        const list = fMap.get(a.date) || [];
        list.push(a);
        fMap.set(a.date, list);
      }
    });

    return map;
  }, [project.faculty, project.assignments]);

  // Filtered faculty for Faculty View & Workload View
  const filteredFaculty = useMemo(() => {
    return project.faculty.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.srNo.toString().includes(searchTerm);

      if (!matchSearch) return false;

      if (onlyDoubleAssignments) {
        const fMap = assignmentsByFacultyDate.get(f.srNo);
        let hasDouble = false;
        if (fMap) {
          fMap.forEach((assignments) => {
            if (assignments.length >= 2) hasDouble = true;
          });
        }
        if (!hasDouble) return false;
      }

      return true;
    });
  }, [project.faculty, searchTerm, onlyDoubleAssignments, assignmentsByFacultyDate]);

  return (
    <div className="space-y-6">
      {/* Top View Selector & Search Controls */}
      <div className="apple-glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* View Mode Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setScheduleViewMode('faculty')}
            className={`flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              scheduleViewMode === 'faculty'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>A. Faculty View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('session')}
            className={`flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              scheduleViewMode === 'session'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>B. Date / Session View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('workload')}
            className={`flex items-center justify-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              scheduleViewMode === 'workload'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>C. Workload View</span>
          </button>

          {/* Workload Fairness & Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              showAnalytics
                ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800 shadow-2xs'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100'
            }`}
            title="Toggle Workload Equity & Distribution Analytics"
          >
            <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Equity Analytics</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search faculty or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDoubleAssignments}
              onChange={(e) => setOnlyDoubleAssignments(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <span>Show Double Duties Only</span>
          </label>
        </div>
      </div>

      {/* Real-time Workload Fairness & Analytics Panel */}
      {showAnalytics && <WorkloadAnalytics />}

      {/* VIEW A: FACULTY VIEW */}
      {scheduleViewMode === 'faculty' && (
        <div className="apple-glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px] sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-3 w-14">Sr.</th>
                  <th className="py-3 px-3 min-w-[180px]">Faculty Member</th>
                  <th className="py-3 px-2 w-20">Arrival</th>
                  {activeDates.map((d) => (
                    <th key={d.date} className="py-3 px-2 text-center min-w-[110px] border-l border-slate-200/60 dark:border-white/5">
                      <div className="font-bold text-slate-900 dark:text-white">{d.displayDate}</div>
                      <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{d.dayOfWeek}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-16 border-l border-slate-200/60 dark:border-white/5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredFaculty.map((f) => {
                  const fDateMap = assignmentsByFacultyDate.get(f.srNo);
                  const totalAssigned = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  ).length;
                  const grandTotal = f.previousSupervisions + totalAssigned;
                  const isAtTarget = grandTotal === f.targetSupervisions;

                  return (
                    <tr key={f.srNo} className="hover:bg-sky-50/30 dark:hover:bg-white/5 transition">
                      <td className="py-2 px-3 font-mono font-medium text-slate-400 dark:text-slate-500">
                        {f.srNo}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>{f.name}</span>
                          {f.isHod && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                              HOD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {f.arrival}
                      </td>

                      {/* Date Cells */}
                      {activeDates.map((d) => {
                        const dayAssignments = fDateMap?.get(d.date) || [];
                        const isDouble = dayAssignments.length >= 2;

                        return (
                          <td
                            key={d.date}
                            className={`py-1.5 px-2 text-center border-l border-slate-100 dark:border-white/5 ${
                              isDouble ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            {dayAssignments.length > 0 ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {dayAssignments.map((a) => (
                                  <div
                                    key={a.id}
                                    onClick={() => setSelectedAssignmentForInspect(a)}
                                    className={`w-full py-1 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between cursor-pointer transition shadow-2xs ${
                                      a.isReserve
                                        ? 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/60'
                                        : a.session === 'JRS 1'
                                        ? 'bg-sky-100/80 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 border border-sky-300/60 dark:border-sky-800/40'
                                        : a.session === 'JRS 2'
                                        ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 border border-indigo-300/60 dark:border-indigo-800/40'
                                        : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300/60 dark:border-emerald-800/40'
                                    }`}
                                    title={a.isReserve ? 'Designated Standby / Reserve Duty' : 'Primary Supervision Duty'}
                                  >
                                    <div className="flex items-center space-x-1 truncate">
                                      {a.isReserve && <Shield className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                                      <span className="truncate">{a.session}{a.isReserve ? ' (R)' : ''}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedForSubstitute(a);
                                          setIsSubstituteModalOpen(true);
                                        }}
                                        className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                                        title="Find Substitute / Swap Colleague"
                                      >
                                        <ArrowRightLeft className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                                      </button>
                                      {a.isLocked ? (
                                        <span title="Locked Assignment">
                                          <Lock className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0" />
                                        </span>
                                      ) : a.isOverride ? (
                                        <span
                                          className="text-[8px] px-1 rounded bg-amber-500 text-white font-bold"
                                          title={`Override: ${a.overrideReason || ''}`}
                                        >
                                          OVR
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                                {isDouble && (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                                    DOUBLE
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setManualEditSlot({
                                    facultySrNo: f.srNo,
                                    date: d.date,
                                    session: 'JRS 2',
                                  })
                                }
                                className="w-full h-8 rounded border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-600 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-[10px] font-medium transition cursor-pointer flex items-center justify-center"
                                title="Click to assign duty"
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2 px-3 text-center border-l border-slate-200/60 dark:border-white/5 font-mono font-bold">
                        <span
                          className={
                            grandTotal > f.maxSupervisions
                              ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                              : isAtTarget
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {grandTotal} / {f.targetSupervisions}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: DATE / SESSION VIEW */}
      {scheduleViewMode === 'session' && (
        <div className="space-y-6">
          {activeDates.map((d) => {
            return (
              <div
                key={d.date}
                className="apple-glass-card overflow-hidden"
              >
                <div className="bg-slate-50/70 dark:bg-slate-800/70 p-4 border-b border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {d.displayDate} ({d.dayOfWeek})
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Total Daily Required: 57 Supervisors (JRS 1: {d.sessionRequirements?.['JRS 1'] ?? 17}, JRS 2: {d.sessionRequirements?.['JRS 2'] ?? 25}, JRS 3: {d.sessionRequirements?.['JRS 3'] ?? 15})
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((session) => {
                    const sessionAssignments = (project.assignments || []).filter(
                      (a) => a.date === d.date && a.session === session
                    );
                    const primaryAssignments = sessionAssignments.filter((a) => !a.isReserve);
                    const reserveAssignments = sessionAssignments.filter((a) => a.isReserve);
                    const required = d.sessionRequirements?.[session] ?? 0;
                    const isFilled = primaryAssignments.length >= required;

                    return (
                      <div key={session} className="p-4 flex flex-col md:flex-row gap-4 items-start">
                        {/* Session details */}
                        <div className="w-full md:w-56 shrink-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                                session === 'JRS 1'
                                  ? 'bg-sky-100/80 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40'
                                  : session === 'JRS 2'
                                  ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
                                  : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                              }`}
                            >
                              {session}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {d.sessionTimings?.[session]?.start ?? '08:00'} - {d.sessionTimings?.[session]?.end ?? '10:00'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Required: {required}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span
                              className={`font-bold ${
                                isFilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              Assigned: {primaryAssignments.length}
                            </span>
                          </div>
                          {reserveAssignments.length > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center space-x-1 pt-0.5">
                              <Shield className="w-3 h-3" />
                              <span>{reserveAssignments.length} Standby Reserve{reserveAssignments.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Supervisor Badges */}
                        <div className="flex-1 space-y-2.5">
                          {/* Primary Supervisors */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                              Primary Supervisors ({primaryAssignments.length}/{required})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {primaryAssignments.map((a) => {
                                const fac = facultyMap.get(a.facultySrNo);
                                return (
                                  <div
                                    key={a.id}
                                    onClick={() => setSelectedAssignmentForInspect(a)}
                                    className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-800 dark:text-slate-200 hover:text-sky-900 dark:hover:text-sky-300 border border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-800/40 font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-2xs backdrop-blur-xs"
                                  >
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                      #{a.facultySrNo}
                                    </span>
                                    <span>{fac?.name || `Sr ${a.facultySrNo}`}</span>
                                    {fac?.isHod && (
                                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">HOD</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedForSubstitute(a);
                                        setIsSubstituteModalOpen(true);
                                      }}
                                      className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                                      title="Find Substitute / Swap Colleague"
                                    >
                                      <ArrowRightLeft className="w-2.5 h-2.5 text-slate-400 hover:text-sky-600" />
                                    </button>
                                    {a.isLocked && (
                                      <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    )}
                                  </div>
                                );
                              })}

                              <button
                                onClick={() =>
                                  setManualEditSlot({
                                    date: d.date,
                                    session,
                                  })
                                }
                                className="px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-medium transition cursor-pointer flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Supervisor</span>
                              </button>
                            </div>
                          </div>

                          {/* Reserve Supervisors (if any) */}
                          {reserveAssignments.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center space-x-1 mb-1">
                                <Shield className="w-3 h-3" />
                                <span>Standby / Reserve Supervisors ({reserveAssignments.length})</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {reserveAssignments.map((a) => {
                                  const fac = facultyMap.get(a.facultySrNo);
                                  return (
                                    <div
                                      key={a.id}
                                      onClick={() => setSelectedAssignmentForInspect(a)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-2xs backdrop-blur-xs"
                                      title="Designated Standby / Reserve Duty"
                                    >
                                      <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                        #{a.facultySrNo}
                                      </span>
                                      <span>{fac?.name || `Sr ${a.facultySrNo}`}</span>
                                      <span className="text-[9px] font-bold px-1 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-300">
                                        Reserve
                                      </span>
                                      {fac?.isHod && (
                                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">HOD</span>
                                      )}
                                      {a.isLocked && (
                                        <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW C: WORKLOAD VIEW */}
      {scheduleViewMode === 'workload' && (
        <div className="apple-glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sr. No.</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Previous</th>
                  <th className="py-3 px-3 text-center">Target</th>
                  <th className="py-3 px-3 text-center">Maximum</th>
                  <th className="py-3 px-3 text-center">New Duties</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-6 min-w-[200px]">Workload Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredFaculty.map((f) => {
                  const facAssignments = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  );
                  const primaryCount = facAssignments.filter((a) => !a.isReserve).length;
                  const reserveCount = facAssignments.filter((a) => a.isReserve).length;
                  const countedNew = project.settings.reserveCanExceedCap
                    ? primaryCount
                    : primaryCount + reserveCount;
                  const total = f.previousSupervisions + countedNew;
                  const grandTotal = f.previousSupervisions + primaryCount + reserveCount;
                  const remaining = Math.max(0, f.maxSupervisions - total);
                  const pct = Math.min(100, Math.round((total / f.targetSupervisions) * 100));

                  return (
                    <tr key={f.srNo} className="hover:bg-sky-50/30 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-400 dark:text-slate-500">
                        {f.srNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>{f.name}</span>
                          {f.isExcluded && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            f.isHod
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/40'
                          }`}
                        >
                          {f.isHod ? 'HOD' : 'Regular'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {f.previousSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {f.targetSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {f.maxSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                        {primaryCount}
                        {reserveCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1 text-[11px]" title={`${reserveCount} reserve standby duties${project.settings.reserveCanExceedCap ? ' (can exceed cap)' : ''}`}>
                            (+{reserveCount}R)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={
                            total > f.maxSupervisions
                              ? 'text-rose-600 dark:text-rose-400'
                              : total === f.targetSupervisions
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                          title={reserveCount > 0 && project.settings.reserveCanExceedCap ? `Counted toward cap: ${total}, Grand total with reserves: ${grandTotal}` : undefined}
                        >
                          {grandTotal}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {remaining}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                total > f.maxSupervisions
                                  ? 'bg-rose-500'
                                  : total === f.targetSupervisions
                                  ? 'bg-emerald-500'
                                  : 'bg-sky-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-400 w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
