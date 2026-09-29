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
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType, Assignment, Faculty } from '../types';

export const ScheduleViewer: React.FC = () => {
  const {
    project,
    scheduleViewMode,
    setScheduleViewMode,
    toggleLockAssignment,
    setSelectedAssignmentForInspect,
    setManualEditSlot,
    validation,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'All' | SessionType>('All');
  const [onlyDoubleAssignments, setOnlyDoubleAssignments] = useState(false);

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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* View Mode Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setScheduleViewMode('faculty')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              scheduleViewMode === 'faculty'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>A. Faculty View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('session')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              scheduleViewMode === 'session'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>B. Date / Session View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('workload')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              scheduleViewMode === 'workload'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>C. Workload View</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDoubleAssignments}
              onChange={(e) => setOnlyDoubleAssignments(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Show Double Duties Only</span>
          </label>
        </div>
      </div>

      {/* VIEW A: FACULTY VIEW */}
      {scheduleViewMode === 'faculty' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 w-14">Sr.</th>
                  <th className="py-3 px-3 min-w-[180px]">Faculty Member</th>
                  <th className="py-3 px-2 w-20">Arrival</th>
                  {activeDates.map((d) => (
                    <th key={d.date} className="py-3 px-2 text-center min-w-[110px] border-l border-slate-200/60">
                      <div className="font-bold text-slate-900">{d.displayDate}</div>
                      <div className="text-[10px] font-normal text-slate-400">{d.dayOfWeek}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-16 border-l border-slate-200">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((f) => {
                  const fDateMap = assignmentsByFacultyDate.get(f.srNo);
                  const totalAssigned = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  ).length;
                  const grandTotal = f.previousSupervisions + totalAssigned;
                  const isAtTarget = grandTotal === f.targetSupervisions;

                  return (
                    <tr key={f.srNo} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-mono font-medium text-slate-400">
                        {f.srNo}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{f.name}</span>
                          {f.isHod && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                              HOD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-500 font-medium">
                        {f.arrival}
                      </td>

                      {/* Date Cells */}
                      {activeDates.map((d) => {
                        const dayAssignments = fDateMap?.get(d.date) || [];
                        const isDouble = dayAssignments.length >= 2;

                        return (
                          <td
                            key={d.date}
                            className={`py-1.5 px-2 text-center border-l border-slate-100 ${
                              isDouble ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            {dayAssignments.length > 0 ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {dayAssignments.map((a) => (
                                  <div
                                    key={a.id}
                                    onClick={() => setSelectedAssignmentForInspect(a)}
                                    className={`w-full py-1 px-1.5 rounded text-[11px] font-semibold flex items-center justify-between cursor-pointer transition shadow-2xs ${
                                      a.session === 'JRS 1'
                                        ? 'bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-300/60'
                                        : a.session === 'JRS 2'
                                        ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300/60'
                                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60'
                                    }`}
                                  >
                                    <span className="truncate">{a.session}</span>
                                    {a.isLocked ? (
                                      <span title="Locked Assignment">
                                        <Lock className="w-3 h-3 text-slate-600 shrink-0 ml-1" />
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
                                ))}
                                {isDouble && (
                                  <span className="text-[9px] font-bold text-amber-700 tracking-wider">
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
                                className="w-full h-8 rounded border border-dashed border-transparent hover:border-slate-300 text-slate-300 hover:text-slate-600 hover:bg-slate-100 text-[10px] font-medium transition cursor-pointer flex items-center justify-center"
                                title="Click to assign duty"
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2 px-3 text-center border-l border-slate-200 font-mono font-bold">
                        <span
                          className={
                            grandTotal > f.maxSupervisions
                              ? 'text-rose-600 font-extrabold'
                              : isAtTarget
                              ? 'text-emerald-600'
                              : 'text-amber-600'
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
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      {d.displayDate} ({d.dayOfWeek})
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Total Daily Required: 57 Supervisors (JRS 1: {d.sessionRequirements['JRS 1']}, JRS 2: {d.sessionRequirements['JRS 2']}, JRS 3: {d.sessionRequirements['JRS 3']})
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((session) => {
                    const sessionAssignments = project.assignments.filter(
                      (a) => a.date === d.date && a.session === session
                    );
                    const required = d.sessionRequirements[session] || 0;
                    const isFilled = sessionAssignments.length >= required;

                    return (
                      <div key={session} className="p-4 flex flex-col md:flex-row gap-4 items-start">
                        {/* Session details */}
                        <div className="w-full md:w-56 shrink-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-xs ${
                                session === 'JRS 1'
                                  ? 'bg-sky-100 text-sky-800'
                                  : session === 'JRS 2'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {session}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {d.sessionTimings[session].start} - {d.sessionTimings[session].end}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="font-semibold text-slate-700">Required: {required}</span>
                            <span>•</span>
                            <span
                              className={`font-bold ${
                                isFilled ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              Assigned: {sessionAssignments.length}
                            </span>
                          </div>
                        </div>

                        {/* Supervisor Badges */}
                        <div className="flex-1 flex flex-wrap gap-1.5">
                          {sessionAssignments.map((a) => {
                            const fac = facultyMap.get(a.facultySrNo);
                            return (
                              <div
                                key={a.id}
                                onClick={() => setSelectedAssignmentForInspect(a)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-800 hover:text-sky-900 border border-slate-200 hover:border-sky-300 font-medium transition cursor-pointer flex items-center space-x-1.5"
                              >
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{a.facultySrNo}
                                </span>
                                <span>{fac?.name || `Sr ${a.facultySrNo}`}</span>
                                {fac?.isHod && (
                                  <span className="text-[9px] font-bold text-indigo-600">HOD</span>
                                )}
                                {a.isLocked && (
                                  <Lock className="w-3 h-3 text-slate-500" />
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
                            className="px-2 py-1 rounded-lg border border-dashed border-slate-300 hover:border-sky-500 text-slate-500 hover:text-sky-600 text-xs font-medium transition cursor-pointer flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Supervisor</span>
                          </button>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sr. No.</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Previous</th>
                  <th className="py-3 px-3 text-center">Target</th>
                  <th className="py-3 px-3 text-center">Maximum</th>
                  <th className="py-3 px-3 text-center">New</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-6 min-w-[200px]">Workload Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((f) => {
                  const assignedCount = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  ).length;
                  const total = f.previousSupervisions + assignedCount;
                  const remaining = Math.max(0, f.maxSupervisions - total);
                  const pct = Math.min(100, Math.round((total / f.targetSupervisions) * 100));

                  return (
                    <tr key={f.srNo} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-400">
                        {f.srNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {f.name}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            f.isHod
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {f.isHod ? 'HOD' : 'Regular'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {f.previousSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {f.targetSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {f.maxSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600">
                        {assignedCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={
                            total > f.maxSupervisions
                              ? 'text-rose-600'
                              : total === f.targetSupervisions
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }
                        >
                          {total}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {remaining}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
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
                          <span className="font-mono text-[11px] font-medium text-slate-600 w-9 text-right">
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
