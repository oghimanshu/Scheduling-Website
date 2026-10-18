import React, { useRef, useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  FileCode,
  FileText,
  FileCheck2,
  Calendar,
  User,
  Users,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import {
  exportProjectToJson,
  importProjectFromJson,
  exportScheduleToExcel,
  exportScheduleToCsv,
  exportConsolidatedDutiesToExcel,
  exportConsolidatedDutiesToCsv,
  exportSingleFacultyToExcel,
  exportSingleFacultyToCsv,
} from '../services/export/exportManager';
import { downloadFacultyCalendarIcs } from '../services/calendarService';
import { Faculty } from '../types';

export const ExportModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isExportModalOpen,
    setIsExportModalOpen,
    importProjectData,
    setActiveTab,
    setIsDutySlipsModalOpen,
    setIsPrintScheduleModalOpen,
  } = useScheduler();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRoomsConfigured = useMemo(() => {
    return (project.rooms && project.rooms.length > 0) || project.assignments.some((a) => !!a.roomName);
  }, [project.rooms, project.assignments]);

  const [includeRooms, setIncludeRooms] = useState<boolean>(
    project.settings?.enableRoomAllocation ?? false
  );

  const [selectedFacultySrNo, setSelectedFacultySrNo] = useState<number>(
    project.faculty[0]?.srNo ?? 1
  );

  const selectedFaculty: Faculty | undefined = useMemo(() => {
    return project.faculty.find((f) => Number(f.srNo) === Number(selectedFacultySrNo)) || project.faculty[0];
  }, [project.faculty, selectedFacultySrNo]);

  const facultyDutiesCount = useMemo(() => {
    if (!selectedFaculty) return 0;
    return project.assignments.filter((a) => Number(a.facultySrNo) === Number(selectedFaculty.srNo)).length;
  }, [project.assignments, selectedFaculty]);

  if (!forceOpen && !isExportModalOpen) return null;

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = importProjectFromJson(text);
      if (res.success && res.state) {
        importProjectData(res.state);
        alert('Successfully restored project state from JSON backup file!');
        setIsExportModalOpen(false);
      } else {
        alert(res.error || 'Failed to restore project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    setIsExportModalOpen(false);
    setActiveTab('schedule');
    setIsPrintScheduleModalOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      data-lenis-prevent
    >
      <div className="liquid-glass-modal rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Export Schedule &amp; Project Backup
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Generate master matrices, consolidated duty tables, or individual faculty schedules.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Room Allocation Export Preference Toggle */}
          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Building className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Include Room / Hall Allocations in Exports
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  {includeRooms
                    ? 'Session entries will include assigned examination rooms (e.g. "JRS 1 [Hall 101]").'
                    : 'Clean export without room labels (e.g. pure "JRS 1"), avoiding room-tag clutter.'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={includeRooms}
                disabled={!hasRoomsConfigured}
                onChange={(e) => setIncludeRooms(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Section 1: Individual Faculty Duty Timetables */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Individual Faculty Schedules</span>
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Personalized timetables for notice &amp; faculty portals
              </span>
            </div>

            {/* Individual Faculty Card */}
            <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Select Faculty Member:
                  </label>
                  <select
                    value={selectedFacultySrNo}
                    onChange={(e) => setSelectedFacultySrNo(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  >
                    {project.faculty.map((f) => {
                      const count = project.assignments.filter((a) => Number(a.facultySrNo) === Number(f.srNo)).length;
                      return (
                        <option key={f.srNo} value={f.srNo}>
                          #{f.srNo} - {f.name} ({f.isHod ? 'HOD' : 'Faculty'} • {count} duties)
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedFaculty && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-right shrink-0">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Total Allocated: {facultyDutiesCount} duties
                    </span>
                    <span className="block text-[10px]">
                      Arrival: {selectedFaculty.arrival} • Target: {selectedFaculty.targetSupervisions}
                    </span>
                  </div>
                )}
              </div>

              {selectedFaculty && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-100 dark:border-sky-900/40">
                  <button
                    type="button"
                    onClick={() => exportSingleFacultyToExcel(selectedFaculty, project, { includeRooms })}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportSingleFacultyToCsv(selectedFaculty, project, { includeRooms })}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFacultyCalendarIcs(
                        selectedFaculty,
                        project.assignments,
                        project.examPeriod?.dates || []
                      )
                    }
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar (.ics)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Consolidated Duties Table Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Consolidated Duties Roster (Flat Table)
                  </h4>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Un-pivoted table with one row per scheduled duty (Faculty, Date, Session, Timing, Room, Duty Type).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => exportConsolidatedDutiesToExcel(project, { includeRooms })}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                >
                  Excel Table
                </button>
                <button
                  type="button"
                  onClick={() => exportConsolidatedDutiesToCsv(project, { includeRooms })}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-semibold rounded-lg hover:bg-sky-100 transition cursor-pointer"
                >
                  CSV Table
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Master Examination Schedule Grids */}
          <div className="space-y-2.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Master Examination Schedules</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Excel Master Workbook */}
              <div
                onClick={() => exportScheduleToExcel(project, { includeRooms })}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Excel Master Workbook (.xlsx)</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Multi-sheet workbook: Faculty Schedule, Session Rosters, Individual Duties, and Workload Analysis.
                  </p>
                </div>
                <button className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
                  <span>Download Excel Workbook</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* CSV Master Duty Schedule */}
              <div
                onClick={() => exportScheduleToCsv(project, { includeRooms })}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-sky-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">CSV Master Schedule (.csv)</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Standard matrix CSV compatible with Google Sheets, Excel, and college administrative systems.
                  </p>
                </div>
                <button className="text-sky-700 dark:text-sky-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
                  <span>Download CSV Matrix</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* Print Master Customizer */}
              <div
                onClick={handlePrint}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-slate-900 dark:text-white">Print-Friendly Format</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Customizer
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    High-contrast printable layout with column toggles, official letterhead, and signature blocks.
                  </p>
                </div>
                <button className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
                  <span>Open Print Customizer</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* Complete JSON Project Backup */}
              <div
                onClick={() => exportProjectToJson(project)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Full Project Backup (.json)</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Preserves faculty, dates, exclusions, availability, locks, overrides, and schedule alternatives.
                  </p>
                </div>
                <button className="text-indigo-700 dark:text-indigo-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
                  <span>Save Project Backup</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>

          {/* Individual Faculty Duty Slips Shortcut */}
          <div
            onClick={() => {
              setIsExportModalOpen(false);
              setIsDutySlipsModalOpen(true);
            }}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Faculty Duty Slips &amp; Appointment Orders
                  </h4>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Printable Slips
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Print official invigilation orders per faculty member with reporting times and formal signatures.
                </p>
                <div className="pt-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                  <span>Open Slips &amp; Batch Print Assistant</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </div>
          </div>

          {/* Restore from JSON Project File */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Restore Existing Project File</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Load a previously exported .json project snapshot to restore full state.
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 rounded-lg shadow-2xs transition shrink-0 flex items-center space-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select JSON File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleJsonUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
