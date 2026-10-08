import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Sliders,
  Columns,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  FileText,
  Stamp,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Faculty, ExamDateConfig, Assignment } from '../types';
import { setPrintOrientation, clearPrintOrientation } from '../utils/printHelper';

export const PrintScheduleModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isPrintScheduleModalOpen,
    setIsPrintScheduleModalOpen,
    setIsLetterheadModalOpen,
  } = useScheduler();

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  // Active Tab for sidebar
  const [activeTab, setActiveTab] = useState<'columns' | 'layout' | 'header'>('columns');

  // Column Visibility States
  const [showSrNo, setShowSrNo] = useState(true);
  const [showRole, setShowRole] = useState(true);
  const [showArrival, setShowArrival] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showTotal, setShowTotal] = useState(true);
  const [onlyFacultyWithDuties, setOnlyFacultyWithDuties] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => activeDates.map((d) => d.date));

  // Layout & Density States
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [density, setDensity] = useState<'compact' | 'standard' | 'spacious'>('compact');
  const [margins, setMargins] = useState<'5mm' | '8mm' | '12mm'>('5mm');
  const [cellDisplayMode, setCellDisplayMode] = useState<'code_only' | 'with_timings'>('code_only');
  const [showStandbyTag, setShowStandbyTag] = useState(true);

  // Header & Footer States
  const [showInstHeader, setShowInstHeader] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showStatsBar, setShowStatsBar] = useState(true);
  const [repeatHeaderEveryPage, setRepeatHeaderEveryPage] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(
    project.projectName || 'Examination Supervision Master Duty Schedule'
  );
  const [documentSubtitle, setDocumentSubtitle] = useState(
    `${project.examPeriod.name || 'End Semester Examinations'} • Period: ${project.examPeriod.startDate} to ${project.examPeriod.endDate}`
  );
  const [showNoticeBox, setShowNoticeBox] = useState(true);
  const [noticeText, setNoticeText] = useState(
    'Important Notice: All designated invigilators must report to the Examination Control Room 15 minutes prior to session commencement. No mutual exchanges permitted without prior written sanction from the Controller of Examinations.'
  );
  const [showSignatures, setShowSignatures] = useState(true);
  const [signaturesTitle, setSignaturesTitle] = useState('Verified & Approved by:');

  // Close on Escape key
  useEffect(() => {
    if (!isPrintScheduleModalOpen && !forceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPrintScheduleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrintScheduleModalOpen, forceOpen, setIsPrintScheduleModalOpen]);

  if (!forceOpen && !isPrintScheduleModalOpen) return null;

  const institution = project.institution || {
    institutionName: 'College of Engineering & Technology',
    subHeader: 'Autonomous Institution • Affiliated to State Technological University',
    address: 'Main Campus, University Road, Academic Zone',
    officeTitle: 'Office of the Controller of Examinations',
    signingAuthorities: [
      {
        id: 'auth-1',
        name: '',
        role: 'Chief Superintendent / Controller',
        department: 'Examination Control Division',
      },
    ],
  };

  // Filter faculty based on option
  const printableFaculty = project.faculty.filter((f) => {
    if (onlyFacultyWithDuties) {
      const dutiesCount = project.assignments.filter((a) => a.facultySrNo === f.srNo).length;
      return dutiesCount > 0;
    }
    return true;
  });

  // Filter dates based on selection
  const printableDates = activeDates.filter((d) => selectedDates.includes(d.date));

  // Map assignments by faculty and date
  const assignmentsByFacultyDate = new Map<number, Map<string, Assignment[]>>();
  project.faculty.forEach((f) => {
    assignmentsByFacultyDate.set(f.srNo, new Map<string, Assignment[]>());
  });
  project.assignments.forEach((a) => {
    const fMap = assignmentsByFacultyDate.get(a.facultySrNo);
    if (fMap) {
      const list = fMap.get(a.date) || [];
      list.push(a);
      fMap.set(a.date, list);
    }
  });

  const toggleSelectAllDates = () => {
    if (selectedDates.length === activeDates.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates(activeDates.map((d) => d.date));
    }
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  // Trigger Print or PDF
  const triggerPrint = () => {
    const originalTitle = document.title;
    document.title = (documentTitle || 'Master_Examination_Schedule').replace(/[^a-zA-Z0-9_-]/g, '_');

    setPrintOrientation(orientation, margins);
    document.body.classList.add('printing-master-schedule');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-master-schedule');
        clearPrintOrientation();
        document.title = originalTitle;
      }, 1000);
    }, 200);
  };

  // Density styles calculation
  const getDensityClasses = () => {
    switch (density) {
      case 'compact':
        return {
          tableText: 'text-[9px] leading-tight',
          thPadding: 'py-1 px-1.5',
          tdPadding: 'py-0.5 px-1.5',
          subText: 'text-[7.5px]',
        };
      case 'spacious':
        return {
          tableText: 'text-xs leading-normal',
          thPadding: 'py-2 px-2.5',
          tdPadding: 'py-1.5 px-2.5',
          subText: 'text-[10px]',
        };
      case 'standard':
      default:
        return {
          tableText: 'text-[10.5px] leading-snug',
          thPadding: 'py-1.5 px-2',
          tdPadding: 'py-1 px-2',
          subText: 'text-[8.5px]',
        };
    }
  };

  const densityStyles = getDensityClasses();

  // Render Schedule Document Component (Used in both live preview and printable container)
  const renderScheduleDocument = (isPreview = false) => {
    const totalDutiesCount = project.assignments.length;

    const totalColumns =
      (showSrNo ? 1 : 0) +
      1 + // Faculty Member
      (showRole ? 1 : 0) +
      (showArrival ? 1 : 0) +
      printableDates.length +
      (showTarget ? 1 : 0) +
      (showTotal ? 1 : 0);

    const renderInstitutionalHeaderBlock = () => (
      <div className="border-b-2 border-black pb-2 mb-3 bg-white text-black w-full">
        <div
          className={`flex items-center ${
            institution.logoPlacement === 'center'
              ? 'flex-col justify-center text-center'
              : institution.logoPlacement === 'left' && institution.logoUrl && showLogo
              ? 'flex-row items-center justify-between text-left gap-3'
              : 'flex-col justify-center text-center'
          }`}
        >
          {institution.logoUrl && showLogo && institution.logoPlacement !== 'none' && (
            <img
              src={institution.logoUrl}
              alt="Emblem"
              className="w-12 h-12 object-contain shrink-0"
            />
          )}
          <div className="flex-1 text-center">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-black">
              {institution.institutionName}
            </h1>
            {institution.subHeader && (
              <p className="text-[11px] font-semibold text-gray-700">
                {institution.subHeader}
              </p>
            )}
            {institution.address && showAddress && (
              <p className="text-[10px] text-gray-600">
                {institution.address}
              </p>
            )}
            {institution.officeTitle && (
              <p className="text-xs font-bold uppercase tracking-wide text-gray-900 mt-0.5">
                {institution.officeTitle}
              </p>
            )}
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-black mt-1">
              {documentTitle}
            </h2>
            <h3 className="text-xs font-bold text-gray-800">
              {documentSubtitle}
            </h3>
          </div>
          {institution.logoPlacement === 'left' && institution.logoUrl && showLogo && (
            <div className="w-12 h-12 shrink-0" aria-hidden="true" />
          )}
        </div>

        {/* Summary Statistics Bar */}
        {showStatsBar && (
          <div className="text-[10px] text-gray-700 mt-2 flex justify-center space-x-6 border-t border-gray-300 pt-1 font-medium">
            <span>Total Active Faculty: <strong>{printableFaculty.length}</strong></span>
            <span>Total Exam Sessions: <strong>{printableDates.length} Days</strong></span>
            <span>Allocated Duties: <strong>{totalDutiesCount}</strong></span>
            <span>Date Published: <strong>{new Date().toLocaleDateString('en-GB')}</strong></span>
          </div>
        )}
      </div>
    );

    return (
      <div
        className={`bg-white text-black font-sans ${
          isPreview ? 'p-4 sm:p-6 shadow-md border border-gray-300 rounded-lg' : 'p-2 w-full'
        }`}
      >
        {/* Institutional Header (When rendered once at top of Page 1) */}
        {showInstHeader && !repeatHeaderEveryPage && renderInstitutionalHeaderBlock()}

        {/* Master Table */}
        <table className={`w-full text-left border-collapse border border-black ${densityStyles.tableText}`}>
          <thead>
            {/* Repeating Institutional Header inside <thead> when repeatHeaderEveryPage is true */}
            {showInstHeader && repeatHeaderEveryPage && (
              <tr className="border-0 bg-white">
                <th
                  colSpan={totalColumns}
                  className="border-0 p-0 pb-1 font-normal bg-white text-black text-left"
                >
                  {renderInstitutionalHeaderBlock()}
                </th>
              </tr>
            )}
            <tr className="bg-gray-100 font-bold border-b border-black text-black">
              {showSrNo && (
                <th className={`border border-black ${densityStyles.thPadding} w-10 text-center`}>
                  Sr.
                </th>
              )}
              <th className={`border border-black ${densityStyles.thPadding} min-w-[130px]`}>
                Faculty Member
              </th>
              {showRole && (
                <th className={`border border-black ${densityStyles.thPadding} w-16 text-center`}>
                  Role
                </th>
              )}
              {showArrival && (
                <th className={`border border-black ${densityStyles.thPadding} w-16 text-center`}>
                  Arrival
                </th>
              )}

              {/* Exam Date Columns */}
              {printableDates.map((d) => (
                <th
                  key={d.date}
                  className={`border border-black ${densityStyles.thPadding} text-center min-w-[85px]`}
                >
                  <div className="font-extrabold text-black tabular-nums">{d.displayDate}</div>
                  <div className={`${densityStyles.subText} font-semibold text-gray-600 uppercase`}>
                    {d.dayOfWeek.slice(0, 3)}
                  </div>
                </th>
              ))}

              {showTarget && (
                <th className={`border border-black ${densityStyles.thPadding} w-12 text-center`}>
                  Cap
                </th>
              )}
              {showTotal && (
                <th className={`border border-black ${densityStyles.thPadding} w-12 text-center`}>
                  Total
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {printableFaculty.map((f, idx) => {
              const fDateMap = assignmentsByFacultyDate.get(f.srNo);
              const activeDuties = project.assignments.filter(
                (a) => a.facultySrNo === f.srNo && activeDates.some((d) => d.date === a.date)
              );
              const assignedCount = activeDuties.length;
              const grandTotal = f.previousSupervisions + assignedCount;
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={f.srNo}
                  className={`border-b border-gray-400 ${isEven ? 'bg-white' : 'bg-gray-50/70'}`}
                >
                  {showSrNo && (
                    <td className={`border border-gray-400 ${densityStyles.tdPadding} text-center font-mono font-medium text-gray-800`}>
                      {f.srNo}
                    </td>
                  )}
                  <td className={`border border-gray-400 ${densityStyles.tdPadding} font-semibold text-black`}>
                    <div className="flex items-center space-x-1">
                      <span>{f.name}</span>
                      {f.isHod && (
                        <span className="text-[8px] font-bold px-1 rounded border border-gray-400 text-gray-800 shrink-0">
                          HOD
                        </span>
                      )}
                    </div>
                  </td>
                  {showRole && (
                    <td className={`border border-gray-400 ${densityStyles.tdPadding} text-center text-gray-700`}>
                      {f.role || (f.isHod ? 'HOD' : 'Faculty')}
                    </td>
                  )}
                  {showArrival && (
                    <td className={`border border-gray-400 ${densityStyles.tdPadding} text-center text-gray-700`}>
                      {f.arrival}
                    </td>
                  )}

                  {/* Date Duty Cells */}
                  {printableDates.map((d) => {
                    const dayDuties = fDateMap?.get(d.date) || [];
                    const timingCfg = d.sessionTimings;

                    return (
                      <td
                        key={d.date}
                        className={`border border-gray-400 ${densityStyles.tdPadding} text-center`}
                      >
                        {dayDuties.length > 0 ? (
                          <div className="space-y-0.5">
                            {dayDuties.map((duty) => {
                              const timing = timingCfg?.[duty.session];
                              return (
                                <div
                                  key={duty.id}
                                  className="font-bold text-black border border-gray-300 rounded px-1 py-0.2 bg-white"
                                >
                                  <div>
                                    <span>{duty.session}</span>
                                    {duty.isReserve && showStandbyTag && (
                                      <span className="ml-0.5 text-[7.5px] font-semibold text-gray-600 block sm:inline">
                                        (Standby)
                                      </span>
                                    )}
                                  </div>
                                  {duty.roomName && (
                                    <div className="text-[7.5px] font-semibold text-gray-700 leading-tight">
                                      {duty.roomName.split('(')[0].trim()}
                                    </div>
                                  )}
                                  {cellDisplayMode === 'with_timings' && timing && (
                                    <div className="text-[7px] font-mono text-gray-600">
                                      {timing.start}-{timing.end}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono text-[9px]">-</span>
                        )}
                      </td>
                    );
                  })}

                  {showTarget && (
                    <td className={`border border-gray-400 ${densityStyles.tdPadding} text-center font-mono font-medium text-gray-700`}>
                      {f.maxSupervisions}
                    </td>
                  )}
                  {showTotal && (
                    <td className={`border border-gray-400 ${densityStyles.tdPadding} text-center font-mono font-bold text-black`}>
                      {grandTotal}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notice / Instructions Box */}
        {showNoticeBox && noticeText && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-400 rounded text-[9.5px] text-gray-800 whitespace-pre-line">
            <strong>Important Notice &amp; Instructions:</strong> {noticeText}
          </div>
        )}

        {/* Official Signing Authorities Footer */}
        {showSignatures && institution.signingAuthorities.length > 0 && (
          <div className="mt-6 pt-3 border-t border-black">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-4">
              {signaturesTitle}
            </div>
            <div
              className={`grid gap-6 text-center ${
                institution.signingAuthorities.length === 1
                  ? 'grid-cols-1 max-w-xs ml-auto'
                  : institution.signingAuthorities.length === 2
                  ? 'grid-cols-2'
                  : institution.signingAuthorities.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {institution.signingAuthorities.map((auth) => (
                <div key={auth.id} className="space-y-0.5">
                  <div className="border-t border-black pt-1.5 font-semibold text-[11px] text-black">
                    {auth.name && <span className="block font-bold text-gray-900">{auth.name}</span>}
                    <span>{auth.role || 'Controller of Examinations'}</span>
                  </div>
                  {auth.department && (
                    <div className="text-[9px] text-gray-600">{auth.department}</div>
                  )}
                  <div className="text-[8px] text-gray-400">Official Seal &amp; Signature</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <div
      className="print-schedule-modal-backdrop fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={() => setIsPrintScheduleModalOpen(false)}
      data-lenis-prevent
    >
      <div
        className="print-schedule-modal-card apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-6xl w-full max-h-[94dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden sm:my-auto animate-sheet-up sm:animate-modal-spring pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen UI - Hidden on Print */}
        <div className="print-schedule-modal-ui flex flex-col flex-1 overflow-hidden">
          {/* Mobile Pull Handle */}
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Master Schedule Print &amp; PDF Customizer
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    High Contrast B&amp;W
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select columns, adjust layout density, toggle institutional headers, and add official signatures.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={triggerPrint}
                className="btn-spring px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule / PDF</span>
              </button>

              <button
                onClick={() => setIsPrintScheduleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Area: Split Two-Column (Sidebar Controls + Live Preview) */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Left Controls Panel */}
            <div className="w-full lg:w-80 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-slate-850 shrink-0 overflow-hidden">
              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-white/10 p-1.5 gap-1 bg-slate-100/70 dark:bg-slate-900 shrink-0">
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer ${
                    activeTab === 'columns'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Columns</span>
                </button>
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer ${
                    activeTab === 'layout'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Layout</span>
                </button>
                <button
                  onClick={() => setActiveTab('header')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer ${
                    activeTab === 'header'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Header</span>
                </button>
              </div>

              {/* Scrollable Configuration Controls */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" data-lenis-prevent>
                {activeTab === 'columns' && (
                  <div className="space-y-4 animate-tab-enter">
                    {/* Faculty Metadata Columns */}
                    <div className="space-y-2">
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                        Faculty Metadata Columns
                      </h4>
                      <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showSrNo}
                            onChange={(e) => setShowSrNo(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Sr. Number</span>
                        </label>
                        <label className="flex items-center space-x-2 opacity-70 cursor-not-allowed">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled
                            className="rounded text-emerald-600"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Faculty Name (Mandatory)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showRole}
                            onChange={(e) => setShowRole(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Role / Designation</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showArrival}
                            onChange={(e) => setShowArrival(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Arrival Category</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showTarget}
                            onChange={(e) => setShowTarget(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Workload Target / Cap</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showTotal}
                            onChange={(e) => setShowTotal(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">Total Duties Column</span>
                        </label>
                      </div>
                    </div>

                    {/* Faculty Row Filter */}
                    <div className="space-y-2">
                      <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                        Faculty Row Filter
                      </h4>
                      <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="facultyFilter"
                            checked={!onlyFacultyWithDuties}
                            onChange={() => setOnlyFacultyWithDuties(false)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            All Active Faculty ({project.faculty.length})
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="facultyFilter"
                            checked={onlyFacultyWithDuties}
                            onChange={() => setOnlyFacultyWithDuties(true)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Only Faculty with Duties
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Examination Dates to Include */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                          Included Exam Dates ({selectedDates.length}/{activeDates.length})
                        </h4>
                        <button
                          type="button"
                          onClick={toggleSelectAllDates}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          {selectedDates.length === activeDates.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>

                      <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 max-h-48 overflow-y-auto">
                        {activeDates.map((d) => {
                          const isChecked = selectedDates.includes(d.date);
                          return (
                            <label
                              key={d.date}
                              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleDate(d.date)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {d.displayDate}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {d.dayOfWeek.slice(0, 3)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="space-y-4 animate-tab-enter">
                    {/* Page Orientation */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                        Page Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOrientation('landscape')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                            orientation === 'landscape'
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Landscape (Wide)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation('portrait')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                            orientation === 'portrait'
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Portrait (Tall)
                        </button>
                      </div>
                    </div>

                    {/* Density Scaling */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                        Typography &amp; Spacing Density
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['compact', 'standard', 'spacious'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setDensity(lvl)}
                            className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center capitalize cursor-pointer transition ${
                              density === lvl
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Compact fits more dates &amp; faculty members per page cleanly.
                      </p>
                    </div>

                    {/* Paper Margins */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                        Paper Margins
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['5mm', '8mm', '12mm'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMargins(m)}
                            className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition ${
                              margins === m
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {m === '5mm' ? 'Narrow (5mm)' : m === '8mm' ? 'Normal (8mm)' : 'Wide (12mm)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cell Display Mode */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/5">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                        Slot Details Inside Cells
                      </label>
                      <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="cellMode"
                            checked={cellDisplayMode === 'code_only'}
                            onChange={() => setCellDisplayMode('code_only')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Slot Code Only (e.g. "JRS 1")
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="cellMode"
                            checked={cellDisplayMode === 'with_timings'}
                            onChange={() => setCellDisplayMode('with_timings')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Include Session Timings
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer pt-1 border-t border-slate-100 dark:border-white/5">
                          <input
                            type="checkbox"
                            checked={showStandbyTag}
                            onChange={(e) => setShowStandbyTag(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Show "(Standby)" label for reserves
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'header' && (
                  <div className="space-y-4 animate-tab-enter">
                    {/* Institutional Header Toggles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                          Institution Header
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsLetterheadModalOpen(true)}
                          className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Edit Letterhead...
                        </button>
                      </div>
                      <div className="space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showInstHeader}
                            onChange={(e) => setShowInstHeader(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Show College / Institute Name
                          </span>
                        </label>
                        {showInstHeader && (
                          <>
                            <label className="flex items-center space-x-2 cursor-pointer ml-3">
                              <input
                                type="checkbox"
                                checked={showLogo}
                                onChange={(e) => setShowLogo(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-slate-700 dark:text-slate-300">Show Emblem / Logo</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer ml-3">
                              <input
                                type="checkbox"
                                checked={showAddress}
                                onChange={(e) => setShowAddress(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-slate-700 dark:text-slate-300">Show Campus Address</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer ml-3">
                              <input
                                type="checkbox"
                                checked={showStatsBar}
                                onChange={(e) => setShowStatsBar(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-slate-700 dark:text-slate-300">Show Summary Statistics Bar</span>
                            </label>

                            <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/5">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={repeatHeaderEveryPage}
                                  onChange={(e) => setRepeatHeaderEveryPage(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  Repeat Letterhead on Every Page
                                </span>
                              </label>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-5 mt-0.5">
                                {repeatHeaderEveryPage
                                  ? 'Crest & letterhead repeat at top of each page.'
                                  : 'Letterhead prints on Page 1 only; table continues on pages 2+.'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="space-y-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                        Document Titles
                      </label>
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="Document Title"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={documentSubtitle}
                        onChange={(e) => setDocumentSubtitle(e.target.value)}
                        placeholder="Subtitle & Period"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Notice / Instructions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                          Notice / Guidelines Box
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showNoticeBox}
                            onChange={(e) => setShowNoticeBox(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-slate-500">Show</span>
                        </label>
                      </div>
                      {showNoticeBox && (
                        <textarea
                          rows={2}
                          value={noticeText}
                          onChange={(e) => setNoticeText(e.target.value)}
                          placeholder="Important notice for invigilators..."
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>

                    {/* Sign-off / Signatures */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                          Official Signatures Footer
                        </h4>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showSignatures}
                            onChange={(e) => setShowSignatures(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-slate-500">Show</span>
                        </label>
                      </div>

                      {showSignatures && (
                        <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                          <input
                            type="text"
                            value={signaturesTitle}
                            onChange={(e) => setSignaturesTitle(e.target.value)}
                            placeholder="Sign-off title"
                            className="w-full px-2 py-1 rounded text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                          <div className="text-[10px] text-slate-500">
                            Includes {institution.signingAuthorities.length} configured official signatory blocks.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Live WYSIWYG Scaled Preview */}
            <div className="flex-1 flex flex-col bg-slate-100/60 dark:bg-slate-950/60 overflow-hidden">
              {/* Preview Bar */}
              <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white/60 dark:bg-slate-900/60 text-xs shrink-0">
                <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  Live Print Preview ({orientation.toUpperCase()}, {margins})
                </span>
                <span className="text-[11px] text-slate-400">
                  {printableFaculty.length} Faculty &bull; {printableDates.length} Dates
                </span>
              </div>

              {/* Scrollable Paper Container */}
              <div className="flex-1 overflow-auto p-4 sm:p-6" data-lenis-prevent>
                <div className="max-w-5xl mx-auto shadow-2xl transition-all duration-200">
                  {renderScheduleDocument(true)}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Action Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Tip: In the print dialog, ensure "Background graphics" is enabled for crisp borders.
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsPrintScheduleModalOpen(false)}
                className="btn-spring px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="btn-spring px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Schedule Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Printable Output - Displayed ONLY when window.print() is executed */}
        <div className="master-schedule-printable-container hidden print:block w-full">
          {renderScheduleDocument(false)}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
