import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Download,
  Info,
  ArrowRight,
  ShieldCheck,
  Upload,
  BookOpen,
  Building,
  BarChart3,
  Sliders,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { parseFacultyCSV, downloadFacultyTemplateCSV } from '../services/csvParser';
import { downloadRoomsTemplateCSV } from '../services/roomParser';
import { importProjectFromJson } from '../services/export/exportManager';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { FileDropZone } from './FileDropZone';

export const Dashboard: React.FC = () => {
  const {
    project,
    validation,
    setActiveTab,
    generateAlternatives,
    rebalanceCurrentSchedule,
    setIsAlternativesModalOpen,
    setIsWhyValidModalOpen,
    setIsExportModalOpen,
    setIsQuickstartModalOpen,
    updateHodAssignmentPriority,
    isGenerating,
    updateFacultyList,
    importProjectData,
  } = useScheduler();

  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'equity' | 'rooms' | 'rules'>('equity');

  const activeDates = project.examPeriod.dates.filter((d) => !d.isExcluded);
  const isCleanSlate = project.faculty.length === 0 && activeDates.length === 0;

  // Workload computations
  const workloads = project.faculty.map((f) => {
    const assignedCount = project.assignments.filter((a) => a.facultySrNo === f.srNo).length;
    return f.previousSupervisions + assignedCount;
  });
  const minWorkload = workloads.length > 0 ? Math.min(...workloads) : 0;
  const maxWorkload = workloads.length > 0 ? Math.max(...workloads) : 0;
  const avgWorkload =
    workloads.length > 0
      ? (workloads.reduce((a, b) => a + b, 0) / workloads.length).toFixed(1)
      : '0.0';

  // Dynamic capacity calculations
  const regularFaculty = project.faculty.filter((f) => !f.isHod);
  const hodFaculty = project.faculty.filter((f) => f.isHod);
  const regularCapacity = regularFaculty.reduce(
    (sum, f) => sum + Math.max(0, f.maxSupervisions - f.previousSupervisions),
    0
  );
  const hodCapacity = hodFaculty.reduce(
    (sum, f) => sum + Math.max(0, f.maxSupervisions - f.previousSupervisions),
    0
  );
  const totalCapacity = regularCapacity + hodCapacity;

  // Room metrics
  const rooms = project.rooms || [];
  const activeRooms = rooms.filter((r) => r.isActive !== false);
  const activeSeatingCapacity = activeRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const totalRoomInvigilators = activeRooms.reduce((sum, r) => sum + (r.invigilatorsRequired || 1), 0);

  // Animated numbers
  const animFacultyCount = useAnimatedNumber(project.faculty.length);
  const animActiveDates = useAnimatedNumber(activeDates.length);
  const animActiveHalls = useAnimatedNumber(activeRooms.length);
  const animRequiredPositions = useAnimatedNumber(validation.totalRequiredPositions);
  const animFilledPositions = useAnimatedNumber(validation.totalFilledPositions);
  const animHardConflicts = useAnimatedNumber(validation.hardConflictsCount);

  // Workload spread calculation
  const workloadSpread = maxWorkload - minWorkload;

  return (
    <div className="relative space-y-8 pb-12">
      {/* SECTION 1: STUDIO HERO & WELCOME (ABOVE THE FOLD) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 border border-sky-400/25 rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-2xl backdrop-blur-2xl">
        <div className="apple-specular-rim" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30 backdrop-blur-xs flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {isCleanSlate
                      ? 'Clean Slate Session'
                      : `Active Period: ${project.examPeriod.name || 'End Semester 2026'}`}
                  </span>
                </span>
                <span className="text-xs text-sky-300 font-medium">
                  {isCleanSlate
                    ? 'Ready for Setup'
                    : `${activeDates.length} Exam Dates • ${project.faculty.length} Faculty Loaded`}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                College Examination Supervision Control Center
              </h1>
              <p className="text-xs sm:text-sm text-sky-200/90 max-w-2xl leading-relaxed">
                Automated mathematical constraint scheduling engine guaranteeing faculty eligibility,
                arrival alignment, workload equity, and designated hall assignments.
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={generateAlternatives}
                disabled={isGenerating || project.faculty.length === 0 || activeDates.length === 0}
                className="btn-spring inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-sky-950 hover:bg-sky-50 shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={project.faculty.length === 0 ? 'Upload faculty and configure dates first' : 'Generate 5 optimal schedule alternatives'}
              >
                <Sparkles className={`w-4 h-4 text-sky-600 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Optimizing Schedule...' : 'GENERATE 5 ALTERNATIVES'}</span>
              </button>

              <button
                type="button"
                onClick={rebalanceCurrentSchedule}
                disabled={isGenerating || project.assignments.length === 0}
                className="btn-spring inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs bg-sky-800/80 hover:bg-sky-700 text-white border border-sky-600/60 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Preserves locked assignments while redistributing open slots"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REBALANCE</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="btn-spring inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs bg-sky-800/80 hover:bg-sky-700 text-white border border-sky-600/60 shadow-xs cursor-pointer"
                title="Export schedule as Excel, CSV, or printable documents"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </button>
            </div>
          </div>

          {/* TWO PRIMARY ACTION CARDS: CLEAN & PROMINENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Card 1: Guided Setup Wizard */}
            <div className="apple-glass-card bg-white/10 dark:bg-slate-900/60 border border-sky-300/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-sky-400/60 transition group relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    4-Step Interactive Guide
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-sky-200 transition-colors">
                    Launch Guided Setup Wizard
                  </h3>
                  <p className="text-xs text-sky-200/80 mt-1 leading-relaxed">
                    Step-by-step assistant guiding you through faculty rosters, examination dates, daily JRS shifts, hall allocations, and mathematical fairness priority.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickstartModalOpen(true)}
                  className="btn-spring inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-white shadow-md transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>LET'S BEGIN SETUP</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>

                <div className="flex items-center space-x-1.5 text-xs text-sky-300">
                  <button
                    type="button"
                    onClick={() => downloadFacultyTemplateCSV(false)}
                    className="hover:text-white underline text-[11px] cursor-pointer"
                  >
                    Faculty CSV
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={downloadRoomsTemplateCSV}
                    className="hover:text-white underline text-[11px] cursor-pointer"
                  >
                    Rooms CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Quick Auto-Import & Dropzone */}
            <div className="apple-glass-card bg-white/10 dark:bg-slate-900/60 border border-sky-300/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-sky-400/60 transition group relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30">
                    Instant Auto-Import
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-teal-200 transition-colors">
                    Drop File to Auto-Import
                  </h3>
                  <p className="text-xs text-sky-200/80 mt-1 leading-relaxed">
                    Drag and drop your faculty CSV roster or previously saved project JSON backup here. The engine auto-detects columns and formats instantly.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <FileDropZone
                  compact
                  title="Plug & Play: Drop Faculty CSV or Project JSON Here"
                  description="Auto-detects format and initializes session"
                  supportedFormatsText="Accepts .csv (Sr. No., Faculty Name, HOD, Arrival) or .json backup files"
                  accept=".csv,.json"
                  onFileLoaded={(text, file) => {
                    if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
                      const res = importProjectFromJson(text);
                      if (res.success && res.state) {
                        importProjectData(res.state);
                      }
                    } else {
                      const parseResult = parseFacultyCSV(text, { mode: 'from_csv' });
                      if (parseResult.success && parseResult.faculty.length > 0) {
                        updateFacultyList(parseResult.faculty);
                        setActiveTab('faculty');
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Clean Capacity & Session Status Ribbon */}
          <div className="pt-4 border-t border-sky-700/60 flex flex-wrap items-center justify-between text-xs text-sky-200 gap-3">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Info className="w-4 h-4 text-sky-300 shrink-0" />
              <span className="font-semibold text-white">Capacity Balance:</span>
              {project.faculty.length > 0 ? (
                <span>
                  <strong className="text-white font-mono">{project.faculty.length}</strong> Faculty ({regularCapacity + hodCapacity} Duties Max)
                  ⟷ <strong className="text-white font-mono">{validation.totalRequiredPositions}</strong> Positions Needed
                </span>
              ) : (
                <span className="text-sky-300">Awaiting faculty upload to calculate duty balance</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center space-x-1.5 bg-sky-950/70 border border-sky-400/40 rounded-xl px-2.5 py-1 text-xs text-white">
                <span className="text-sky-300 text-[11px] font-semibold">Priority:</span>
                <select
                  value={project.settings.hodAssignmentPriority || 'regular_first_hod_last'}
                  onChange={(e) => updateHodAssignmentPriority(e.target.value as any)}
                  className="bg-transparent text-white text-xs focus:outline-none font-semibold cursor-pointer"
                  title="Choose between regular faculty first or equal proportional distribution"
                >
                  <option value="regular_first_hod_last" className="bg-slate-900 text-white">Regular First, HODs Last</option>
                  <option value="hod_first" className="bg-slate-900 text-white">HODs First</option>
                  <option value="proportional_equal" className="bg-slate-900 text-white">Proportional Balance</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className="hover:text-white underline text-xs cursor-pointer font-medium"
              >
                Role Manager &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: STREAMLINED KPI TILES */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Faculty */}
        <div
          onClick={() => setActiveTab('faculty')}
          className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group cursor-pointer hover:border-sky-400 transition"
          title="Click to view faculty roster"
        >
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{animFacultyCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {regularFaculty.length} Regular • {hodFaculty.length} HOD
          </div>
        </div>

        {/* Active Exam Dates */}
        <div
          onClick={() => setActiveTab('period')}
          className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group cursor-pointer hover:border-indigo-400 transition"
          title="Click to configure exam dates"
        >
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Exam Dates</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{animActiveDates}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {project.examPeriod.dates.length === 0 ? '0 dates configured' : `${activeDates.length} active exam shifts`}
          </div>
        </div>

        {/* Exam Halls */}
        <div
          onClick={() => setActiveTab('rooms')}
          className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group cursor-pointer hover:border-teal-400 transition"
          title="Click to manage Examination Halls & Seating"
        >
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Exam Halls</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{animActiveHalls}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {activeSeatingCapacity} seats active
          </div>
        </div>

        {/* Required Positions */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Required Duties</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{animRequiredPositions}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {validation.totalRequiredPositions === 0 ? 'Awaiting date setup' : `${validation.totalRequiredPositions} duties total`}
          </div>
        </div>

        {/* Filled Positions */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Staffed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight font-mono ${
              validation.totalFilledPositions === validation.totalRequiredPositions && validation.totalRequiredPositions > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {animFilledPositions}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {validation.totalRequiredPositions === 0 ? (
              '0 assigned'
            ) : validation.unfilledPositions > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">{validation.unfilledPositions} unfilled</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Staffed</span>
            )}
          </div>
        </div>

        {/* Hard Conflicts */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Violations</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ${
                validation.hardConflictsCount > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight font-mono ${
              validation.hardConflictsCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {animHardConflicts}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {isCleanSlate ? (
              'Engine Ready'
            ) : validation.hardConflictsCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 Rule Violations</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-bold">{validation.hardConflictsCount} critical errors</span>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: 3-PILLAR ANALYTICS SUITE (BELOW THE FOLD UPON SCROLLING) */}
      <section className="apple-glass-card rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 md:p-8 shadow-glass dark:shadow-glass-dark relative overflow-hidden space-y-6">
        <div className="apple-specular-rim" />

        {/* Analytics Header & Tab Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Examination Operations &amp; Mathematical Diagnostics
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit of workload fairness, seating capacity utilization, and constraint compliance
            </p>
          </div>

          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('equity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeAnalyticsTab === 'equity'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Workload Equity
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('rooms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeAnalyticsTab === 'rooms'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Halls &amp; Seating
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeAnalyticsTab === 'rules'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Rule Health
            </button>
          </div>
        </div>

        {/* TAB 1: WORKLOAD EQUITY GAUGE */}
        {activeAnalyticsTab === 'equity' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/40">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 block">Average Duty Workload</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">{avgWorkload} duties</div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Min: <span className="font-mono font-semibold">{minWorkload}</span> • Max: <span className="font-mono font-semibold">{maxWorkload}</span>
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">Regular Faculty Target Parity</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {validation.regularCount === 0 ? '0 / 0' : `${validation.regularAtTargetCount} / ${validation.regularCount}`}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {validation.regularCount === 0 ? 'Awaiting faculty import' : `${validation.regularAtTargetCount} faculty strictly at target`}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300 block">HOD Concession Parity</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {validation.hodCount === 0 ? '0 / 0' : `${validation.hodAtTargetCount} / ${validation.hodCount}`}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {validation.hodCount === 0 ? '0 HODs configured' : `${validation.hodAtTargetCount} HODs at concession cap`}
                </span>
              </div>
            </div>

            {/* Workload Equity Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Equity &amp; Variance Gauge</span>
                <span className="text-slate-500 font-mono">Spread: {workloadSpread} duties</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (1 - workloadSpread / Math.max(1, maxWorkload)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0 Variance (Perfect Mathematical Equity)</span>
                <span>Max Deviation: {workloadSpread} duties</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS & SEATING UTILIZATION */}
        {activeAnalyticsTab === 'rooms' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/40">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block">Total Active Seating Capacity</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {activeSeatingCapacity} seats
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Across {activeRooms.length} active examination halls
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/40">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 block">Invigilator Demand per Session</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {totalRoomInvigilators} invigilators
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Based on hall capacity quotas (1 per 30 seats)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">Hall Configuration Roster</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {rooms.length} Halls Registered
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold block mt-0.5 cursor-pointer"
                >
                  Manage Rooms &amp; Noticeboard Charts &rarr;
                </button>
              </div>
            </div>

            {/* Room List Chips */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Active Examination Halls Roster</span>
              <div className="flex flex-wrap gap-2">
                {rooms.map((r) => (
                  <span
                    key={r.id}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                      r.isActive !== false
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/10 line-through'
                    }`}
                  >
                    {r.name} ({r.capacity} seats • {r.invigilatorsRequired || 1} staff)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RULE HEALTH & MATHEMATICAL AUDIT */}
        {activeAnalyticsTab === 'rules' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Clean State Beginner Helper Banner */}
            {isCleanSlate && (
              <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Mathematical Auditor Standing By (0 Rule Violations)
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      The mathematical verification system is idle. Once you import faculty and exam dates, the auditor checks single-duty limits, arrival compatibility, and workload parity in real time.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickstartModalOpen(true)}
                  className="btn-spring px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs shrink-0 cursor-pointer"
                >
                  Start Setup Wizard
                </button>
              </div>
            )}

            {/* Audit Status Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Single Duty per Session</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-1">
                  <Check className="w-4 h-4" />
                  <span>Strictly Enforced</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Arrival Compatibility</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-1">
                  <Check className="w-4 h-4" />
                  <span>Strictly Enforced</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Role Maximum Duty Caps</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-1">
                  <Check className="w-4 h-4" />
                  <span>Strictly Enforced</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Audit Explanations</span>
                <button
                  type="button"
                  onClick={() => setIsWhyValidModalOpen(true)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1 mt-1 cursor-pointer"
                >
                  <span>Why is schedule valid?</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conflicts List if any */}
            {validation.conflicts.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Detected Notifications ({validation.conflicts.length})
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {validation.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl text-xs flex items-start space-x-2.5 border ${
                        c.type === 'hard'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {c.type === 'hard' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className="font-bold uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded mr-2 bg-white/70 dark:bg-white/10">
                          {c.type}
                        </span>
                        <span>{c.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 4: NAVIGATION QUICK CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveTab('faculty')}
          className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-sky-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Faculty Management</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Import CSV, configure previous counts, manage individual HOD maximums and arrival categories.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('period')}
          className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-indigo-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Examination Period</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate exam dates, exclude holidays/no-exam dates, and configure JRS 1, 2, 3 timings and staffing.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('rooms')}
          className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-teal-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Building className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Rooms &amp; Halls</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage examination halls, seating capacity, invigilator quotas, and printable noticeboard charts.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('schedule')}
          className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-amber-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Schedule Views</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Faculty Schedule View, Date/Session Duty Rosters, and Workload Target Distribution.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('instructions')}
          className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-purple-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Instructions &amp; Guide</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Full administration workflow, CSV templates, policy constraints, and user manual.
          </p>
        </div>
      </section>
    </div>
  );
};
