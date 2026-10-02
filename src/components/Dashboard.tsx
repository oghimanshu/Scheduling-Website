import React from 'react';
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
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { downloadFacultyTemplateCSV } from '../services/csvParser';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

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
    setIsRoleSegregationModalOpen,
    setIsQuickstartModalOpen,
    updateHodAssignmentPriority,
    isGenerating,
  } = useScheduler();

  const activeDates = project.examPeriod.dates.filter((d) => !d.isExcluded);

  // Compute workload min, max, average dynamically
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

  // Animated KPI numbers for high-fidelity tactile feedback
  const animFacultyCount = useAnimatedNumber(project.faculty.length);
  const animActiveDates = useAnimatedNumber(activeDates.length);
  const animRequiredPositions = useAnimatedNumber(validation.totalRequiredPositions);
  const animFilledPositions = useAnimatedNumber(validation.totalFilledPositions);
  const animHardConflicts = useAnimatedNumber(validation.hardConflictsCount);

  return (
    <div className="relative space-y-6">
      {/* Ambient Dynamic Background Glowing Orbs & Fluid Particle Motion */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-10 left-1/4 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-gradient-to-tr from-sky-400/20 via-sky-500/10 to-transparent animate-float-slow animate-pulse-glow" />
        <div className="absolute top-44 right-10 w-72 sm:w-[420px] h-72 sm:h-[420px] rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent animate-float-reverse animate-pulse-glow" style={{ animationDelay: '-3.5s' }} />
        <div className="absolute bottom-24 left-1/3 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-gradient-to-r from-teal-400/15 via-emerald-400/10 to-transparent animate-float-slow" style={{ animationDelay: '-6s' }} />
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Session Onboarding Prompt / Let's Begin Hero Card */}
      {project.faculty.length === 0 && (
        <div className="apple-glass-card border-2 border-dashed border-sky-400/70 dark:border-sky-500/40 rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Welcome to Exam Scheduler! Let's Begin.
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Zero Knowledge Needed
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Start from a clean slate: click <strong>Let's Begin</strong> to launch the 3-step interactive setup wizard to import faculty, configure exam dates, and generate optimal supervision duties in seconds.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsQuickstartModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 shadow-lg hover:shadow-xl transition cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>🚀 LET'S BEGIN (GUIDED SETUP)</span>
            </button>

            <button
              type="button"
              onClick={() => downloadFacultyTemplateCSV(false)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10 rounded-2xl shadow-xs transition cursor-pointer"
              title="Download standard CSV format with mandatory headers: Sr. No., Faculty Name, HOD, Arrival"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Download CSV Template</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-900/95 via-indigo-950/95 to-slate-900/95 border border-sky-400/30 rounded-3xl p-6 sm:p-7 text-white shadow-2xl backdrop-blur-xl">
        <div className="apple-specular-rim" />
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30 backdrop-blur-xs">
                {activeDates.length === 0 ? 'Period: Clean Slate' : `Active Period: ${project.examPeriod.name}`}
              </span>
              <span className="text-xs text-sky-300">
                ({activeDates.length} Active Dates, {project.examPeriod.dates.length - activeDates.length} Excluded)
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                College Examination Supervision Control Center
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-sky-200 max-w-2xl mt-1">
              Automated mathematical constraint scheduling engine guaranteeing faculty eligibility, availability,
              workload fairness, faculty-first prioritization, and locked administrative overrides.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Duty Order / Concession Preference Selector */}
            <div className="inline-flex items-center space-x-1.5 bg-sky-950/70 border border-sky-400/40 rounded-xl px-2.5 py-1.5 text-xs text-white shadow-xs">
              <span className="text-sky-300 font-semibold whitespace-nowrap text-[11px]">Duty Priority:</span>
              <select
                value={project.settings.hodAssignmentPriority || 'regular_first_hod_last'}
                onChange={(e) => updateHodAssignmentPriority(e.target.value as any)}
                className="bg-sky-900/90 text-white rounded-lg px-2 py-1 text-xs border border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-300 font-semibold cursor-pointer"
                title="Determine whether duties are assigned to regular faculty first (HOD concession) or to HODs first"
              >
                <option value="regular_first_hod_last">Regular First, HODs Last (Concession)</option>
                <option value="hod_first">HODs First (Priority)</option>
                <option value="proportional_equal">Proportional / Equal Balance</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('roles')}
              className="btn-spring inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-800/80 hover:bg-sky-700 text-sky-100 border border-sky-400/30 cursor-pointer shadow-xs"
              title="Open Role Manager workspace to customize role tiers, duty caps, and concessions"
            >
              <Users className="w-3.5 h-3.5 text-sky-300" />
              <span>Role Manager</span>
            </button>

            <button
              onClick={generateAlternatives}
              disabled={isGenerating || project.faculty.length === 0 || activeDates.length === 0}
              className="btn-spring inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white text-sky-950 hover:bg-sky-50 shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-sky-600 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Optimizing Schedule...' : 'GENERATE 5 ALTERNATIVES'}</span>
            </button>

            <button
              onClick={rebalanceCurrentSchedule}
              disabled={isGenerating || project.assignments.length === 0}
              className="btn-spring inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-sky-700/80 hover:bg-sky-700 text-white border border-sky-600 shadow-xs disabled:opacity-40 cursor-pointer"
              title="Preserves locked assignments while redistributing open slots"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REBALANCE</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn-spring inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-sky-700/80 hover:bg-sky-700 text-white border border-sky-600 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT</span>
            </button>
          </div>
        </div>

        {/* Dynamic Capacity Balance Equation */}
        <div className="mt-5 pt-4 border-t border-sky-700/60 flex flex-wrap items-center justify-between text-xs text-sky-200 gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <Info className="w-4 h-4 text-sky-300 shrink-0" />
            <span className="font-semibold text-white">Dynamic Workload Balance:</span>
            <span>
              {project.faculty.length > 0 ? (
                <>
                  <span className="tabular-nums font-mono">{regularFaculty.length}</span> Regular × <span className="tabular-nums font-mono">{regularFaculty[0]?.maxSupervisions || 6}</span> (<span className="tabular-nums font-mono">{regularCapacity}</span>) +{' '}
                  <span className="tabular-nums font-mono">{hodFaculty.length}</span> HOD × <span className="tabular-nums font-mono">{hodFaculty[0]?.maxSupervisions || 4}</span> (<span className="tabular-nums font-mono">{hodCapacity}</span>) ={' '}
                  <strong className="text-white tabular-nums font-mono">{totalCapacity} Faculty Capacity</strong>
                </>
              ) : (
                <span className="text-amber-200 font-semibold">
                  0 Faculty Loaded (0 Capacity)
                </span>
              )}
            </span>
            <span>⟷</span>
            <span>
              {activeDates.length > 0 ? (
                <>
                  <span className="tabular-nums font-mono">{activeDates.length}</span> Active Dates ={' '}
                  <strong className="text-white tabular-nums font-mono">{validation.totalRequiredPositions} Required Positions</strong>
                </>
              ) : (
                <span className="text-sky-300 font-semibold">0 Required Positions (0 Active Dates)</span>
              )}
            </span>
          </div>
          <div className="mt-1 md:mt-0 font-medium">
            {project.faculty.length === 0 && activeDates.length === 0 ? (
              <span className="text-sky-200 font-medium">Fresh Session: Click Let's Begin to start</span>
            ) : project.faculty.length === 0 ? (
              <span className="text-amber-200 font-medium">Upload CSV to calculate balance</span>
            ) : totalCapacity === validation.totalRequiredPositions ? (
              <span className="text-emerald-300 flex items-center space-x-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Perfect Mathematical Equilibrium</span>
              </span>
            ) : totalCapacity > validation.totalRequiredPositions ? (
              <span className="text-sky-300 font-semibold">Surplus Capacity (+<span className="tabular-nums font-mono">{totalCapacity - validation.totalRequiredPositions}</span>)</span>
            ) : (
              <span className="text-amber-300 font-bold">Deficit: Need +<span className="tabular-nums font-mono">{validation.totalRequiredPositions - totalCapacity}</span> positions</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Faculty */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">{animFacultyCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            <span className="tabular-nums font-mono font-semibold">{regularFaculty.length}</span> Regular • <span className="tabular-nums font-mono font-semibold">{hodFaculty.length}</span> HOD
          </div>
        </div>

        {/* Active Dates */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Dates</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">{animActiveDates}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {project.examPeriod.dates.length === 0 ? (
              <span className="text-slate-400">0 dates configured</span>
            ) : (
              <span><span className="tabular-nums font-mono font-semibold">{project.examPeriod.dates.length - activeDates.length}</span> Excluded (Holidays)</span>
            )}
          </div>
        </div>

        {/* Required Positions */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Required</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">{animRequiredPositions}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
            {activeDates.length === 0 ? 'Awaiting date setup' : `${validation.totalRequiredPositions} duties total`}
          </div>
        </div>

        {/* Filled Positions */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filled</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight tabular-nums font-mono ${
              validation.totalFilledPositions === validation.totalRequiredPositions
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {animFilledPositions}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {validation.totalRequiredPositions === 0 ? (
              <span className="text-slate-500 dark:text-slate-400">0 assigned</span>
            ) : validation.unfilledPositions > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold"><span className="tabular-nums font-mono">{validation.unfilledPositions}</span> unfilled</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Staffed</span>
            )}
          </div>
        </div>

        {/* Hard Conflicts */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hard Conflicts</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200 ${validation.hardConflictsCount > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight tabular-nums font-mono ${
              validation.hardConflictsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {animHardConflicts}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {project.faculty.length === 0 && validation.totalRequiredPositions === 0
              ? 'Engine Ready'
              : validation.hardConflictsCount === 0
              ? 'Strict Rules Met'
              : 'Violation(s) detected'}
          </div>
        </div>

        {/* Workload Range */}
        <div className="apple-glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="apple-specular-rim" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workload</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">{avgWorkload}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Min: <span className="tabular-nums font-mono font-semibold">{minWorkload}</span> • Max: <span className="tabular-nums font-mono font-semibold">{maxWorkload}</span>
          </div>
        </div>
      </div>

      {/* Prominent Validation Summary Panel */}
      <div className="apple-glass-card rounded-3xl border border-white/60 dark:border-white/10 p-6 md:p-8 shadow-glass dark:shadow-glass-dark relative overflow-hidden">
        <div className="apple-specular-rim" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mathematical Validation & Rule Verification Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Independent audit against institutional business rules and hard constraints
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsWhyValidModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Why is this schedule valid?</span>
            </button>
            {project.alternatives.length > 0 && (
              <button
                onClick={() => setIsAlternativesModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border border-sky-500/30 transition cursor-pointer flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>View 5 Alternatives</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean State Beginner Helper Banner if not yet configured */}
        {project.faculty.length === 0 && validation.totalRequiredPositions === 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

        {/* Dynamic Verification Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-xs">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Positions Allocation</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {validation.totalFilledPositions} / {validation.totalRequiredPositions}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1">
              {validation.totalRequiredPositions === 0 ? (
                <span className="text-slate-500 dark:text-slate-400">0 duties required (baseline)</span>
              ) : validation.unfilledPositions === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ 100% Positions Staffed</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">⚠ {validation.unfilledPositions} unallocated</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-xs">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Regular Faculty Target (6/6)</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {validation.regularCount === 0 ? '0 / 0' : `${validation.regularAtTargetCount} / ${validation.regularCount}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {validation.regularCount === 0 ? (
                <span className="text-slate-500 dark:text-slate-400">No regular faculty loaded</span>
              ) : validation.regularAtTargetCount === validation.regularCount ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ All {validation.regularCount} faculty at target</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {validation.regularCount - validation.regularAtTargetCount} deviating from target
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-xs">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">HOD Target (4/4)</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {validation.hodCount === 0 ? '0 / 0' : `${validation.hodAtTargetCount} / ${validation.hodCount}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {validation.hodCount === 0 ? (
                <span className="text-slate-500 dark:text-slate-400">No HODs loaded</span>
              ) : validation.hodAtTargetCount === validation.hodCount ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ All {validation.hodCount} HODs at target</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {validation.hodCount - validation.hodAtTargetCount} deviating from target
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-xs">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Constraint Violations</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {validation.hardConflictsCount} Hard • {validation.softWarningsCount} Soft
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {validation.hardConflictsCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ 0 Rule Violations</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{validation.hardConflictsCount} critical errors</span>
              )}
            </div>
          </div>
        </div>

        {/* Conflicts List if any */}
        {validation.conflicts.length > 0 && (
          <div className="mt-5 space-y-2">
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

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveTab('faculty')}
          className="apple-glass-card p-5 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-sky-400 transition cursor-pointer group relative overflow-hidden"
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
          className="apple-glass-card p-5 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-indigo-400 transition cursor-pointer group relative overflow-hidden"
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
          onClick={() => setActiveTab('availability')}
          className="apple-glass-card p-5 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-emerald-400 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="apple-specular-rim" />
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Availability Matrix</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interactive grid to quickly mark faculty leaves, copy availability across dates, or batch update.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('schedule')}
          className="apple-glass-card p-5 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-amber-400 transition cursor-pointer group relative overflow-hidden"
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
          className="apple-glass-card p-5 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark hover:border-purple-400 transition cursor-pointer group relative overflow-hidden"
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
      </div>
    </div>
  );
};
