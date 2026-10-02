import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Download,
  Lock,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Sliders,
  HelpCircle,
  Check,
  Award,
  AlertTriangle,
  ArrowRight,
  Info,
  Printer,
  ArrowRightLeft,
  FolderSync,
  Building,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { generateSampleFacultyCSV } from '../services/csvParser';

export const InstructionsView: React.FC = () => {
  const {
    setActiveTab,
    setIsQuickstartModalOpen,
    setIsLetterheadModalOpen,
    setIsPrintScheduleModalOpen,
    setIsDutySlipsModalOpen,
    setIsExportModalOpen,
    setIsWhyValidModalOpen,
  } = useScheduler();

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleDownloadSample = (withSupervision = false) => {
    const sample = generateSampleFacultyCSV(withSupervision);
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = withSupervision ? 'faculty_sample_with_supervision.csv' : 'faculty_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="apple-specular-rim" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-xs font-semibold text-sky-200 backdrop-blur-md mb-3">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Complete Administration &amp; Scheduling Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            How to Use the Examination Supervision Scheduler
          </h1>
          <p className="text-sm text-sky-200/90 mt-2 leading-relaxed">
            Welcome to the official documentation. This system uses rigorous mathematical constraint optimization (MILP / Simplex)
            to generate fair, balanced, and conflict-free college examination invigilation schedules. Read below for detailed workflows,
            policy constraints, printing, and automated cloud sync options.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsQuickstartModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-900 bg-white hover:bg-sky-50 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Launch Quickstart Wizard</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadSample(false)}
              className="btn-spring inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-sky-200 bg-sky-800/60 hover:bg-sky-700/80 border border-sky-400/30 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-300" />
              <span>Download CSV Template</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWhyValidModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-emerald-200 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-400/30 shadow-xs transition cursor-pointer"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verify Mathematical Rules</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Step "Let's Begin" Quickstart Flow */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Zero-Knowledge Quickstart: 3-Step Guided Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recommended for beginners: set up your entire schedule in under 60 seconds
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickstartModalOpen(true)}
            className="btn-spring inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sm cursor-pointer"
          >
            <span>Open Quickstart Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Quick Step 1 */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Step 1
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Import Faculty Roster (.CSV)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Upload your college faculty spreadsheet with mandatory headers: <strong>Sr. No.</strong>,{' '}
                <strong>Faculty Name</strong>, <strong>HOD</strong> (Yes/No), and <strong>Arrival</strong> (Morning, Mid, or Afternoon).
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Instant format verification &amp; preview</span>
              </span>
            </div>
          </div>

          {/* Quick Step 2 */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Step 2
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Configure Exam Dates &amp; Daily Sessions
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Choose start and end dates. Select <strong>1, 2, or 3 sessions per day</strong>. The wizard automatically detects
                dates, excludes Sundays, and allows disabling specific sessions (e.g. only JRS 1 on lighter exam days).
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Single-session day support built-in</span>
              </span>
            </div>
          </div>

          {/* Quick Step 3 */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                  3
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Step 3
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1-Click Optimal Schedule Generation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Click <strong>Generate Schedule</strong>. The mathematical engine solves the constraint matrix, balances workloads
                equitably, ensures arrival compatibility, and populates the master schedule view immediately.
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Zero manual spreadsheet juggling</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format Specifications & Sample Download */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Faculty CSV Format Specification</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Exact column headers and data types required for upload</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownloadSample(false)}
              className="btn-spring inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800/60 rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Standard Template (.CSV)</span>
            </button>
            <button
              onClick={() => handleDownloadSample(true)}
              className="btn-spring inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-white/10 rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>With Previous Duties (.CSV)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Column Name</th>
                <th className="py-2.5 px-3">Required?</th>
                <th className="py-2.5 px-3">Accepted Values</th>
                <th className="py-2.5 px-3 rounded-r-lg">Description &amp; Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Sr. No.</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3 font-mono">1, 2, 3, ... (Unique Integers)</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Unique identifier for each faculty member. Used for duty locking and tracking.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Faculty Name</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3">Any text string</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Full name and honorific (e.g. Dr. Jane Smith, Prof. Alan Turing).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">HOD</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3 font-mono">Yes, No, TRUE, FALSE, 1, 0</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Specifies Department Leadership. HODs are assigned last under concession policy.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Arrival</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3 font-mono font-bold">Morning, Mid, Afternoon</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Physical attendance window. Governs eligibility for JRS 1, JRS 2, or JRS 3.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Previous Duties</td>
                <td className="py-2.5 px-3 text-slate-400">Optional</td>
                <td className="py-2.5 px-3 font-mono">0, 1, 2, ...</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Carried forward duties from prior examination phases or semesters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Handling Single-Session Days & Removing JRS Sessions */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-sky-300/40 dark:border-sky-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Single-Session Days &amp; Customizing JRS Sessions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How to configure exam days with only 1 session or remove unnecessary sessions
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Not all exam days have 3 sessions. Often, some dates only have morning exams (JRS 1) or afternoon exams (JRS 2).
          The scheduler gives you full flexibility:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">1-Click Toggle in Period Manager:</span>
            <p className="text-slate-600 dark:text-slate-400">
              In the <strong>Examination Period</strong> tab, click the <strong>+ / ×</strong> button next to any session on any date.
              Turning a session off sets its required supervisors to 0 and marks it as <code>Off (0)</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Date Session Customizer Modal:</span>
            <p className="text-slate-600 dark:text-slate-400">
              Click the gear icon next to any date to open the customizer. Toggle the switch between <strong>Active on this date</strong> and{' '}
              <strong>Disabled for this date</strong>, or set custom supervisor requirements and eligible arrivals.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Global Session Manager:</span>
            <p className="text-slate-600 dark:text-slate-400">
              Need only 1 or 2 sessions across the entire examination? Open <strong>Manage Global Sessions</strong> in Period Manager
              to permanently delete a session definition (e.g. remove JRS 3 completely).
            </p>
          </div>
        </div>
      </div>

      {/* Core Scheduling Rules & Policy Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Faculty First / HOD Last */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Faculty-First / HOD Concession Allocation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Workload hierarchy policy</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The scheduler strictly enforces that <strong>Regular Faculties are prioritized for all available slots first</strong>.
            Their workload caps (e.g. 6 duties) are fully met before any Head of Department (HOD) is assigned.
          </p>
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Guarantee:</strong> An HOD will never receive a duty slot if there remains an eligible, available Regular Faculty
            member with remaining capacity. You can switch to HOD-first or proportional balance in settings anytime.
          </div>
        </div>

        {/* Rule 2: Arrival Compatibility */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Arrival Time Compatibility</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Physical attendance constraints</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-sky-700 dark:text-sky-300">Morning Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 1 &amp; JRS 2</strong></span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-purple-700 dark:text-purple-300">Mid Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 1, JRS 2, &amp; JRS 3</strong> (All Sessions)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-amber-700 dark:text-amber-300">Afternoon Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 2 &amp; JRS 3</strong></span>
            </div>
          </div>
        </div>

        {/* Rule 3: Daily Limits & Rest */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Limits &amp; Fatigue Prevention</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Strict health &amp; safety rules</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
            <li><strong>Maximum 2 duties per day:</strong> No faculty member can be assigned 3 sessions on a single day.</li>
            <li><strong>Forbidden Split Combination:</strong> JRS 1 + JRS 3 without JRS 2 is strictly forbidden (to prevent long idle waiting gaps between 8:00 AM and 4:00 PM).</li>
            <li><strong>Consecutive duty rest:</strong> Back-to-back duties are avoided whenever possible to give supervisors recovery time.</li>
          </ul>
        </div>

        {/* Rule 4: Atomic Duty Swaps & Pinning */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Duty Swaps &amp; Pinning</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Interactive roster adjustments</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Need to change an assigned invigilator? Drag and drop duties between faculty members in Schedule Views, or right click
            to open the <strong>Find Substitute &amp; Swap</strong> modal. It ranks all candidates by eligibility and workload.
          </p>
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200">
            <strong>Locking:</strong> Click any cell's padlock icon to pin it. Pinned assignments are strictly preserved and never
            overwritten during schedule rebalancing or alternative generation.
          </div>
        </div>
      </div>

      {/* Institutional Letterhead & Signatures Customizer Guide */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Institutional Letterhead &amp; Multi-Signatory Authorities
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official institutional branding on master schedules and duty slips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLetterheadModalOpen(true)}
            className="btn-spring inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 hover:bg-sky-200 dark:hover:bg-sky-900/80 border border-sky-300 dark:border-sky-800/60 rounded-xl transition cursor-pointer"
          >
            <Building className="w-4 h-4" />
            <span>Customize Letterhead</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">Institution Header &amp; Sub-header:</span>
            <p className="text-slate-600 dark:text-slate-400">
              Customize your College Name, Accreditation (e.g. Autonomous, Grade A++), Campus Address, and Exam Session Name.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">Multiple Signing Authorities:</span>
            <p className="text-slate-600 dark:text-slate-400">
              Add multiple signature blocks (e.g. Chief Superintendent, Controller of Examinations, Center In-charge) with customizable designations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">Invigilator Acknowledgment Slip:</span>
            <p className="text-slate-600 dark:text-slate-400">
              Configurable custom exam instructions and signature acknowledgment label printed directly on faculty duty slips.
            </p>
          </div>
        </div>
      </div>

      {/* Printing & Paper Saver Customizer Guide */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Master Schedule &amp; Duty Slips Print Customizer (Paper Saver)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pixel-perfect print layouts, column visibility toggles, and paper-saving cram controls
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPrintScheduleModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-2 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 border border-amber-300 dark:border-amber-800/60 rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Master Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDutySlipsModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-white/10 rounded-xl transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Print Duty Slips</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Master Schedule Print Customizer:</span>
            </h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li>Toggle individual columns: Sr No, Department, Total Duties, HOD status.</li>
              <li>Toggle Institutional Letterhead and Signature Authority blocks on/off.</li>
              <li>Adjust print typography size: Compact (dense data), Standard, or Relaxed.</li>
              <li>Auto-lock landscape orientation for wide tables to prevent cut-off columns.</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Duty Slips Cramming (Paper Saver):</span>
            </h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li>Choose <strong>1, 2, 3, 4, 5, or 6 duty slips per A4 page</strong> to conserve paper.</li>
              <li>Includes scissor dashed cutting guides between slips for easy distribution.</li>
              <li>Each slip includes official letterhead, exam dates, assigned sessions, and acknowledgment signatures.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 1-Click Zero-Setup Google Drive & Folder Sync */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-emerald-300/40 dark:border-emerald-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FolderSync className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Zero-Setup Google Drive Desktop &amp; Folder Auto-Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instant 1-click folder sync with no API keys or Google Cloud Console setup required
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Google OAuth 2.0 requires registering client IDs, origins, and verification screens. To bypass all complexity,
          our scheduler includes a native <strong>1-Click Folder Sync</strong> using the modern File System Access API.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Step 1: Install Google Drive Desktop</span>
            <p className="text-slate-600 dark:text-slate-400">
              Ensure Google Drive for Desktop (or OneDrive / Dropbox) is installed on your computer. It creates a local synced folder.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Step 2: Click "Sync to Folder"</span>
            <p className="text-slate-600 dark:text-slate-400">
              Click the Cloud / Drive button in the top navigation bar, then click <strong>Sync to Local / Drive Folder</strong>.
              Select any folder in your Google Drive (e.g. <code>Google Drive/Exam Schedules/</code>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Step 3: Automatic Continuous Sync</span>
            <p className="text-slate-600 dark:text-slate-400">
              Every schedule change automatically writes to <code>exam-scheduler-state.json</code> inside that folder, and Google Drive
              instantly syncs it to the cloud. Zero setup, zero keys!
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Frequently Asked Questions (FAQ)
        </h2>

        <div className="space-y-3">
          {[
            {
              q: 'How do I handle days with only 1 examination session?',
              a: 'In Examination Period tab, click the + / × button on that date for JRS 2 and JRS 3 to disable them. Only JRS 1 will remain active, and the scheduler will assign invigilators only for the morning.',
            },
            {
              q: 'Why did an HOD receive 4 duties while regular faculty received 6?',
              a: 'By default, HODs receive a 2-duty concession (target 4 vs regular target 6) because of their administrative obligations. You can customize target duties in Faculty Management or Role Manager.',
            },
            {
              q: 'Can I swap duties manually if a teacher requests a change?',
              a: 'Yes. In Schedule Views, drag and drop the duty badge to another faculty member, or right click / click Find Substitute. The system checks constraints and lets you execute an atomic swap.',
            },
            {
              q: 'Is my data private? Does anything get uploaded to the cloud?',
              a: '100% private. The scheduler runs entirely inside your web browser. No faculty names, dates, or schedules are ever sent over the network to any third-party server.',
            },
            {
              q: 'Can I use this software offline without an internet connection?',
              a: 'Yes. Simply double click index.html from your computer. The entire application is self-contained and operates completely offline in any modern browser.',
            },
          ].map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40"
            >
              <button
                type="button"
                onClick={() => toggleFaq(i)}
                className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <span>{faq.q}</span>
                {activeFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {activeFaq === i && (
                <div className="p-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Strict Privacy & Attribution Badge */}
      <div className="apple-glass-card rounded-2xl p-4 text-center text-xs text-slate-500 dark:text-slate-400">
        College Examination Supervision Scheduling Engine • Pure Client-Side Architecture • All rights reserved.
      </div>
    </div>
  );
};
