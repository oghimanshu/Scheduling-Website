import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  GripVertical,
  ChevronDown,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Assignment, AttendanceStatus, SessionType, DEFAULT_CUSTOM_ROLES } from '../types';
import Papa from 'papaparse';

export const ControlRoomView: React.FC = () => {
  const { project, markAttendance, deployReserveToRoom, undoDeployReserve } = useScheduler();

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

  // Role and Room Filters
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [roomFilter, setRoomFilter] = useState<string>('All');

  // Sort Duty Option
  const [dutySortOption, setDutySortOption] = useState<'session_room' | 'absent_first' | 'faculty_name'>('session_room');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Deploy Reserve modal target
  const [deployTargetDuty, setDeployTargetDuty] = useState<Assignment | null>(null);

  // Drag-and-drop state
  const [dragOverDutyId, setDragOverDutyId] = useState<string | null>(null);

  // Print Mode and Dropdown state
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'separate' | 'combined' | 'active_session'>('separate');

  // Floating Action Toast message with Undo support
  const [actionToast, setActionToast] = useState<{ text: string; onUndo?: () => void } | null>(null);

  // Keyboard Escape listener to dismiss modal cleanly and close print dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deployTargetDuty) setDeployTargetDuty(null);
        if (isPrintDropdownOpen) setIsPrintDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deployTargetDuty, isPrintDropdownOpen]);

  // Click outside to close print dropdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (isPrintDropdownOpen && !(e.target as HTMLElement).closest('.print-dropdown-container')) {
        setIsPrintDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isPrintDropdownOpen]);

  const activeDateConfig = useMemo(() => {
    return activeDates.find((d) => d.date === selectedDateIso) || activeDates[0];
  }, [activeDates, selectedDateIso]);

  const facultyMap = useMemo(() => {
    return new Map(project.faculty.map((f) => [f.srNo, f]));
  }, [project.faculty]);

  // Unique rooms list for filter
  const availableRooms = useMemo(() => {
    const roomNames = new Set<string>();
    (project.rooms || []).forEach((r) => roomNames.add(r.name));
    (project.assignments || []).forEach((a) => {
      if (a.roomName) roomNames.add(a.roomName);
    });
    return Array.from(roomNames).sort();
  }, [project.rooms, project.assignments]);

  const isAnyFilterActive =
    searchQuery !== '' ||
    statusFilter !== 'All' ||
    roleFilter !== 'All' ||
    roomFilter !== 'All' ||
    selectedSession !== 'All';

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setRoleFilter('All');
    setRoomFilter('All');
    setSelectedSession('All');
  };

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
    return sessionFilteredAssignments.filter((a) => {
      const isRes = a.isReserve || a.attendanceStatus === 'deployed';
      if (!isRes) return false;
      if (roleFilter !== 'All') {
        const fac = facultyMap.get(a.facultySrNo);
        const currentRole = fac?.role || (fac?.isHod ? 'HOD' : 'Regular');
        const matchRole =
          roleFilter.toLowerCase() === 'hod'
            ? fac?.isHod
            : roleFilter.toLowerCase() === 'regular'
            ? !fac?.isHod
            : currentRole.toLowerCase() === roleFilter.toLowerCase();
        if (!matchRole) return false;
      }
      return true;
    });
  }, [sessionFilteredAssignments, roleFilter, facultyMap]);

  // Workload map: Total assignments per faculty across the exam period
  const facultyWorkloadMap = useMemo(() => {
    const counts = new Map<number, number>();
    (project.faculty || []).forEach((f) => counts.set(f.srNo, 0));
    (project.assignments || []).forEach((a) => {
      counts.set(a.facultySrNo, (counts.get(a.facultySrNo) || 0) + 1);
    });
    return counts;
  }, [project.faculty, project.assignments]);

  // Standby reserves sorted by lowest to highest workload
  const sortedStandbyReserves = useMemo(() => {
    return [...standbyReserves].sort((a, b) => {
      const loadA = facultyWorkloadMap.get(a.facultySrNo) ?? 0;
      const loadB = facultyWorkloadMap.get(b.facultySrNo) ?? 0;
      if (loadA !== loadB) return loadA - loadB; // lowest workload first!
      return a.facultySrNo - b.facultySrNo;
    });
  }, [standbyReserves, facultyWorkloadMap]);

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

      if (roleFilter !== 'All') {
        const currentRole = fac?.role || (fac?.isHod ? 'HOD' : 'Regular');
        const matchRole =
          roleFilter.toLowerCase() === 'hod'
            ? fac?.isHod
            : roleFilter.toLowerCase() === 'regular'
            ? !fac?.isHod
            : currentRole.toLowerCase() === roleFilter.toLowerCase();
        if (!matchRole) return false;
      }

      if (roomFilter !== 'All') {
        if (roomFilter === 'assigned') {
          if (!a.roomName) return false;
        } else if (roomFilter === 'unassigned') {
          if (a.roomName) return false;
        } else if (a.roomName !== roomFilter) {
          return false;
        }
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
  }, [primaryRoomDuties, facultyMap, searchQuery, statusFilter, roleFilter, roomFilter]);

  // Sorted primary room duties as per user preference (Session timing + Room order by default)
  const sortedDisplayedDuties = useMemo(() => {
    const list = [...displayedDuties];
    if (dutySortOption === 'session_room') {
      const standardOrder = ['JRS 1', 'JRS 2', 'JRS 3'];
      return list.sort((a, b) => {
        // Chronological session ordering
        if (a.session !== b.session) {
          const idxA = standardOrder.indexOf(a.session);
          const idxB = standardOrder.indexOf(b.session);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.session.localeCompare(b.session, undefined, { numeric: true });
        }
        // Natural room sort
        const roomA = a.roomName || 'ZZZ';
        const roomB = b.roomName || 'ZZZ';
        return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    if (dutySortOption === 'absent_first') {
      return list.sort((a, b) => {
        const isVacantA = a.attendanceStatus === 'absent' && !a.replacedByFacultySrNo;
        const isVacantB = b.attendanceStatus === 'absent' && !b.replacedByFacultySrNo;
        if (isVacantA && !isVacantB) return -1;
        if (!isVacantA && isVacantB) return 1;
        const roomA = a.roomName || 'ZZZ';
        const roomB = b.roomName || 'ZZZ';
        return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    if (dutySortOption === 'faculty_name') {
      return list.sort((a, b) => {
        const nameA = facultyMap.get(a.facultySrNo)?.name || '';
        const nameB = facultyMap.get(b.facultySrNo)?.name || '';
        return nameA.localeCompare(nameB);
      });
    }
    return list;
  }, [displayedDuties, dutySortOption, facultyMap]);

  // Distinct sessions for the date (for separate session printing)
  const sessionsForDate = useMemo(() => {
    const sessSet = new Set<string>();
    if (activeDateConfig?.sessionRequirements) {
      Object.keys(activeDateConfig.sessionRequirements).forEach((s) => sessSet.add(s));
    }
    dateAssignments.forEach((a) => {
      if (a.session) sessSet.add(a.session);
    });
    const standardOrder = ['JRS 1', 'JRS 2', 'JRS 3'];
    return Array.from(sessSet).sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [activeDateConfig, dateAssignments]);

  // Available reserves for the deploy modal (matching the session of deployTargetDuty, lowest workload first)
  const candidateReservesForTarget = useMemo(() => {
    if (!deployTargetDuty) return [];
    return project.assignments
      .filter(
        (a) =>
          a.date === deployTargetDuty.date &&
          a.session === deployTargetDuty.session &&
          a.isReserve &&
          a.attendanceStatus !== 'deployed'
      )
      .sort((a, b) => {
        const loadA = facultyWorkloadMap.get(a.facultySrNo) ?? 0;
        const loadB = facultyWorkloadMap.get(b.facultySrNo) ?? 0;
        if (loadA !== loadB) return loadA - loadB;
        return a.facultySrNo - b.facultySrNo;
      });
  }, [project.assignments, deployTargetDuty, facultyWorkloadMap]);

  // Handle Mark Attendance
  const handleToggleAttendance = (assignmentId: string, currentStatus?: AttendanceStatus) => {
    const nextStatus: AttendanceStatus = currentStatus === 'present' ? 'scheduled' : 'present';
    markAttendance(assignmentId, nextStatus);
    const asg = project.assignments.find((a) => a.id === assignmentId);
    const fac = asg ? facultyMap.get(asg.facultySrNo) : null;
    setActionToast({
      text:
        nextStatus === 'present'
          ? `Marked ${fac?.name || 'Faculty'} as Present.`
          : `Reset ${fac?.name || 'Faculty'} attendance to Scheduled.`,
    });
    setTimeout(() => setActionToast(null), 3000);
  };

  const handleMarkAbsent = (duty: Assignment) => {
    markAttendance(duty.id, 'absent');
    const fac = facultyMap.get(duty.facultySrNo);
    setActionToast({
      text: `Marked ${fac?.name || 'Faculty'} as Absent. Room is currently vacant.`,
    });
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleExecuteReserveDeploy = (reserveId: string) => {
    if (!deployTargetDuty) return;
    const targetDutyId = deployTargetDuty.id;
    const targetDutyRoom = deployTargetDuty.roomName || 'Assigned Room';
    const reserveFac = facultyMap.get(
      project.assignments.find((a) => a.id === reserveId)?.facultySrNo || 0
    );
    const res = deployReserveToRoom(reserveId, targetDutyId);
    if (res.success) {
      setDeployTargetDuty(null);
      setActionToast({
        text: res.message || `Deployed ${reserveFac?.name || 'Reserve'} to ${targetDutyRoom}.`,
        onUndo: () => {
          undoDeployReserve(reserveId, targetDutyId);
          setActionToast({
            text: `Reverted deployment of ${reserveFac?.name || 'Reserve'}.`,
          });
          setTimeout(() => setActionToast(null), 3000);
        },
      });
      setTimeout(() => setActionToast(null), 6000);
    }
  };

  // Direct Drag-and-Drop Deploy Handler: marks original as absent & deploys reserve without any overlay
  const handleDropReserveOnDuty = (reserveId: string, targetDutyId: string) => {
    const targetDuty = project.assignments.find((a) => a.id === targetDutyId);
    if (!targetDuty) return;
    const targetRoom = targetDuty.roomName || 'Assigned Room';
    const originalFac = facultyMap.get(targetDuty.facultySrNo);
    const reserveAsg = project.assignments.find((a) => a.id === reserveId);
    const reserveFac = reserveAsg ? facultyMap.get(reserveAsg.facultySrNo) : null;

    const res = deployReserveToRoom(reserveId, targetDutyId);
    if (res.success) {
      setDeployTargetDuty(null);
      setActionToast({
        text: `Marked ${originalFac?.name || 'Faculty'} Absent & deployed ${reserveFac?.name || 'Reserve'} to ${targetRoom}.`,
        onUndo: () => {
          undoDeployReserve(reserveId, targetDutyId);
          setActionToast({
            text: `Reverted deployment of ${reserveFac?.name || 'Reserve'}.`,
          });
          setTimeout(() => setActionToast(null), 3000);
        },
      });
      setTimeout(() => setActionToast(null), 6000);
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

            {/* Print Daily Register Dropdown Menu */}
            <div className="relative print-dropdown-container">
              <button
                type="button"
                onClick={() => setIsPrintDropdownOpen((prev) => !prev)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                title="Print official Daily Attendance Register"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Daily Register</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isPrintDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 apple-glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-spring space-y-1 text-xs"
                  data-lenis-prevent
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Print Register Format
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPrintMode('separate');
                      setIsPrintDropdownOpen(false);
                      setTimeout(() => window.print(), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-800 dark:text-slate-200 flex flex-col transition cursor-pointer"
                  >
                    <div className="font-bold flex items-center justify-between text-sky-700 dark:text-sky-400">
                      <span>Each Session Separately</span>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-900/60 px-1.5 py-0.5 rounded font-semibold">Recommended</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Page break per session with dedicated header &amp; signatures
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPrintMode('combined');
                      setIsPrintDropdownOpen(false);
                      setTimeout(() => window.print(), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex flex-col transition cursor-pointer"
                  >
                    <span className="font-bold">All Sessions (Combined)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Continuous single roster for the whole day
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPrintMode('active_session');
                      setIsPrintDropdownOpen(false);
                      setTimeout(() => window.print(), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex flex-col transition cursor-pointer"
                  >
                    <span className="font-bold">Current Active Session ({selectedSession})</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Only print duties matching the current filter
                    </span>
                  </button>
                </div>
              )}
            </div>
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              title="Filter by role"
            >
              <option value="All">All Roles</option>
              <option value="Regular">Regular Faculty</option>
              <option value="HOD">HODs Only</option>
              {(project.settings.customRoles || DEFAULT_CUSTOM_ROLES).map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Room Filter */}
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium max-w-[140px] truncate"
              title="Filter by assigned room"
            >
              <option value="All">All Rooms</option>
              <option value="assigned">Assigned Rooms Only</option>
              <option value="unassigned">Unassigned Only</option>
              {availableRooms.map((rm) => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
            </select>

            {/* Status Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
              {(['All', 'pending', 'present', 'absent'] as const).map((filter) => {
                const isSelected = statusFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition cursor-pointer border ${
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

            {/* Sort Duties Selector */}
            <div className="flex items-center space-x-1.5 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <select
                value={dutySortOption}
                onChange={(e) => setDutySortOption(e.target.value as any)}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:outline-none font-medium cursor-pointer"
                title="Sort assigned room duties"
              >
                <option value="session_room">Sort: Session &amp; Room</option>
                <option value="absent_first">Sort: Vacant / Absent First</option>
                <option value="faculty_name">Sort: Faculty Name</option>
              </select>
            </div>

            {/* Clear All Filters Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="btn-spring flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 shadow-2xs transition cursor-pointer"
                title="Reset all search and filter parameters"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear Filters</span>
              </button>
            )}
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
                {sortedDisplayedDuties.length}
              </span>
            </h3>
            <span className="text-xs text-slate-400">Drag a reserve supervisor here to deploy instantly</span>
          </div>

          {sortedDisplayedDuties.length === 0 ? (
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
              {sortedDisplayedDuties.map((duty) => {
                const fac = facultyMap.get(duty.facultySrNo);
                const isPresent = duty.attendanceStatus === 'present' || duty.attendanceStatus === 'deployed';
                const isAbsent = duty.attendanceStatus === 'absent';
                const isVacant = isAbsent && !duty.replacedByFacultySrNo;
                const replacedBy = duty.replacedByFacultySrNo ? facultyMap.get(duty.replacedByFacultySrNo) : null;
                const isDragTarget = dragOverDutyId === duty.id;

                return (
                  <div
                    key={duty.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverDutyId(duty.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDragOverDutyId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverDutyId(null);
                      let reserveId = '';
                      try {
                        const raw = e.dataTransfer.getData('application/json');
                        if (raw) {
                          const parsed = JSON.parse(raw);
                          reserveId = parsed.reserveId;
                        }
                      } catch {}
                      if (!reserveId) {
                        reserveId = e.dataTransfer.getData('text/plain');
                      }
                      if (reserveId) {
                        handleDropReserveOnDuty(reserveId, duty.id);
                      }
                    }}
                    className={`apple-glass-card p-4 rounded-2xl space-y-3 transition border ${
                      isDragTarget
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500 shadow-xl scale-[1.01]'
                        : isVacant
                        ? 'border-rose-400/80 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-2 ring-rose-400/30'
                        : isPresent
                        ? 'border-emerald-300/80 bg-emerald-50/30 dark:bg-emerald-950/15'
                        : 'border-slate-200/80 dark:border-white/10'
                    }`}
                  >
                    {/* Active Drag-over Alert */}
                    {isDragTarget && (
                      <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-600 text-xs font-bold text-sky-800 dark:text-sky-200 text-center animate-pulse flex items-center justify-center space-x-1.5">
                        <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>Drop here to mark absent &amp; deploy standby reserve</span>
                      </div>
                    )}

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
                {sortedStandbyReserves.length}
              </span>
            </h3>
            <span className="text-xs text-slate-400">Control Room Pool</span>
          </div>

          <div className="apple-glass-card p-4 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Supervisors sorted lowest to highest workload. Drag and drop any supervisor onto a room to deploy instantly.
            </p>

            {sortedStandbyReserves.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                No reserves scheduled for this session.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedStandbyReserves.map((resDuty) => {
                  const resFac = facultyMap.get(resDuty.facultySrNo);
                  const isDeployed = resDuty.attendanceStatus === 'deployed';
                  const workload = facultyWorkloadMap.get(resDuty.facultySrNo) || 0;

                  return (
                    <div
                      key={resDuty.id}
                      draggable={!isDeployed}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ reserveId: resDuty.id }));
                        e.dataTransfer.setData('text/plain', resDuty.id);
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      className={`p-3 rounded-xl border transition ${
                        isDeployed
                          ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40 opacity-75'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200/70 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md cursor-grab active:cursor-grabbing select-none'
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

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isDeployed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              Deployed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                              Ready
                            </span>
                          )}
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300/40"
                            title="Total duties assigned across exam period"
                          >
                            {workload} {workload === 1 ? 'duty' : 'duties'}
                          </span>
                        </div>
                      </div>

                      {isDeployed && resDuty.deployedToRoom && (
                        <div className="mt-2 text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3" />
                          <span>Serving in: {resDuty.deployedToRoom}</span>
                        </div>
                      )}

                      {!isDeployed && (
                        <div className="flex items-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5">
                          <GripVertical className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                          <span>Drag &amp; drop onto room to deploy</span>
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

      {/* Deploy Reserve Modal - Centered, Rigid Viewport Dialog (Portaled to document.body to escape transform containing block) */}
      {deployTargetDuty && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          data-lenis-prevent
          onClick={() => setDeployTargetDuty(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deploy-reserve-title"
            className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-sky-300/80 dark:border-sky-900/50 flex flex-col max-h-[85vh] overflow-hidden animate-modal-spring"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Fixed Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="deploy-reserve-title" className="text-sm font-bold text-slate-900 dark:text-white">
                    Deploy Reserve to Vacant Room
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select a standby supervisor to replace the absent faculty.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeployTargetDuty(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Room Summary Badge (Fixed, Never Pushed Off) */}
            <div className="px-5 pt-3.5 pb-2 shrink-0">
              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-rose-950 dark:text-rose-200">
                      Target: {deployTargetDuty.roomName || 'Standard Hall'} ({deployTargetDuty.session})
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300 block truncate">
                      Original: {facultyMap.get(deployTargetDuty.facultySrNo)?.name || `Faculty ${deployTargetDuty.facultySrNo}`} (Absent)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 shrink-0">
                  Vacant
                </span>
              </div>
            </div>

            {/* Available Reserves List (Isolated Scroll Container) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2.5 space-y-2.5 touch-scroll">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Available Reserves on Standby ({candidateReservesForTarget.length})
              </div>

              {candidateReservesForTarget.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                  No standby reserves available for this session ({deployTargetDuty.session}). Reassign via Schedule Viewer or add new faculty.
                </div>
              ) : (
                candidateReservesForTarget.map((cRes) => {
                  const cFac = facultyMap.get(cRes.facultySrNo);
                  return (
                    <div
                      key={cRes.id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-3 hover:border-sky-300 dark:hover:border-sky-700 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 truncate">
                          <span className="truncate">{cFac?.name || `Faculty ${cRes.facultySrNo}`}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">Sr #{cRes.facultySrNo}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Arrival: {cFac?.arrival || 'Morning'} &bull; Dept: {cFac?.department || 'General'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExecuteReserveDeploy(cRes.id)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 rounded-xl shadow-xs transition cursor-pointer shrink-0 flex items-center space-x-1"
                      >
                        <span>Deploy Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky Fixed Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-end shrink-0 bg-white/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setDeployTargetDuty(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Official Daily Attendance Register (Optimized for Printing) */}
      <div className="hidden print:block font-serif text-black p-4 bg-white">
        {printMode === 'separate' ? (
          // Print each session separately with clean page break per session
          sessionsForDate.map((sess, sIdx) => {
            const sessDuties = dateAssignments.filter((a) => a.session === sess && !a.isReserve);
            const sessReserves = dateAssignments.filter(
              (a) => a.session === sess && (a.isReserve || a.attendanceStatus === 'deployed')
            );
            const timing = activeDateConfig?.sessionTimings?.[sess];

            return (
              <div
                key={sess}
                className="mb-8"
                style={{
                  pageBreakAfter: sIdx < sessionsForDate.length - 1 ? 'always' : 'auto',
                  breakAfter: sIdx < sessionsForDate.length - 1 ? 'page' : 'auto',
                }}
              >
                {/* Institutional Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-4">
                  <h1 className="text-xl font-bold uppercase tracking-wide">{institution.institutionName}</h1>
                  <h2 className="text-sm font-semibold mt-0.5">{institution.officeTitle}</h2>
                  <p className="text-xs italic mt-0.5">{institution.subHeader}</p>
                  <div className="mt-2 pt-2 border-t border-dotted border-black flex justify-between text-xs font-bold">
                    <span>DAILY INVIGILATION ATTENDANCE REGISTER</span>
                    <span>Date: {activeDateConfig?.displayDate || selectedDateIso} ({activeDateConfig?.dayOfWeek})</span>
                    <span>
                      Session: {sess} {timing ? `(${timing.start} - ${timing.end})` : ''}
                    </span>
                  </div>
                </div>

                {/* Attendance Table */}
                <table className="w-full text-left text-xs border-collapse border border-black mb-6">
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
                    {sessDuties.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center italic text-slate-500 border border-black">
                          No invigilation duties scheduled for this session.
                        </td>
                      </tr>
                    ) : (
                      sessDuties.map((duty, idx) => {
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
                      })
                    )}

                    {/* Standby Reserves Section in Table for this session */}
                    {sessReserves.length > 0 && (
                      <>
                        <tr className="bg-slate-100 font-bold border-t-2 border-b border-black">
                          <td colSpan={8} className="p-1.5 uppercase tracking-wider text-[11px]">
                            Standby Reserve Supervisors on Duty (Control Room - {sess})
                          </td>
                        </tr>
                        {sessReserves.map((resDuty, rIdx) => {
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

                {/* Signing Authorities per session page */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                  {(institution.signingAuthorities || []).map((auth) => (
                    <div key={auth.id} className="border-t border-black pt-2">
                      <div className="font-bold">{auth.name || 'Signature'}</div>
                      <div className="text-[11px] text-slate-700">{auth.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Combined or Active Session single continuous printout
          <div>
            {/* Institutional Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-4">
              <h1 className="text-xl font-bold uppercase tracking-wide">{institution.institutionName}</h1>
              <h2 className="text-sm font-semibold mt-0.5">{institution.officeTitle}</h2>
              <p className="text-xs italic mt-0.5">{institution.subHeader}</p>
              <div className="mt-2 pt-2 border-t border-dotted border-black flex justify-between text-xs font-bold">
                <span>DAILY INVIGILATION ATTENDANCE REGISTER</span>
                <span>Date: {activeDateConfig?.displayDate || selectedDateIso} ({activeDateConfig?.dayOfWeek})</span>
                <span>
                  Session: {printMode === 'combined' ? 'All Sessions (Combined)' : selectedSession}
                </span>
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
                {(printMode === 'combined'
                  ? dateAssignments.filter((a) => !a.isReserve)
                  : primaryRoomDuties
                ).map((duty, idx) => {
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
                {(printMode === 'combined'
                  ? dateAssignments.filter((a) => a.isReserve || a.attendanceStatus === 'deployed')
                  : standbyReserves
                ).length > 0 && (
                  <>
                    <tr className="bg-slate-100 font-bold border-t-2 border-b border-black">
                      <td colSpan={8} className="p-1.5 uppercase tracking-wider text-[11px]">
                        Standby Reserve Supervisors on Duty (Control Room)
                      </td>
                    </tr>
                    {(printMode === 'combined'
                      ? dateAssignments.filter((a) => a.isReserve || a.attendanceStatus === 'deployed')
                      : standbyReserves
                    ).map((resDuty, rIdx) => {
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
        )}
      </div>

      {/* Floating Action Toast Notification (Centered at Bottom with Undo) */}
      {actionToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/10 animate-spring no-print"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate max-w-xs sm:max-w-md">{actionToast.text}</span>
          {actionToast.onUndo && (
            <button
              type="button"
              onClick={() => {
                actionToast.onUndo?.();
                setActionToast(null);
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition ml-1 shrink-0 cursor-pointer"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setActionToast(null)}
            aria-label="Dismiss toast"
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
