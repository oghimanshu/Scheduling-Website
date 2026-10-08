import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Building,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Stamp,
  Sliders,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Assignment, ExamRoom, Faculty, SigningAuthority } from '../types';
import { setPrintOrientation, clearPrintOrientation } from '../utils/printHelper';

export const RoomChartModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isRoomChartModalOpen,
    setIsRoomChartModalOpen,
  } = useScheduler();

  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [selectedSession, setSelectedSession] = useState<string>('All');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeReserve, setIncludeReserve] = useState<boolean>(true);

  // Close on Escape key
  useEffect(() => {
    if (!isRoomChartModalOpen && !forceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRoomChartModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRoomChartModalOpen, forceOpen, setIsRoomChartModalOpen]);

  // Set print orientation
  useEffect(() => {
    if (isRoomChartModalOpen || forceOpen) {
      setPrintOrientation(orientation);
    }
    return () => {
      clearPrintOrientation();
    };
  }, [isRoomChartModalOpen, forceOpen, orientation]);

  if (!forceOpen && !isRoomChartModalOpen) return null;

  const dates = project.examPeriod.dates.filter((d) => !d.isExcluded);
  const activeRooms = (project.rooms || []).filter((r) => r.isActive !== false);

  // Filter dates & sessions
  const targetDates = useMemo(() => {
    if (selectedDate === 'All') return dates;
    return dates.filter((d) => d.date === selectedDate);
  }, [dates, selectedDate]);

  // Helper to get faculty info
  const getFaculty = (srNo: number): Faculty | undefined => {
    return project.faculty.find((f) => f.srNo === srNo);
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

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start print:static print:bg-white print:p-0">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Noticeboard Room-wise Invigilation Chart</h2>
            <p className="text-xs text-slate-500">Official hall allocation & supervisor signature register</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Exam Dates ({dates.length})</option>
              {dates.map((d) => (
                <option key={d.date} value={d.date}>
                  {new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({d.dayOfWeek})
                </option>
              ))}
            </select>
          </div>

          {/* Session Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Sessions</option>
              {(project.sessions || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.defaultTiming?.start || ''} - {s.defaultTiming?.end || ''})
                </option>
              ))}
            </select>
          </div>

          {/* Orientation Selector */}
          <button
            onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <Sliders className="w-3 h-3" />
            {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
          </button>

          {/* Action Buttons */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Chart
          </button>

          <button
            onClick={() => setIsRoomChartModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet View */}
      <div className="w-full max-w-5xl my-6 bg-white text-slate-900 rounded-2xl shadow-2xl p-8 print:my-0 print:p-4 print:shadow-none print:max-w-none print:w-full print:rounded-none">
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight uppercase text-slate-900">
            {institution.institutionName || 'College Examination Cell'}
          </h1>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mt-0.5">
            {institution.officeTitle || 'Office of the Controller of Examinations'}
          </h2>
          {institution.subHeader && (
            <p className="text-xs text-slate-500 mt-0.5">{institution.subHeader}</p>
          )}

          <div className="mt-3 inline-block px-4 py-1 bg-slate-100 text-slate-800 rounded-full font-bold text-xs uppercase tracking-wider border border-slate-300">
            {project.examPeriod.name || 'End Semester Examinations'} &bull; Noticeboard Invigilation Chart
          </div>
        </div>

        {/* Loop through target dates */}
        {targetDates.map((dateObj) => {
          const sessionsToRender = (project.sessions || []).filter(
            (s) => selectedSession === 'All' || s.id === selectedSession
          );

          return (
            <div key={dateObj.date} className="mb-8 last:mb-2 print:page-break-after">
              {/* Date Header */}
              <div className="flex items-center justify-between bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-700 font-bold" />
                  <span className="font-bold text-sm text-slate-900">
                    {new Date(dateObj.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  {dateObj.dayOfWeek}
                </span>
              </div>

              {/* Loop through sessions for this date */}
              {sessionsToRender.map((session) => {
                const sessionAssignments = project.assignments.filter(
                  (a) => a.date === dateObj.date && a.session === session.id
                );

                if (sessionAssignments.length === 0) {
                  return null;
                }

                // Partition assignments into rooms vs reserve pool
                const roomGroupMap = new Map<string, Assignment[]>();
                const reserveAssignments: Assignment[] = [];

                sessionAssignments.forEach((a) => {
                  if (a.isReserve || a.roomId === 'reserve-pool') {
                    reserveAssignments.push(a);
                  } else {
                    const rKey = a.roomId || a.roomName || 'Unassigned Hall';
                    if (!roomGroupMap.has(rKey)) roomGroupMap.set(rKey, []);
                    roomGroupMap.get(rKey)!.push(a);
                  }
                });

                const sessTiming = dateObj.sessionTimings?.[session.id] || session.defaultTiming;
                const timingStart = sessTiming?.start || '10:00 AM';
                const timingEnd = sessTiming?.end || '01:00 PM';

                return (
                  <div key={session.id} className="mb-6">
                    {/* Session Subheader */}
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          {session.name}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          Exam Timing: {timingStart} - {timingEnd}
                        </span>
                        <span className="text-xs text-slate-400">
                          (Reporting: 30 mins before start)
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {sessionAssignments.length} Supervisors Assigned
                      </span>
                    </div>

                    {/* Room-wise Invigilation Table */}
                    <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-4">
                      <thead className="bg-slate-50 text-slate-800">
                        <tr className="border-b border-slate-300">
                          <th className="py-2 px-3 border-r border-slate-300 font-bold w-12 text-center">#</th>
                          <th className="py-2 px-3 border-r border-slate-300 font-bold w-48">Examination Hall</th>
                          <th className="py-2 px-3 border-r border-slate-300 font-bold w-32">Block / Level</th>
                          <th className="py-2 px-3 border-r border-slate-300 font-bold w-20 text-center">Capacity</th>
                          <th className="py-2 px-3 border-r border-slate-300 font-bold">Assigned Invigilator(s)</th>
                          <th className="py-2 px-3 border-slate-300 font-bold w-36 text-center">Signature on Duty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Array.from(roomGroupMap.entries()).map(([roomKey, roomDuties], rIdx) => {
                          const matchedRoom = activeRooms.find((r) => r.id === roomKey || r.name === roomKey);
                          const roomDisplayName = matchedRoom ? matchedRoom.name : (roomDuties[0]?.roomName || roomKey);
                          const roomBlock = matchedRoom ? `${matchedRoom.block}${matchedRoom.floor ? ` (${matchedRoom.floor})` : ''}` : 'Main Wing';
                          const roomCap = matchedRoom?.capacity || 30;

                          return (
                            <tr key={roomKey} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 border-r border-slate-300 text-center font-medium text-slate-500">
                                {rIdx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">
                                {roomDisplayName}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-slate-600">
                                {roomBlock}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-700 font-semibold">
                                {roomCap}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300">
                                <div className="space-y-1">
                                  {roomDuties.map((duty) => {
                                    const fac = getFaculty(duty.facultySrNo);
                                    return (
                                      <div key={duty.id} className="flex items-center justify-between gap-2">
                                        <div>
                                          <span className="font-semibold text-slate-900">
                                            {fac?.name || `Faculty #${duty.facultySrNo}`}
                                          </span>
                                          {fac?.role && (
                                            <span className="text-[10px] text-slate-500 ml-1.5">
                                              ({fac.role})
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 uppercase">
                                          Sr. {duty.facultySrNo}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center border-slate-300">
                                <div className="h-7 border-b border-dashed border-slate-300 flex items-end justify-center">
                                  <span className="text-[9px] text-slate-300">Sign here</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Reserve Pool Table (if any) */}
                    {includeReserve && reserveAssignments.length > 0 && (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-700" />
                            Exam Control Room & Standby / Reserve Invigilators
                          </span>
                          <span className="text-[11px] text-amber-700 font-medium">
                            Report to Examination Control Room 30 mins before session
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {reserveAssignments.map((resDuty) => {
                            const fac = getFaculty(resDuty.facultySrNo);
                            return (
                              <div
                                key={resDuty.id}
                                className="flex items-center justify-between bg-white border border-amber-200 p-2 rounded text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800 block">
                                    {fac?.name || `Faculty #${resDuty.facultySrNo}`}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {fac?.role || 'Reserve Supervisor'}
                                  </span>
                                </div>
                                <div className="w-20 border-b border-dashed border-slate-300 h-5" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Signatures & Certification Block */}
        <div className="mt-12 pt-6 border-t border-slate-300">
          <div className="grid grid-cols-3 gap-6 text-center">
            {((institution.signingAuthorities && institution.signingAuthorities.length > 0)
              ? institution.signingAuthorities
              : ([
                  { id: '1', role: 'Chief Superintendent', name: 'Dr. Exam Superintendent' },
                  { id: '2', role: 'Centre Superintendent', name: 'Dean Academics' },
                  { id: '3', role: 'Controller of Examinations', name: 'Controller of Examinations' },
                ] as SigningAuthority[])
            ).map((auth: SigningAuthority) => (
              <div key={auth.id} className="space-y-1">
                <div className="h-10 border-b border-dashed border-slate-400 mx-6 mb-1" />
                <p className="font-bold text-xs text-slate-900">{auth.name}</p>
                <p className="text-[11px] text-slate-500 uppercase">{auth.role}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-8 pt-2 border-t border-slate-100">
            <span>Generated via Automated Examination Supervision Scheduler</span>
            <span>All invigilators are required to report at least 30 minutes before exam commencement.</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};
