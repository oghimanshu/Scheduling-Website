import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Upload,
  Download,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  Check,
  Building,
  RotateCcw,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { parseFacultyCSV, downloadFacultyTemplateCSV } from '../services/csvParser';
import { parseRoomsCSV, downloadRoomsTemplateCSV } from '../services/roomParser';
import { MOCK_FACULTY_LIST } from '../test/fixtures/mockFaculty';
import { DEFAULT_ROOMS_CONFIG } from '../data/defaultData';
import { ExamDateConfig, SessionType, ExamRoom } from '../types';
import { FileDropZone } from './FileDropZone';

export const QuickstartWizardModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isQuickstartModalOpen,
    setIsQuickstartModalOpen,
    updateFacultyList,
    updateExamDates,
    updateExamPeriodInfo,
    updateRoomsList,
    toggleRoomActive,
    updateHodAssignmentPriority,
    generateAlternatives,
  } = useScheduler();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Step 2 state
  const [examName, setExamName] = useState(project.examPeriod.name || 'End Semester Examinations 2026');
  const [startDate, setStartDate] = useState(
    project.examPeriod.startDate || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    project.examPeriod.endDate ||
      new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dailySessionCount, setDailySessionCount] = useState<1 | 2 | 3>(
    (project.sessions && project.sessions.length <= 2
      ? (project.sessions.length as 1 | 2)
      : 3) as 1 | 2 | 3
  );
  const [supervisorsPerSession, setSupervisorsPerSession] = useState<number>(15);

  // Step 3 (Rooms) state
  const [roomUploadError, setRoomUploadError] = useState<string | null>(null);
  const [roomUploadSuccess, setRoomUploadSuccess] = useState<string | null>(null);

  // Step 4 state
  const [selectedPriority, setSelectedPriority] = useState(
    project.settings.hodAssignmentPriority || 'regular_first_hod_last'
  );

  if (!forceOpen && !isQuickstartModalOpen) return null;

  // Handle CSV file upload for faculty
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = parseFacultyCSV(text, { mode: 'zero' });
      if (res.success && res.faculty.length > 0) {
        updateFacultyList(res.faculty);
        setUploadSuccess(`Successfully loaded ${res.faculty.length} faculty members!`);
      } else {
        setUploadError(res.errors[0] || 'Failed to parse faculty CSV. Please verify column headers.');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  // Load sample demo faculty
  const handleLoadDemoFaculty = () => {
    updateFacultyList(MOCK_FACULTY_LIST.slice(0, 25));
    setUploadSuccess(`Loaded sample academic roster with 25 faculty members!`);
    setUploadError(null);
  };

  // Generate date list between start and end
  const generateDates = (startStr: string, endStr: string, sessionCount: 1 | 2 | 3, quota: number) => {
    const dates: ExamDateConfig[] = [];
    const curr = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(curr.getTime()) || isNaN(end.getTime()) || curr > end) {
      return dates;
    }

    const sessions = project.sessions && project.sessions.length > 0
      ? project.sessions
      : [
          { id: 'JRS 1', name: 'JRS 1 (Morning)' },
          { id: 'JRS 2', name: 'JRS 2 (Mid-day)' },
          { id: 'JRS 3', name: 'JRS 3 (Afternoon)' },
        ];

    while (curr <= end) {
      const dateIso = curr.toISOString().split('T')[0];
      const isSunday = curr.getDay() === 0;

      const sessionRequirements: Record<SessionType, number> = {};
      const sessionTimings: Record<SessionType, any> = {};
      sessions.forEach((s, idx) => {
        sessionTimings[s.id] = (s as any).defaultTiming || { start: '08:00', end: '10:00' };
        if (idx < sessionCount) {
          sessionRequirements[s.id] = isSunday ? 0 : quota;
        } else {
          sessionRequirements[s.id] = 0;
        }
      });

      dates.push({
        date: dateIso,
        displayDate: curr.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        dayOfWeek: curr.toLocaleDateString('en-US', { weekday: 'long' }),
        isExcluded: isSunday,
        sessionRequirements,
        sessionTimings,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return dates;
  };

  // Save Step 2 dates and apply sessions
  const handleProceedToStep3 = () => {
    const dates = generateDates(startDate, endDate, dailySessionCount, supervisorsPerSession);
    if (dates.length === 0) {
      alert('Please select valid start and end dates.');
      return;
    }

    updateExamPeriodInfo(examName, startDate, endDate);
    updateExamDates(dates);
    setStep(3);
  };

  // Step 4 final submit
  const handleFinalGenerate = () => {
    updateHodAssignmentPriority(selectedPriority);
    setIsQuickstartModalOpen(false);
    setTimeout(() => {
      generateAlternatives();
    }, 100);
  };

  // Stats calculation
  const totalFaculty = project.faculty.length;
  const regularCount = project.faculty.filter((f) => !f.isHod).length;
  const hodCount = project.faculty.filter((f) => f.isHod).length;
  const totalCapacity = project.faculty.reduce((sum, f) => sum + (f.maxSupervisions || 6), 0);

  const previewDates = generateDates(startDate, endDate, dailySessionCount, supervisorsPerSession);
  const activeDaysCount = previewDates.filter((d) => !d.isExcluded).length;
  const totalRequiredDuties = activeDaysCount * dailySessionCount * supervisorsPerSession;
  const isFeasible = totalCapacity >= totalRequiredDuties;

  // Rooms stats
  const rooms = project.rooms && project.rooms.length > 0 ? project.rooms : DEFAULT_ROOMS_CONFIG;
  const activeRooms = rooms.filter((r) => r.isActive !== false);
  const totalSeatingCapacity = activeRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const totalRoomInvigilators = activeRooms.reduce((sum, r) => sum + (r.invigilatorsRequired || 1), 0);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      data-lenis-prevent
      onClick={() => setIsQuickstartModalOpen(false)}
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-white/10 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Let's Begin - Intuitive Quickstart</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/40">
                  Step {step} of 4
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guiding you from raw faculty list to optimal exam schedule in 4 simple steps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsQuickstartModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
              step === 1
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs font-bold'
                : totalFaculty > 0
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-400'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Step 1</span>
            <span className="text-xs flex items-center space-x-1 truncate">
              {totalFaculty > 0 && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              <span className="truncate">Faculty List</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => totalFaculty > 0 && setStep(2)}
            disabled={totalFaculty === 0}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              step === 2
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs font-bold'
                : step > 2
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-400'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Step 2</span>
            <span className="text-xs flex items-center space-x-1 truncate">
              <span className="truncate">Dates &amp; Sessions</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => totalFaculty > 0 && setStep(3)}
            disabled={totalFaculty === 0}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              step === 3
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs font-bold'
                : step > 3
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-400'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Step 3</span>
            <span className="text-xs flex items-center space-x-1 truncate">
              <span className="truncate">Halls &amp; Rooms</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => totalFaculty > 0 && setStep(4)}
            disabled={totalFaculty === 0}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              step === 4
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs font-bold'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-400'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Step 4</span>
            <span className="text-xs flex items-center space-x-1 truncate">
              <span className="truncate">Generate</span>
            </span>
          </button>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* STEP 1: FACULTY UPLOAD */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-white/10 flex items-start space-x-3">
                <Users className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Who will be supervising the examinations?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Upload your faculty roster CSV or download our example template format. You can also load our demo list for instant testing.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <FileDropZone
                onFileLoaded={(text, file) => {
                  setUploadError(null);
                  setUploadSuccess(null);
                  const res = parseFacultyCSV(text, { mode: 'zero' });
                  if (res.success && res.faculty.length > 0) {
                    updateFacultyList(res.faculty);
                    setUploadSuccess(`Successfully loaded ${res.faculty.length} faculty members from "${file.name}"!`);
                  } else {
                    setUploadError(res.errors[0] || 'Failed to parse faculty CSV. Please verify column headers.');
                  }
                }}
                accept=".csv"
                title="Drop Faculty CSV Here"
                description="or click to browse from your device"
                supportedFormatsText="Requires columns: Sr. No., Faculty Name, HOD (Yes/No), Arrival (Morning/Mid/Afternoon)"
              />

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadFacultyTemplateCSV(false)}
                  className="px-3 py-2 rounded-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800/50 font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoFaculty}
                  className="px-3.5 py-2 rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/50 font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Load Demo Faculty (25 Members)</span>
                </button>
              </div>

              {/* Upload Feedback */}
              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{uploadSuccess}</span>
                </div>
              )}
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Loaded Faculty Summary Card */}
              {totalFaculty > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>Faculty Roster Ready</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {totalFaculty} Members Loaded
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-100 dark:border-white/5">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block">Regular</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-xs">{regularCount}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block">HODs (Concession)</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-xs">{hodCount}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block">Total Capacity</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">{totalCapacity} duties</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DATES & SESSIONS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-white/10 flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Configure Examination Period &amp; Daily Sessions
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Set your examination title, dates, and how many examination sessions take place each day.
                  </p>
                </div>
              </div>

              {/* Examination Title */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Examination Name / Title
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. End Semester Examinations 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                  />
                </div>
              </div>

              {/* Daily Sessions Selector (1, 2, or 3) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white block">
                    Daily Examination Sessions (JRS)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    How many sessions take place per day?
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDailySessionCount(1)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      dailySessionCount === 1
                        ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-900 dark:text-white font-bold ring-2 ring-sky-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black block">1 Session</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">JRS 1 Only (Single shift)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDailySessionCount(2)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      dailySessionCount === 2
                        ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-900 dark:text-white font-bold ring-2 ring-sky-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black block">2 Sessions</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">JRS 1 &amp; JRS 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDailySessionCount(3)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      dailySessionCount === 3
                        ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-900 dark:text-white font-bold ring-2 ring-sky-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black block">3 Sessions</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">JRS 1, 2 &amp; 3 (Standard)</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    Supervisors needed per session:
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={supervisorsPerSession}
                      onChange={(e) => setSupervisorsPerSession(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-center"
                    />
                    <span className="text-slate-400 text-[11px]">faculty / slot</span>
                  </div>
                </div>
              </div>

              {/* Feasibility Indicator */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isFeasible
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isFeasible ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {isFeasible ? 'Schedule Feasible & Schedulable' : 'Potential Capacity Shortage'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {activeDaysCount} active dates &times; {dailySessionCount} sessions &times; {supervisorsPerSession} ={' '}
                      <strong>{totalRequiredDuties} required duties</strong> vs {totalCapacity} available capacity.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ROOMS & EXAMINATION HALLS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 flex items-start space-x-3">
                <Building className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Configure Examination Halls &amp; Seating Rooms
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Set up your exam halls, seating capacities, and invigilator requirements. You can upload custom halls, download a sample CSV, or proceed with standard default halls.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone for Rooms */}
              <FileDropZone
                onFileLoaded={(text, file) => {
                  setRoomUploadError(null);
                  setRoomUploadSuccess(null);
                  const res = parseRoomsCSV(text);
                  if (res.success && res.rooms.length > 0) {
                    updateRoomsList(res.rooms);
                    setRoomUploadSuccess(`Successfully loaded ${res.rooms.length} examination halls from "${file.name}"!`);
                  } else {
                    setRoomUploadError(res.errors[0] || 'Failed to parse rooms CSV. Please check formatting.');
                  }
                }}
                accept=".csv"
                title="Drop Examination Halls CSV Here"
                description="or click to browse from your device"
                supportedFormatsText="Columns: Room Number / Name, Building / Block, Floor, Seating Capacity, Invigilators Required, Active"
              />

              {/* Quick Actions for Rooms */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={downloadRoomsTemplateCSV}
                  className="px-3 py-2 rounded-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800/50 font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Rooms CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateRoomsList(DEFAULT_ROOMS_CONFIG);
                    setRoomUploadSuccess(`Reset to standard default 15 examination halls!`);
                    setRoomUploadError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-300 dark:border-teal-800/50 font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Use Standard Default Halls ({DEFAULT_ROOMS_CONFIG.length})</span>
                </button>
              </div>

              {/* Room Upload Feedback */}
              {roomUploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{roomUploadSuccess}</span>
                </div>
              )}
              {roomUploadError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{roomUploadError}</span>
                </div>
              )}

              {/* Loaded Rooms Summary Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-xs space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Examination Halls Configuration</span>
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-mono text-sm">
                    {activeRooms.length} of {rooms.length} Halls Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-100 dark:border-white/5">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-500 dark:text-slate-400 block">Total Halls</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">{rooms.length}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-500 dark:text-slate-400 block">Active Capacity</span>
                    <strong className="text-teal-600 dark:text-teal-400 font-mono text-xs">{totalSeatingCapacity} seats</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-slate-500 dark:text-slate-400 block">Invigilator Quota</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">{totalRoomInvigilators} / session</strong>
                  </div>
                </div>

                {/* Quick Hall Badges Preview */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rooms.slice(0, 8).map((r) => (
                    <span
                      key={r.id}
                      onClick={() => toggleRoomActive(r.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition border ${
                        r.isActive !== false
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/10 line-through'
                      }`}
                      title="Click to toggle active status"
                    >
                      {r.name} ({r.capacity} seats)
                    </span>
                  ))}
                  {rooms.length > 8 && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                      +{rooms.length - 8} more halls
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & GENERATE */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/40 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Everything is Set! Generate Your Optimal Schedule
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    The constraint scheduler will mathematically solve duty allocation guaranteeing rest rules, arrival alignment, workload equity, and designated hall assignments.
                  </p>
                </div>
              </div>

              {/* Review Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Faculty Members</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{totalFaculty}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Active Exam Days</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{activeDaysCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Active Halls</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{activeRooms.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Duties</span>
                  <span className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">{totalRequiredDuties}</span>
                </div>
              </div>

              {/* Duty Allocation Priority Selector */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 space-y-2">
                <label className="font-bold text-slate-900 dark:text-white block">
                  Faculty vs HOD Duty Allocation Priority
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={selectedPriority === 'regular_first_hod_last'}
                      onChange={() => setSelectedPriority('regular_first_hod_last')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Regular First, HODs Last (Concession / Academic Standard)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Regular faculty receive duties first up to target. HODs receive lighter duties only when needed.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={selectedPriority === 'proportional_equal'}
                      onChange={() => setSelectedPriority('proportional_equal')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Proportional &amp; Equal Allocation
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Duties are balanced strictly evenly across all faculty.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Big Generate Button */}
              <button
                type="button"
                onClick={handleFinalGenerate}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-black text-sm shadow-xl hover:shadow-2xl transition active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>GENERATE 5 SCHEDULE ALTERNATIVES NOW</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 shrink-0 text-xs">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold inline-flex items-center space-x-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsQuickstartModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={totalFaculty === 0}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold inline-flex items-center space-x-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <span>Next: Exam Dates</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold inline-flex items-center space-x-2 transition cursor-pointer shadow-md"
              >
                <span>Next: Examination Halls</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold inline-flex items-center space-x-2 transition cursor-pointer shadow-md"
              >
                <span>Next: Review &amp; Generate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
