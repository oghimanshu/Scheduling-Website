import React from 'react';
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
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { generateSampleFacultyCSV } from '../services/csvParser';

export const InstructionsView: React.FC = () => {
  const { setActiveTab } = useScheduler();

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-xs font-semibold text-sky-200 backdrop-blur-md mb-3">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Complete Administration &amp; Scheduling Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            How to Use the Examination Supervision Scheduler
          </h1>
          <p className="text-sm text-sky-200/90 mt-2 leading-relaxed">
            This system utilizes mathematical constraint optimization to generate balanced, conflict-free
            examination invigilation schedules. Follow this comprehensive guide to configure faculty rosters,
            manage duty periods, enforce college policies, and export official reports.
          </p>
        </div>
      </div>

      {/* 5-Step Quick Start Workflow */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
            1-5
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Start: Standard Scheduling Workflow</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Step-by-step procedure to generate your college exam supervision timetable</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Upload Faculty CSV</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Upload your college roster with Sr. No, Faculty Name, HOD status, and Arrival time.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('faculty')}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
            >
              <span>Go to Faculty</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Configure Exam Period</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Set start/end dates, mark holidays or non-exam days, and adjust supervisor requirements.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('period')}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
            >
              <span>Go to Period</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Set Availability</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Mark specific dates or full exclusions for faculty on duty leave, medical leave, or meetings.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('availability')}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
            >
              <span>Go to Matrix</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">4</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Generate 5 Alternatives</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Click "Generate 5 Alternatives" to produce mathematically optimal options.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">5</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Review &amp; Export</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Inspect duties in Faculty or Session view, lock confirmed slots, and export to Excel or PDF.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('schedule')}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
            >
              <span>View Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </button>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Required column names and format for uploading faculty data</p>
            </div>
          </div>

          <button
            onClick={() => handleDownloadSample(false)}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800/60 rounded-xl transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>DOWNLOAD TEMPLATE (.CSV)</span>
          </button>
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
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Unique identifier for each faculty member.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Faculty Name</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3">Any text string</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Full name and honorific (e.g. Dr. John Doe).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">HOD</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3 font-mono">Yes, No, TRUE, FALSE, 1, 0</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Specifies Department Leadership. HODs are assigned last.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Arrival</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Mandatory</td>
                <td className="py-2.5 px-3 font-mono font-bold">Morning, Mid, Afternoon</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Determines eligibility for JRS 1, JRS 2, or JRS 3.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-300">Previous Duties</td>
                <td className="py-2.5 px-3 text-slate-400">Optional</td>
                <td className="py-2.5 px-3 font-mono">0, 1, 2, ...</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Carried forward duties from prior examination phases.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Core Scheduling Rules & Priority Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Faculty First / HOD Last */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Faculty-First / HOD-Last Allocation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Workload hierarchy policy</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The scheduler strictly enforces that <strong>Regular Faculties are prioritized for all available slots first</strong>.
            Their workload caps (e.g. 6 duties) are fully met before any Head of Department (HOD) is called upon.
          </p>
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Guarantee:</strong> An HOD will never receive a duty slot if there remains an eligible, available Regular Faculty
            member with capacity.
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
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-sky-700 dark:text-sky-300">Morning Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 1 &amp; JRS 2</strong></span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-purple-700 dark:text-purple-300">Mid Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 1, JRS 2, &amp; JRS 3</strong></span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-amber-700 dark:text-amber-300">Afternoon Arrival</span>
              <span className="text-slate-600 dark:text-slate-300">Eligible for <strong>JRS 2 &amp; JRS 3</strong></span>
            </div>
          </div>
        </div>

        {/* Rule 3: Duty Limits & Rest */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Limits &amp; Spacing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fatigue prevention &amp; fairness</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
            <li><strong>Maximum 2 duties per day:</strong> No faculty member can be assigned 3 sessions on a single day.</li>
            <li><strong>Consecutive duty deterrence:</strong> Back-to-back duties (e.g. JRS 1 followed directly by JRS 2) are avoided whenever possible to give supervisors rest.</li>
            <li><strong>Workload variance minimization:</strong> Duties are distributed equitably so everyone reaches target capacity simultaneously.</li>
          </ul>
        </div>

        {/* Rule 4: Standby / Reserve Supervisors */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reserve / Standby Supervisors</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Emergency buffer invigilators</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Reserve supervisors are assigned on standby for high-density sessions. If an invigilator calls in sick or
            takes emergency leave, the reserve supervisor steps in immediately.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400">
            <strong>Workload Cap Setting:</strong> In Settings, you can toggle whether reserve duties count toward a
            faculty member's regular cap limit or are treated as an extra standby allowance.
          </div>
        </div>
      </div>

      {/* Advanced Capabilities */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Advanced Features &amp; Controls</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>Assignment Locking</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Click any duty cell in Schedule Views to lock it. Locked duties are strictly pinned and will never be moved when rebalancing or generating new alternatives.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
              <Sliders className="w-4 h-4" />
              <span>Role-Based Bulk Caps</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              In Faculty Management, set maximum supervision caps for all Regular Faculty or all HODs simultaneously with a single click.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <Calendar className="w-4 h-4" />
              <span>Date-Specific Exclusions</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Exclude faculty members on specific individual dates (e.g. medical appointments) without excluding them from the entire examination period.
            </p>
          </div>
        </div>
      </div>

      {/* Offline & Deployment Info */}
      <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-4 border border-sky-300/40 dark:border-sky-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Offline Capability &amp; GitHub Pages Deployment</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">100% Client-Side Privacy</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The entire scheduler is built as a single, self-contained HTML package. All data processing occurs locally within your web browser
          session. No faculty rosters, names, or timetables are ever sent to an external server.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Running Offline:</span>
            <span className="text-slate-600 dark:text-slate-400">Double click <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">index.html</code> directly from your file manager. It opens in Chrome, Safari, Edge, or Firefox without requiring an internet connection or server.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Uploading to GitHub Pages:</span>
            <span className="text-slate-600 dark:text-slate-400">Upload the repository folder to GitHub and set GitHub Pages source to either root <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">/</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">/docs</code>. It works automatically out of the box.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
