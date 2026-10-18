import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Search,
  Building2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Assignment, AttendanceStatus, SessionType } from '../types';
import Papa from 'papaparse';

export const ControlRoomView: React.FC = () => {
  const { project, markAttendance, deployReserveToRoom } = useScheduler();

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  // Selected Date state
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => {
    return activeDates[0]?.date || '2026-10-06';
  });

  // Selected Session state
  const [selectedSession, setSelectedSession] = useState<SessionType | 'All'>('All');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'All' | 'pending' | 'present' | 'absent' | 'reserves'>('All');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Deploy Reserve modal target
  const [deployTargetDuty, setDeployTargetDuty] = useState<Assignment | null>(null);

  // Notification message
  const [notification, setNotification] = useState<string | null>(null);

  const activeDateConfig = useMemo(() => {
    return activeDates.find((d) => d.date === selectedDateIso) || activeDates[0];
  }, [activeDates, selectedDateIso]);

  const facultyMap = useMemo(() => {
    return new Map(project.faculty.map((f) => [f.srNo, f]));
  }, [project.faculty]);

  // All assignments on this selected date
  const dateAssignments = useMemo(() => {
    return project.assignments.filter((a) => a.date === selectedDateIso);
  }, [project.assignments, selectedDateIso]);

  // Filtered by session
  const sessionFilteredAssignments = useMemo(() => {
    if (selectedSession === 'All') return dateAssignments;
    return dateAssignments.filter((a) => a.session === selectedSession);
  }, [dateAssignments, selectedSession]);

  // Primary room duties vs Standby reserve duties
  const primaryRoomDuties = useMemo(() => {
    return sessionFilteredAssignments.filter((a) => !a.isReserve);
  }, [sessionFilteredAssignments]);

  const standbyReserves = useMemo(() => {
    return sessionFilteredAssignments.filter((a) => a.isReserve || a.attendanceStatus === 'deployed');
  }, [sessionFilteredAssignments]);

  // Metrics
  const metrics = useMemo(() => {
    const totalRequired = primaryRoomDuties.length;
    const presentCount = primaryRoomDuties.filter(
      (a) => a.attendanceStatus === 'present' || a.attendanceStatus === 'deployed'
    ).length;
    const absentCount = primaryRoomDuties.filter(
      (a) => a.attendanceStatus === 'absent' && !a.replacedByFacultySrNo
    ).length;
    const pendingCount = primaryRoomDuties.filter(
      (a) => !a.attendanceStatus || a.attendanceStatus === 'scheduled'
    ).length;
    const availableReservesCount = standbyReserves.filter(
      (a) => a.isReserve && a.attendanceStatus !== 'deployed'
    ).length;

    return {
      totalRequired,
      presentCount,
      absentCount,
      pendingCount,
      availableReservesCount,
    };
  }, [primaryRoomDuties, standbyReserves]);

  // Filtered primary duties for display
  const displayedDuties = useMemo(() => {
    return primaryRoomDuties.filter((a) => {
      const fac = facultyMap.get(a.facultySrNo);
      const facName = fac?.name || `Faculty ${a.facultySrNo}`;
      const room = a.roomName || 'Unassigned Room';

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          facName.toLowerCase().includes(q) ||
          room.toLowerCase().includes(q) ||
          a.session.toLowerCase().includes(q) ||
          String(a.facultySrNo).includes(q);
        if (!matches) return false;
      }

      if (statusFilter === 'present') {
        return a.attendanceStatus === 'present' || a.attendanceStatus === 'deployed';
      }
      if (statusFilter === 'absent') {
        return a.attendanceStatus === 'absent';
      }
      if (statusFilter === 'pending') {
        return !a.attendanceStatus || a.attendanceStatus === 'scheduled';
      }
      if (statusFilter === 'reserves') {
        return false;
      }
      return true;
    });
  }, [primaryRoomDuties, facultyMap, searchQuery, statusFilter]);

  // Available reserves for the deploy modal (matching the session of deployTargetDuty)
  const candidateReservesForTarget = useMemo(() => {
    if (!deployTargetDuty) return [];
    return project.assignments.filter(
      (a) =>
        a.date === deployTargetDuty.date &&
        a.session === deployTargetDuty.session &&
        a.isReserve &&
        a.attendanceStatus !== 'deployed'
    );
  }, [project.assignments, deployTargetDuty]);

  // Handle Mark Attendance
  const handleToggleAttendance = (assignmentId: string, currentStatus?: AttendanceStatus) => {
    const nextStatus: AttendanceStatus = currentStatus === 'present' ? 'scheduled' : 'present';
    markAttendance(assignmentId, nextStatus);
    const asg = project.assignments.find((a) => a.id === assignmentId);
    const fac = asg ? facultyMap.get(asg.facultySrNo) : null;
    setNotification(
      nextStatus === 'present'
        ? `Marked ${fac?.name || 'Faculty'} as Present.`
        : `Reset ${fac?.name || 'Faculty'} attendance to Scheduled.`
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMarkAbsent = (duty: Assignment) => {
    markAttendance(duty.id, 'absent');
    const fac = facultyMap.get(duty.facultySrNo);
    setNotification(`Marked ${fac?.name || 'Faculty'} as Absent. Room is currently vacant.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExecuteReserveDeploy = (reserveId: string) => {
    if (!deployTargetDuty) return;
    const res = deployReserveToRoom(reserveId, deployTargetDuty.id);
    if (res.success) {
      setNotification(res.message);
      setDeployTargetDuty(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Export Daily Attendance CSV
  const handleExportCsv = () => {
    const rows = primaryRoomDuties.map((a, idx) => {
      const fac = facultyMap.get(a.facultySrNo);
      const replacedBy = a.replacedByFacultySrNo ? facultyMap.get(a.replacedByFacultySrNo) : null;
      return {
        'S.No.': idx + 1,
        'Date': activeDateConfig?.displayDate || selectedDateIso,
        'Session': a.session,
        'Room / Hall': a.roomName || 'Standard Hall',
        'Faculty Sr No': a.facultySrNo,
        'Assigned Faculty': fac?.name || `Faculty ${a.facultySrNo}`,
        'Department': fac?.department || '',
        'Attendance Status': a.attendanceStatus || 'scheduled',
        'Check-In Time': a.attendanceTimestamp || '',
        'Replaced By Reserve': replacedBy ? `${replacedBy.name} (Sr ${replacedBy.srNo})` : '',
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exam_Attendance_${selectedDateIso}_${selectedSession}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const institution = project.institution || {
    institutionName: 'Autonomous College of Engineering & Technology',
    officeTitle: 'Office of the Controller of Examinations',
    subHeader: 'University Examination Division | Academic Session 2026-2027',
    signingAuthorities: [
      { id: '1', role: 'Chief Superintendent', name: 'Dr. Exam Superintendent' },
      { id: '2', role: 'Centre Superintendent', name: 'Dean Academics' },
      { id: '3', role: 'Controller of Examinations', name: 'Controller of Examinations' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Screen Header Controls (Hidden during print) */}
      <div className="apple-glass-card p-4 sm:p-6 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Day-of-Exam Control Room</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                    Live Operations
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live invigilator check-in, instant vacant room alert, and 1-click standby reserve deployment.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
              title="Export today's attendance roster as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Attendance CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
              title="Print official Daily Attendance Register with signature lines"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Daily Register</span>
            </button>
          </div>
        </div>

        {/* Date & Session Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Exam Dates Ribbon */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date:</span>
            </span>
            {activeDates.map((d) => {
              const isSelected = d.date === selectedDateIso;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDateIso(d.date)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{d.displayDate}</span>
                  <span className="text-[10px] opacity-75 ml-1">({d.dayOfWeek.slice(0, 3)})</span>
                </button>
              );
            })}
          </div>

          {/* Session Switcher */}
          <div className="flex items-center space-x-1 shrink-0 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Session:</span>
            {(['All', 'JRS 1', 'JRS 2', 'JRS 3'] as (SessionType | 'All')[]).map((sess) => {
              const isSelected = selectedSession === sess;
              const req = sess === 'All' ? null : activeDateConfig?.sessionRequirements?.[sess] ?? 0;
              return (
                <button
                  key={sess}
                  type="button"
                  onClick={() => setSelectedSession(sess)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{sess}</span>
                  {req !== null && req > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">({req})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Duties Needed</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {metrics.totalRequired}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
              <UserCheck className="w-3 h-3" />
              <span>Checked In (Present)</span>
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
              {metrics.presentCount}
              <span className="text-xs font-normal opacity-80 ml-1">
                ({metrics.totalRequired > 0 ? Math.round((metrics.presentCount / metrics.totalRequired) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Unreported (Pending)</span>
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
              {metrics.pendingCount}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border transition ${
            metrics.absentCount > 0
              ? 'bg-rose-500/15 border-rose-500/40 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-white/5'
          }`}>
            <div className={`text-[11px] font-semibold flex items-center space-x-1 ${
              metrics.absentCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <ShieldAlert className="w-3 h-3" />
              <span>Vacant / Absent</span>
            </div>
            <div className={`text-xl font-black tabular-nums mt-0.5 ${
              metrics.absentCount > 0 ? 'text-rose-700 dark:text-rose-300 font-extrabold' : 'text-slate-900 dark:text-white'
            }`}>
              {metrics.absentCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Standby Reserves</span>
            </div>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums mt-0.5">
              {metrics.availableReservesCount}
              <span className="text-xs font-normal opacity-80 ml-1">ready</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['All', 'pending', 'present', 'absent'] as const).map((filter) => {
              const isSelected = statusFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Grid (Screen View) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Left Column (2 spans): Primary Room Duties */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Assigned Hall & Room Invigilators</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {displayedDuties.length}
              </span>
            </h3>
            <span className="text-xs text-slate-400">Click Check In to mark present</span>
          </div>

          {displayedDuties.length === 0 ? (
            <div className="apple-glass-card p-8 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No duties found matching the selected filters.
              </p>
              <p className="text-xs text-slate-400">
                Try selecting a different session or clearing your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {displayedDuties.map((duty) => {
                const fac = facultyMap.get(duty.facultySrNo);
                const isPresent = duty.attendanceStatus === 'present' || duty.attendanceStatus === 'deployed';
                const isAbsent = duty.attendanceStatus === 'absent';
                const isVacant = isAbsent && !duty.replacedByFacultySrNo;
                const replacedBy = duty.replacedByFacultySrNo ? facultyMap.get(duty.replacedByFacultySrNo) : null;

                return (
                  <div
                    key={duty.id}
                    className={`apple-glass-card p-4 rounded-2xl space-y-3 transition border ${
                      isVacant
                        ? 'border-rose-400/80 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-2 ring-rose-400/30'
                        : isPresent
                        ? 'border-emerald-300/80 bg-emerald-50/30 dark:bg-emerald-950/15'
                        : 'border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    {/* Card Header: Room & Session */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="truncate">{duty.roomName || 'Standard Hall'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {duty.session} &bull; {activeDateConfig?.sessionTimings?.[duty.session]?.start ?? '08:00'} - {activeDateConfig?.sessionTimings?.[duty.session]?.end ?? '10:00'}
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div>
                        {isPresent ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50">
                            <UserCheck className="w-3 h-3" />
                            <span>Present</span>
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300/50">
                            <UserX className="w-3 h-3" />
                            <span>Absent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Faculty Profile */}
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{fac?.name || `Faculty ${duty.facultySrNo}`}</span>
                          {fac?.isHod && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                              HOD
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Sr #{duty.facultySrNo} &bull; Arrival: {fac?.arrival || 'Morning'}
                        </div>
                      </div>

                      {duty.attendanceTimestamp && (
                        <div className="text-[10px] font-mono text-slate-400 text-right">
                          <span>Checked: {duty.attendanceTimestamp}</span>
                        </div>
                      )}
                    </div>

                    {/* Vacant Room Alert & Deploy Reserve Button */}
                    {isVacant && (
                      <div className="p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300/60 dark:border-rose-800/60 space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Room Unstaffed (Absent)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeployTargetDuty(duty)}
                          className="w-full py-1.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Deploy Standby Reserve</span>
                        </button>
                      </div>
                    )}

                    {/* Replaced by Reserve Notice */}
                    {replacedBy && (
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Replaced by: <strong>{replacedBy.name}</strong></span>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAttendance(duty.id, duty.attendanceStatus)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 border ${
                          isPresent
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isPresent ? 'Uncheck' : 'Check In'}</span>
                      </button>

                      {!isAbsent && (
                        <button
                          type="button"
                          onClick={() => handleMarkAbsent(duty)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition cursor-pointer flex items-center space-x-1"
                          title="Mark invigilator as absent and alert for reserve deployment"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 span): Standby Reserves Pool */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Standby Reserves Roster</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {standbyReserves.length}
              </span>
            </h3>
            <span className="text-xs text-slate-400">Control Room Pool</span>
          </div>

          <div className="apple-glass-card p-4 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Supervisors designated on reserve report directly to the Control Room. If an invigilator is absent or late, deploy them instantly.
            </p>

            {standbyReserves.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                No reserves scheduled for this session.
              </div>
            ) : (
              <div className="space-y-2.5">
                {standbyReserves.map((resDuty) => {
                  const resFac = facultyMap.get(resDuty.facultySrNo);
                  const isDeployed = resDuty.attendanceStatus === 'deployed';

                  return (
                    <div
                      key={resDuty.id}
                      className={`p-3 rounded-xl border transition ${
                        isDeployed
                          ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200/70 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <span>{resFac?.name || `Faculty ${resDuty.facultySrNo}`}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              Sr #{resDuty.facultySrNo}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {resDuty.session} &bull; Arrival: {resFac?.arrival || 'Morning'}
                          </div>
                        </div>

                        <div>
                          {isDeployed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              Deployed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                              Ready
                            </span>
                          )}
                        </div>
                      </div>

                      {isDeployed && resDuty.deployedToRoom && (
                        <div className="mt-2 text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3" />
                          <span>Serving in: {resDuty.deployedToRoom}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deploy Reserve Modal */}
      {deployTargetDuty && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
          <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[90dvh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Deploy Reserve to Vacant Room</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a standby supervisor to replace the absent faculty member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeployTargetDuty(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                &times;
              </button>
            </div>

            {/* Target Room Summary */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 space-y-1 text-xs text-rose-950 dark:text-rose-200">
              <div className="font-bold flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Target: {deployTargetDuty.roomName || 'Standard Hall'} ({deployTargetDuty.session})</span>
              </div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 pl-5">
                Original Faculty: {facultyMap.get(deployTargetDuty.facultySrNo)?.name || `Faculty ${deployTargetDuty.facultySrNo}`} (Absent)
              </p>
            </div>

            {/* Available Reserves List */}
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Available Reserves on Standby ({candidateReservesForTarget.length}):
              </div>

              {candidateReservesForTarget.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-400">
                  No standby reserves available for this session. You can reassign via Schedule Viewer or add new faculty.
                </div>
              ) : (
                candidateReservesForTarget.map((cRes) => {
                  const cFac = facultyMap.get(cRes.facultySrNo);
                  return (
                    <div
                      key={cRes.id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between gap-3 hover:border-sky-300 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{cFac?.name || `Faculty ${cRes.facultySrNo}`}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Sr #{cRes.facultySrNo}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Arrival: {cFac?.arrival || 'Morning'} &bull; Dept: {cFac?.department || 'General'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExecuteReserveDeploy(cRes.id)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition cursor-pointer shrink-0 flex items-center space-x-1"
                      >
                        <span>Deploy Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeployTargetDuty(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Daily Attendance Register (Optimized for Printing) */}
      <div className="hidden print:block font-serif text-black p-4 bg-white">
        {/* Institutional Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">{institution.institutionName}</h1>
          <h2 className="text-sm font-semibold mt-0.5">{institution.officeTitle}</h2>
          <p className="text-xs italic mt-0.5">{institution.subHeader}</p>
          <div className="mt-2 pt-2 border-t border-dotted border-black flex justify-between text-xs font-bold">
            <span>DAILY INVIGILATION ATTENDANCE REGISTER</span>
            <span>Date: {activeDateConfig?.displayDate || selectedDateIso} ({activeDateConfig?.dayOfWeek})</span>
            <span>Session: {selectedSession}</span>
          </div>
        </div>

        {/* Attendance Table */}
        <table className="w-full text-left text-xs border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 w-10 text-center">S.No.</th>
              <th className="border border-black p-1.5 min-w-[120px]">Room / Hall</th>
              <th className="border border-black p-1.5 min-w-[160px]">Invigilator Name</th>
              <th className="border border-black p-1.5 w-20">Session</th>
              <th className="border border-black p-1.5 w-24">Arrival</th>
              <th className="border border-black p-1.5 w-24 text-center">Status</th>
              <th className="border border-black p-1.5 min-w-[120px]">Signature</th>
              <th className="border border-black p-1.5 min-w-[120px]">Remarks / Substitute</th>
            </tr>
          </thead>
          <tbody>
            {primaryRoomDuties.map((duty, idx) => {
              const fac = facultyMap.get(duty.facultySrNo);
              const replacedBy = duty.replacedByFacultySrNo ? facultyMap.get(duty.replacedByFacultySrNo) : null;
              const isPresent = duty.attendanceStatus === 'present' || duty.attendanceStatus === 'deployed';

              return (
                <tr key={duty.id} className="border-b border-black">
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-bold">{duty.roomName || 'Hall'}</td>
                  <td className="border border-black p-1.5">
                    {fac?.name || `Faculty ${duty.facultySrNo}`}
                    {fac?.isHod && ' (HOD)'}
                  </td>
                  <td className="border border-black p-1.5 font-mono">{duty.session}</td>
                  <td className="border border-black p-1.5">{fac?.arrival || 'Morning'}</td>
                  <td className="border border-black p-1.5 text-center font-bold">
                    {isPresent ? 'PRESENT' : duty.attendanceStatus === 'absent' ? 'ABSENT' : 'SCHEDULED'}
                  </td>
                  <td className="border border-black p-1.5"></td>
                  <td className="border border-black p-1.5 text-[10px]">
                    {replacedBy ? `Replaced by ${replacedBy.name}` : ''}
                  </td>
                </tr>
              );
            })}

            {/* Standby Reserves Section in Table */}
            {standbyReserves.length > 0 && (
              <>
                <tr className="bg-slate-100 font-bold border-t-2 border-b border-black">
                  <td colSpan={8} className="p-1.5 uppercase tracking-wider text-[11px]">
                    Standby Reserve Supervisors on Duty (Control Room)
                  </td>
                </tr>
                {standbyReserves.map((resDuty, rIdx) => {
                  const rFac = facultyMap.get(resDuty.facultySrNo);
                  return (
                    <tr key={resDuty.id} className="border-b border-black">
                      <td className="border border-black p-1.5 text-center font-mono">R-{rIdx + 1}</td>
                      <td className="border border-black p-1.5 italic">Control Room Standby</td>
                      <td className="border border-black p-1.5 font-semibold">{rFac?.name}</td>
                      <td className="border border-black p-1.5 font-mono">{resDuty.session}</td>
                      <td className="border border-black p-1.5">{rFac?.arrival || 'Morning'}</td>
                      <td className="border border-black p-1.5 text-center font-semibold">
                        {resDuty.attendanceStatus === 'deployed' ? 'DEPLOYED' : 'STANDBY'}
                      </td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5 text-[10px]">
                        {resDuty.deployedToRoom ? `Serving in ${resDuty.deployedToRoom}` : 'Available'}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>

        {/* Signing Authorities */}
        <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
          {(institution.signingAuthorities || []).map((auth) => (
            <div key={auth.id} className="border-t border-black pt-2">
              <div className="font-bold">{auth.name || 'Signature'}</div>
              <div className="text-[11px] text-slate-700">{auth.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
