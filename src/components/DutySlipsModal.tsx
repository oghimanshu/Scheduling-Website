import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileCheck2,
  Printer,
  Search,
  Download,
  Scissors,
  CheckCircle,
  FileText,
  Layers,
  Building2,
  Minus,
  Plus,
  Check,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Faculty, Assignment } from '../types';
import { setPrintOrientation, clearPrintOrientation } from '../utils/printHelper';

export const DutySlipsModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const { project, isDutySlipsModalOpen, setIsDutySlipsModalOpen, setIsLetterheadModalOpen } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultySrNo, setSelectedFacultySrNo] = useState<number | null>(null);
  const [isBatchPrintingAll, setIsBatchPrintingAll] = useState(false);
  
  // Custom cramming state: 1 to 8 slips per page
  const [slipsPerPage, setSlipsPerPage] = useState<number>(2);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [compactHeader, setCompactHeader] = useState<boolean>(false);
  const [compactSignatures, setCompactSignatures] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    if (!isDutySlipsModalOpen && !forceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDutySlipsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDutySlipsModalOpen, forceOpen, setIsDutySlipsModalOpen]);

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
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session));
  };

  const handleSetSlipsPerPage = (n: number) => {
    const clamped = Math.max(1, Math.min(8, n));
    setSlipsPerPage(clamped);
    if (clamped >= 4) {
      setCompactHeader(true);
      setCompactSignatures(true);
      setShowInstructions(false);
    } else if (clamped === 3) {
      setCompactHeader(false);
      setCompactSignatures(false);
      setShowInstructions(false);
    } else {
      setCompactHeader(false);
      setCompactSignatures(false);
      setShowInstructions(true);
    }
  };

  const triggerPrintOrPdf = (isBatch: boolean, facultyName?: string, srNo?: number) => {
    setIsBatchPrintingAll(isBatch);
    const originalTitle = document.title;

    if (!isBatch && facultyName) {
      document.title = `Duty_Slip_${facultyName.replace(/[^a-zA-Z0-9]/g, '_')}_Sr${srNo}`;
    } else {
      document.title = `${(project.projectName || 'Exam_Schedule').replace(/[^a-zA-Z0-9]/g, '_')}_Duty_Slips_${slipsPerPage}_per_page`;
    }

    setPrintOrientation('portrait', slipsPerPage >= 4 ? '5mm' : '8mm');
    document.body.classList.add('printing-duty-slips');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-duty-slips');
        clearPrintOrientation();
        document.title = originalTitle;
      }, 1000);
    }, 200);
  };

  // Chunk faculty into pages based on selected slipsPerPage
  const chunkSize = slipsPerPage;
  const chunkedPages: Faculty[][] = [];
  for (let i = 0; i < facultyWithDuties.length; i += chunkSize) {
    chunkedPages.push(facultyWithDuties.slice(i, i + chunkSize));
  }

  // Render an individual duty slip card
  const renderDutySlipCard = (
    fac: Faculty,
    duties: Assignment[],
    isSinglePreview = false
  ) => {
    const isSuperDense = slipsPerPage >= 6;
    const isDense = slipsPerPage >= 4;
    const isCompact = slipsPerPage === 3;
    const isMedium = slipsPerPage === 2;

    const inst = project.institution || {
      institutionName: 'College of Engineering & Technology',
      subHeader: 'Autonomous Institution • Affiliated to State Technological University',
      address: 'Main Campus, University Road, Academic Zone',
      officeTitle: 'Office of the Controller of Examinations',
      examTitle: project.examPeriod.name || 'End Semester Examinations',
      logoPlacement: 'left',
      signingAuthorities: [
        {
          id: 'auth-1',
          name: '',
          role: 'Chief Superintendent / Controller',
          department: 'Examination Control Division',
        },
      ],
      invigilatorAckLabel: "Invigilator's Acknowledgment",
      customInstructions:
        'Report at the Examination Control Room 15 minutes before the session. Possession of mobile devices or programmable calculators in halls is strictly prohibited.',
    };

    const authorities = inst.signingAuthorities && inst.signingAuthorities.length > 0
      ? inst.signingAuthorities
      : [
          {
            id: 'auth-1',
            name: '',
            role: 'Chief Superintendent / Controller',
            department: 'Examination Control Division',
          },
        ];

    const sigGridColsClass =
      authorities.length === 1
        ? 'grid-cols-2'
        : authorities.length === 2
        ? 'grid-cols-3'
        : authorities.length === 3
        ? 'grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-4';

    const cardPaddingClass = isSuperDense
      ? 'p-2 space-y-1 text-[8px] leading-tight'
      : isDense
      ? 'p-2.5 space-y-1.5 text-[9px] leading-snug'
      : isCompact
      ? 'p-3 space-y-2 text-[10px]'
      : isMedium
      ? 'p-5 space-y-3 text-xs'
      : 'p-7 space-y-5 text-sm';

    return (
      <div
        key={fac.srNo}
        className={`bg-white text-black ${cardPaddingClass}`}
      >
        {/* Institutional Header */}
        <div
          className={`border-b-2 border-black pb-1.5 ${
            isDense ? 'space-y-0.5' : isCompact ? 'space-y-0.5' : 'space-y-1'
          }`}
        >
          <div
            className={`flex items-center ${
              inst.logoPlacement === 'center'
                ? 'flex-col justify-center text-center'
                : inst.logoPlacement === 'left' && inst.logoUrl
                ? 'flex-row items-center justify-between text-left gap-2'
                : 'flex-col justify-center text-center'
            }`}
          >
            {inst.logoUrl && inst.logoPlacement !== 'none' && (
              <img
                src={inst.logoUrl}
                alt="Emblem"
                className={`object-contain shrink-0 ${
                  isSuperDense
                    ? 'w-7 h-7'
                    : isDense
                    ? 'w-8 h-8'
                    : isCompact
                    ? 'w-9 h-9'
                    : isMedium
                    ? 'w-11 h-11'
                    : 'w-14 h-14'
                }`}
              />
            )}
            <div className="flex-1 text-center">
              <h1
                className={`font-black uppercase tracking-wide text-black ${
                  isSuperDense
                    ? 'text-[10px]'
                    : isDense
                    ? 'text-xs'
                    : isCompact
                    ? 'text-xs'
                    : isMedium
                    ? 'text-sm'
                    : 'text-base sm:text-lg'
                }`}
              >
                {inst.institutionName || 'College of Engineering & Technology'}
              </h1>
              {!compactHeader && inst.subHeader && (
                <p className={`font-semibold text-gray-700 ${isDense ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[11px]'}`}>
                  {inst.subHeader}
                </p>
              )}
              {!compactHeader && inst.address && (
                <p className={`text-gray-600 ${isDense ? 'text-[7.5px]' : isCompact ? 'text-[8px]' : 'text-[10px]'}`}>
                  {inst.address}
                </p>
              )}
              <div className={`flex flex-wrap items-center justify-center gap-x-1.5 font-bold text-gray-900 mt-0.5 ${
                isSuperDense ? 'text-[7.5px]' : isDense ? 'text-[8.5px]' : isCompact ? 'text-[9px]' : isMedium ? 'text-xs' : 'text-sm'
              }`}>
                <span className="uppercase">{inst.officeTitle || 'Office of the Controller of Examinations'}</span>
                <span>•</span>
                <span>{inst.examTitle || project.examPeriod.name || 'End Semester Examinations'}</span>
              </div>
              <p
                className={`uppercase font-semibold text-gray-600 tracking-wider ${
                  isSuperDense ? 'text-[6.5px]' : isDense ? 'text-[7.5px]' : isCompact ? 'text-[8px]' : 'text-[9px]'
                }`}
              >
                Invigilation Duty Appointment Order &amp; Schedule
              </p>
            </div>
            {/* Balance empty spacer on right if logo is on left to keep text perfectly centered */}
            {inst.logoPlacement === 'left' && inst.logoUrl && (
              <div
                className={`shrink-0 ${
                  isSuperDense
                    ? 'w-7 h-7'
                    : isDense
                    ? 'w-8 h-8'
                    : isCompact
                    ? 'w-9 h-9'
                    : isMedium
                    ? 'w-11 h-11'
                    : 'w-14 h-14'
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Faculty Metadata Grid */}
        <div
          className={`grid grid-cols-4 gap-1.5 bg-gray-50 border border-gray-300 rounded ${
            isSuperDense
              ? 'p-1 text-[7.5px]'
              : isDense
              ? 'p-1.5 text-[8.5px]'
              : isCompact
              ? 'p-1.5 text-[10px]'
              : 'p-2.5 text-xs'
          }`}
        >
          <div>
            <span className="text-[7.5px] uppercase font-bold text-gray-500 block leading-tight">
              Faculty Member
            </span>
            <strong className="text-black font-bold truncate block">{fac.name}</strong>
          </div>
          <div>
            <span className="text-[7.5px] uppercase font-bold text-gray-500 block leading-tight">
              Sr. No.
            </span>
            <span className="font-mono font-bold text-black">#{fac.srNo}</span>
          </div>
          <div>
            <span className="text-[7.5px] uppercase font-bold text-gray-500 block leading-tight">
              Role
            </span>
            <span className="font-medium text-black truncate block">
              {fac.role || (fac.isHod ? 'HOD' : 'Regular')}
            </span>
          </div>
          <div>
            <span className="text-[7.5px] uppercase font-bold text-gray-500 block leading-tight">
              Total Duties
            </span>
            <span className="font-mono font-bold text-emerald-800">
              {duties.length}
            </span>
          </div>
        </div>

        {/* Duties Table */}
        <table className={`w-full text-left border border-black ${
          isSuperDense ? 'text-[7.5px]' : isDense ? 'text-[8.5px]' : isCompact ? 'text-[10px]' : 'text-xs'
        }`}>
          <thead className="bg-gray-100 font-bold border-b border-black">
            <tr>
              <th className={`${isDense ? 'py-0.5 px-1 w-6' : 'py-1 px-2 w-8'} border-r border-black`}>#</th>
              <th className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} border-r border-black`}>Date</th>
              {!isDense && <th className="py-1 px-2 border-r border-black">Day</th>}
              <th className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} border-r border-black`}>Session</th>
              <th className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} border-r border-black`}>Exam Timings</th>
              <th className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'}`}>Reporting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {duties.map((duty, idx) => {
              const dateCfg = project.examPeriod.dates.find((d) => d.date === duty.date);
              const timing = dateCfg?.sessionTimings?.[duty.session];
              const timingStr = timing ? `${timing.start} - ${timing.end}` : 'Standard';

              return (
                <tr key={duty.id}>
                  <td className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} font-mono border-r border-gray-300`}>{idx + 1}</td>
                  <td className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} font-semibold border-r border-gray-300`}>
                    {dateCfg?.displayDate || duty.date}
                  </td>
                  {!isDense && <td className="py-1 px-2 border-r border-gray-300">{dateCfg?.dayOfWeek}</td>}
                  <td className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} font-bold border-r border-gray-300 text-emerald-800`}>
                    {duty.session}
                    {duty.isReserve && (
                      <span className="ml-1 text-[8px] font-semibold text-amber-700">
                        (Reserve)
                      </span>
                    )}
                  </td>
                  <td className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} font-mono border-r border-gray-300`}>{timingStr}</td>
                  <td className={`${isDense ? 'py-0.5 px-1' : 'py-1 px-2'} font-mono text-gray-700`}>
                    {timing ? `${timing.start} (-15m)` : '15m prior'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Instructions */}
        {showInstructions && inst.customInstructions && (
          <div className={`p-1.5 bg-gray-50 rounded border border-gray-300 text-gray-700 space-y-0.5 whitespace-pre-line ${
            isDense ? 'text-[7.5px] leading-tight' : 'text-[10px]'
          }`}>
            <strong>Important Instructions:</strong> {inst.customInstructions}
          </div>
        )}

        {/* Dynamic Multi-Authority Signature Blocks */}
        {compactSignatures || isDense ? (
          <div className={`border-t border-black flex justify-between items-end ${
            isSuperDense ? 'pt-1 mt-1 text-[7.5px]' : 'pt-1.5 mt-1.5 text-[8.5px]'
          }`}>
            <div>
              <div className="font-semibold text-black">{inst.invigilatorAckLabel || "Invigilator's Sign"}</div>
              <div className="text-[7px] text-gray-500">Date: ____________</div>
            </div>
            <div className="flex gap-4 text-right">
              {authorities.map((auth) => (
                <div key={auth.id}>
                  {auth.name && <div className="font-bold text-gray-900">{auth.name}</div>}
                  <div className="font-semibold text-gray-800">{auth.role || 'Controller'}</div>
                  <div className="text-[7px] text-gray-400">Seal &amp; Signature</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${sigGridColsClass} ${
              isCompact ? 'pt-2.5' : isMedium ? 'pt-4' : 'pt-7'
            }`}
          >
            {/* Invigilator's Acknowledgment */}
            <div className="text-center space-y-0.5">
              <div className="border-t border-black pt-1 font-semibold text-[11px] text-black">
                {inst.invigilatorAckLabel || "Invigilator's Acknowledgment"}
              </div>
              <div className="text-[9px] text-gray-500">Date: _______________</div>
            </div>

            {/* Dynamic Signing Authorities */}
            {authorities.map((auth) => (
              <div key={auth.id} className="text-center space-y-0.5">
                <div className="border-t border-black pt-1 font-semibold text-[11px] text-black">
                  {auth.name && <span className="block font-bold text-gray-900">{auth.name}</span>}
                  <span>{auth.role || 'Controller'}</span>
                </div>
                {auth.department && (
                  <div className="text-[9px] text-gray-600 font-medium">{auth.department}</div>
                )}
                <div className="text-[8px] text-gray-400">Official Seal &amp; Signature</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <div
      className="duty-slips-modal-backdrop fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={() => setIsDutySlipsModalOpen(false)}
      data-lenis-prevent
    >
      <div
        className="duty-slips-modal-card apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-5xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden sm:my-auto animate-sheet-up sm:animate-modal-spring pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Screen UI (Hidden during all print & PDF outputs) */}
        <div className="duty-slips-modal-ui flex flex-col flex-1 overflow-hidden no-print">
          {/* Mobile Pull Handle */}
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0 no-print" />

          {/* Header & Controls Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col gap-3 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Faculty Duty Slips &amp; Appointment Orders
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official invigilation orders with session timings, reporting schedules, and Save Paper options.
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Customize Letterhead & Signatures Button */}
                <button
                  type="button"
                  onClick={() => setIsLetterheadModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                  title="Configure college name, emblem logo, and multiple controller signatures"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>Letterhead &amp; Signatures</span>
                </button>

                {/* Print / Save PDF All */}
                <button
                  type="button"
                  onClick={() => triggerPrintOrPdf(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                  title="Print all slips or save as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print / PDF All ({facultyWithDuties.length})</span>
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

            {/* Second toolbar row: Cramming controls & Overrides */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
              {/* Layout Presets & Stepper */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Slips / Page:</span>
                </span>

                {/* Preset Chips */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-white/10">
                  {[
                    { count: 1, label: '1' },
                    { count: 2, label: 'Save Paper (2 / Page)' },
                    { count: 3, label: '3' },
                    { count: 4, label: '4 (2×2)' },
                    { count: 6, label: '6 (2×3)' },
                    { count: 8, label: '8 (2×4)' },
                  ].map((preset) => (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => handleSetSlipsPerPage(preset.count)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        slipsPerPage === preset.count
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={`${preset.count} slips per page`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Stepper */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSetSlipsPerPage(slipsPerPage - 1)}
                    disabled={slipsPerPage <= 1}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Decrease slips per page"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {slipsPerPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSetSlipsPerPage(slipsPerPage + 1)}
                    disabled={slipsPerPage >= 8}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Increase slips per page"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content Overrides Toggles */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center space-x-1.5 ${
                    showInstructions
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Toggle exam instructions block on duty slips"
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    showInstructions ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'
                  }`}>
                    {showInstructions && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>Instructions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompactHeader(!compactHeader)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center space-x-1.5 ${
                    compactHeader
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Compact header for dense layouts"
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    compactHeader ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'
                  }`}>
                    {compactHeader && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>Minimal Header</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompactSignatures(!compactSignatures)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center space-x-1.5 ${
                    compactSignatures
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Compact single-row signature line"
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    compactSignatures ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'
                  }`}>
                    {compactSignatures && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>Compact Signatures</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Layout - Two Columns */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Sidebar: Faculty Roster Selection */}
            <div className="w-full md:w-72 border-r border-slate-200/80 dark:border-white/10 p-4 space-y-3 overflow-y-auto max-h-[300px] md:max-h-none" data-lenis-prevent>
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
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4" data-lenis-prevent>
              {activeFaculty ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center no-print">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Previewing Official Slip ({slipsPerPage} / Page &bull; {slipsPerPage >= 4 ? '2-Column Grid' : 'Vertical Stack'})
                      </span>
                      {slipsPerPage >= 4 && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          ✂ Cutting Borders Included
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerPrintOrPdf(false, activeFaculty.name, activeFaculty.srNo)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                      title={`Print or Save PDF for ${activeFaculty.name}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF / Print This Slip</span>
                    </button>
                  </div>

                  {/* Single Slip Paper Card */}
                  <div className="border border-slate-300 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
                    {renderDutySlipCard(
                      activeFaculty,
                      getFacultyDuties(activeFaculty.srNo),
                      true
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  No faculty with assigned duties found. Please generate the schedule first.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Printable Section: Single Faculty Duty Slip */}
        {!isBatchPrintingAll && activeFaculty && (
          <div className="duty-slips-printable-container hidden print:block w-full bg-white text-black p-0">
            {renderDutySlipCard(
              activeFaculty,
              getFacultyDuties(activeFaculty.srNo),
              false
            )}
          </div>
        )}

        {/* Printable Section: Batch All Faculty Duty Slips */}
        {isBatchPrintingAll && (
          <div className="duty-slips-printable-container hidden print:block w-full bg-white text-black p-0">
            {chunkedPages.map((pageGroup, pageIdx) => {
              const isGrid = slipsPerPage >= 4;

              return (
                <div
                  key={`page-${pageIdx}`}
                  className="w-full bg-white text-black"
                  style={{
                    pageBreakAfter: pageIdx < chunkedPages.length - 1 ? 'always' : 'auto',
                    breakAfter: pageIdx < chunkedPages.length - 1 ? 'page' : 'auto',
                  }}
                >
                  {isGrid ? (
                    <div className="grid grid-cols-2 gap-2 p-1.5">
                      {pageGroup.map((fac) => {
                        const duties = getFacultyDuties(fac.srNo);
                        return (
                          <div
                            key={fac.srNo}
                            className="border-2 border-dashed border-gray-400 rounded-lg p-1 relative flex flex-col justify-between"
                          >
                            <div className="absolute top-1 right-2 text-[7.5px] font-mono text-gray-400 print:block">
                              ✂ Cut along border
                            </div>
                            {renderDutySlipCard(fac, duties, false)}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    pageGroup.map((fac, idxInPage) => {
                      const duties = getFacultyDuties(fac.srNo);
                      const isLastInGroup = idxInPage === pageGroup.length - 1;

                      return (
                        <React.Fragment key={fac.srNo}>
                          {renderDutySlipCard(fac, duties, false)}

                          {/* Cutting Guide Perforation between slips on same page */}
                          {!isLastInGroup && (
                            <div className="my-2 border-t-2 border-dashed border-gray-400 relative text-center print:block">
                              <span className="bg-white px-3 text-[9px] text-gray-500 font-mono uppercase tracking-wider relative -top-2.5">
                                ✂ Cut Here to Separate Duty Slips
                              </span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
