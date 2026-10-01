import React, { useState, useMemo } from 'react';
import {
  X,
  FileCheck2,
  Printer,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  CheckCircle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Faculty } from '../types';

export const DutySlipsModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const { project, isDutySlipsModalOpen, setIsDutySlipsModalOpen } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultySrNo, setSelectedFacultySrNo] = useState<number | null>(null);
  const [isBatchPrintingAll, setIsBatchPrintingAll] = useState(false);

  if (!forceOpen && !isDutySlipsModalOpen) return null;

  // Active faculty who have at least 1 assigned duty
  const facultyWithDuties = project.faculty.filter((f) => {
    const dutiesCount = project.assignments.filter((a) => a.facultySrNo === f.srNo).length;
    return dutiesCount > 0;
  });

  const filteredFaculty = facultyWithDuties.filter((f) => {
    return (
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.srNo.toString().includes(searchTerm)
    );
  });

  const activeFaculty: Faculty | undefined =
    project.faculty.find((f) => f.srNo === selectedFacultySrNo) || filteredFaculty[0];

  const getFacultyDuties = (srNo: number) => {
    const list = project.assignments.filter((a) => a.facultySrNo === srNo);
    // Sort by date then session
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session));
  };

  const handlePrintCurrent = () => {
    setIsBatchPrintingAll(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintAll = () => {
    setIsBatchPrintingAll(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden my-auto animate-modal-spring print:border-none print:shadow-none print:max-h-none print:max-w-none print:rounded-none">
        {/* Header - Hidden during print */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty Duty Slips &amp; Appointment Orders
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official invigilation appointment orders formatted with institutional headers, session timings, reporting schedules, and signature blocks.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintAll}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl transition cursor-pointer flex items-center space-x-1.5"
              title="Print all faculty slips with page breaks"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Slips ({facultyWithDuties.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDutySlipsModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Layout - Two Columns (Hidden in batch print mode) */}
        <div className={`flex flex-col md:flex-row flex-1 overflow-hidden ${isBatchPrintingAll ? 'no-print' : ''}`}>
          {/* Left Sidebar: Faculty Roster Selection (no-print) */}
          <div className="w-full md:w-72 border-r border-slate-200/80 dark:border-white/10 p-4 space-y-3 overflow-y-auto max-h-[300px] md:max-h-none no-print">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              {filteredFaculty.map((fac) => {
                const isSelected = activeFaculty?.srNo === fac.srNo;
                const dutiesCount = project.assignments.filter((a) => a.facultySrNo === fac.srNo).length;

                return (
                  <button
                    key={fac.srNo}
                    type="button"
                    onClick={() => setSelectedFacultySrNo(fac.srNo)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-semibold">{fac.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Sr. #{fac.srNo} &bull; {fac.role || (fac.isHod ? 'HOD' : 'Regular')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 font-mono">
                      {dutiesCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Preview: Single Slip Display */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
            {activeFaculty ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center no-print">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Previewing Official Appointment Order
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintCurrent}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print This Slip</span>
                  </button>
                </div>

                {/* Duty Slip Paper Card */}
                <div className="p-6 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-white/15 rounded-2xl shadow-sm text-slate-900 dark:text-slate-100 space-y-5 print:border-none print:shadow-none print:p-0">
                  {/* Institutional Header */}
                  <div className="text-center border-b-2 border-slate-800 dark:border-white pb-3 space-y-1">
                    <h2 className="text-base font-extrabold uppercase tracking-wide">
                      Office of the Controller of Examinations
                    </h2>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {project.examPeriod.name || 'End Semester Examinations'}
                    </h3>
                    <p className="text-xs uppercase font-semibold text-slate-600 dark:text-slate-400 tracking-wider">
                      Invigilation Duty Appointment Order &amp; Schedule
                    </p>
                  </div>

                  {/* Faculty Info Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Faculty Member</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{activeFaculty.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sr. Number</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{activeFaculty.srNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation / Role</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {activeFaculty.role || (activeFaculty.isHod ? 'HOD' : 'Regular Faculty')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Assigned Duties</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {getFacultyDuties(activeFaculty.srNo).length}
                      </span>
                    </div>
                  </div>

                  {/* Duties Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Scheduled Examination Duties
                    </h4>
                    <table className="w-full text-left text-xs border border-slate-300 dark:border-white/20">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-300 dark:border-white/20">
                        <tr>
                          <th className="py-2 px-3 border-r border-slate-300 dark:border-white/20">#</th>
                          <th className="py-2 px-3 border-r border-slate-300 dark:border-white/20">Date</th>
                          <th className="py-2 px-3 border-r border-slate-300 dark:border-white/20">Day</th>
                          <th className="py-2 px-3 border-r border-slate-300 dark:border-white/20">Session / Slot</th>
                          <th className="py-2 px-3 border-r border-slate-300 dark:border-white/20">Exam Timings</th>
                          <th className="py-2 px-3">Reporting Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                        {getFacultyDuties(activeFaculty.srNo).map((duty, idx) => {
                          const dateCfg = project.examPeriod.dates.find((d) => d.date === duty.date);
                          const timing = dateCfg?.sessionTimings?.[duty.session];
                          const timingStr = timing ? `${timing.start} - ${timing.end}` : 'Standard';

                          return (
                            <tr key={duty.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono border-r border-slate-200 dark:border-white/10">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold border-r border-slate-200 dark:border-white/10">
                                {dateCfg?.displayDate || duty.date}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 dark:border-white/10">{dateCfg?.dayOfWeek}</td>
                              <td className="py-2 px-3 font-bold border-r border-slate-200 dark:border-white/10 text-emerald-700 dark:text-emerald-400">
                                {duty.session}
                                {duty.isReserve && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Standby Reserve
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono border-r border-slate-200 dark:border-white/10">{timingStr}</td>
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                                {timing ? `${timing.start} (15m prior)` : '15 mins prior'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Important Guidelines for Supervisors */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Important Instructions for Invigilators:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Please report to the Examination Control Room at least 15 minutes before the session commencement.</li>
                      <li>Possession of mobile phones, smartwatches, and programmable devices is strictly prohibited in examination halls.</li>
                      <li>In case of unforeseen emergency, contact the Chief Superintendent at least 2 hours in advance to arrange a replacement.</li>
                    </ul>
                  </div>

                  {/* Dual Signature Blocks */}
                  <div className="grid grid-cols-2 gap-8 pt-8">
                    <div className="text-center space-y-1">
                      <div className="border-t border-slate-400 dark:border-white/30 pt-1 font-semibold text-xs">
                        Invigilator's Acknowledgment
                      </div>
                      <div className="text-[10px] text-slate-400">Date: _______________</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="border-t border-slate-400 dark:border-white/30 pt-1 font-semibold text-xs">
                        Chief Superintendent / Controller of Exams
                      </div>
                      <div className="text-[10px] text-slate-400">Official Seal &amp; Signature</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                No faculty with assigned duties found. Please generate the schedule first.
              </div>
            )}
          </div>
        </div>

        {/* Batch Print Hidden Container - Becomes visible during window.print() when isBatchPrintingAll is true */}
        {isBatchPrintingAll && (
          <div className="hidden print:block print:w-full space-y-8">
            {facultyWithDuties.map((fac, facIdx) => {
              const duties = getFacultyDuties(fac.srNo);
              return (
                <div
                  key={fac.srNo}
                  className="p-6 bg-white text-black space-y-5"
                  style={{ pageBreakAfter: facIdx < facultyWithDuties.length - 1 ? 'always' : 'auto' }}
                >
                  {/* Institutional Header */}
                  <div className="text-center border-b-2 border-black pb-3 space-y-1">
                    <h2 className="text-base font-extrabold uppercase tracking-wide">
                      Office of the Controller of Examinations
                    </h2>
                    <h3 className="text-sm font-bold text-gray-800">
                      {project.examPeriod.name || 'End Semester Examinations'}
                    </h3>
                    <p className="text-xs uppercase font-semibold text-gray-600 tracking-wider">
                      Invigilation Duty Appointment Order &amp; Schedule
                    </p>
                  </div>

                  {/* Faculty Info Metadata Grid */}
                  <div className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-300 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Faculty Member</span>
                      <strong className="text-black font-bold">{fac.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Sr. Number</span>
                      <span className="font-mono font-bold text-black">#{fac.srNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Designation</span>
                      <span className="font-medium text-black">
                        {fac.role || (fac.isHod ? 'HOD' : 'Regular Faculty')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Duties</span>
                      <span className="font-mono font-bold text-black text-sm">{duties.length}</span>
                    </div>
                  </div>

                  {/* Duties Table */}
                  <table className="w-full text-left text-xs border border-black">
                    <thead className="bg-gray-100 font-bold border-b border-black">
                      <tr>
                        <th className="py-2 px-3 border-r border-black">#</th>
                        <th className="py-2 px-3 border-r border-black">Date</th>
                        <th className="py-2 px-3 border-r border-black">Day</th>
                        <th className="py-2 px-3 border-r border-black">Session</th>
                        <th className="py-2 px-3 border-r border-black">Exam Timings</th>
                        <th className="py-2 px-3">Reporting Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {duties.map((duty, idx) => {
                        const dateCfg = project.examPeriod.dates.find((d) => d.date === duty.date);
                        const timing = dateCfg?.sessionTimings?.[duty.session];
                        const timingStr = timing ? `${timing.start} - ${timing.end}` : 'Standard';

                        return (
                          <tr key={duty.id}>
                            <td className="py-2 px-3 font-mono border-r border-gray-300">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold border-r border-gray-300">
                              {dateCfg?.displayDate || duty.date}
                            </td>
                            <td className="py-2 px-3 border-r border-gray-300">{dateCfg?.dayOfWeek}</td>
                            <td className="py-2 px-3 font-bold border-r border-gray-300">{duty.session}</td>
                            <td className="py-2 px-3 font-mono border-r border-gray-300">{timingStr}</td>
                            <td className="py-2 px-3 font-mono">{timing ? `${timing.start} (15m prior)` : '15 mins prior'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Instructions */}
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-300 text-[10px] text-gray-700 space-y-0.5">
                    <strong>Instructions:</strong> Report 15 minutes before the session. Mobile phones and electronic gadgets are strictly banned in examination halls.
                  </div>

                  {/* Signature Blocks */}
                  <div className="grid grid-cols-2 gap-8 pt-6">
                    <div className="text-center space-y-1">
                      <div className="border-t border-black pt-1 font-semibold text-xs">Invigilator's Acknowledgment</div>
                      <div className="text-[10px] text-gray-500">Date: _______________</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="border-t border-black pt-1 font-semibold text-xs">Chief Superintendent / Controller</div>
                      <div className="text-[10px] text-gray-500">Official Seal &amp; Signature</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
