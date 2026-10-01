import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  Sun,
  Moon,
  BookOpen,
  Trash2,
  Award,
  Cloud,
  User,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    validation,
    isGenerating,
    lastSaved,
    generateAlternatives,
    rebalanceCurrentSchedule,
    setIsAlternativesModalOpen,
    setIsWhyValidModalOpen,
    setIsExportModalOpen,
    setIsSettingsModalOpen,
    setIsResetConfirmModalOpen,
    setIsGoogleAuthModalOpen,
    currentUser,
    cloudSyncStatus,
    isDarkMode,
    toggleDarkMode,
  } = useScheduler();

  return (
    <header className="apple-glass sticky top-0 z-30 border-b border-slate-200/60 dark:border-white/10 transition-colors duration-300 relative">
      <div className="apple-specular-rim" />
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18 gap-2">
          {/* Logo, Title & Hero Navigation */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 text-left cursor-pointer group rounded-2xl p-1 -m-1 hover:bg-slate-100/60 dark:hover:bg-white/5 transition"
            title="Go to Hero Dashboard"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/30 group-hover:scale-105 transition-transform duration-200">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  EXAM SCHEDULER
                </h1>
                <span className="hidden md:inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-100/80 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-400/30">
                  College Admin
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 sm:space-x-2 truncate">
                <span className="hidden sm:inline">Auto-saved</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">Saved: {lastSaved}</span>
              </p>
            </div>
          </button>

          {/* Center: Validation badge (Desktop/Tablet) */}
          <div className="hidden lg:flex items-center space-x-2">
            {validation.isValid ? (
              <button
                onClick={() => setIsWhyValidModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition text-xs font-semibold cursor-pointer shadow-2xs backdrop-blur-xs"
                title="Click to see why this schedule is valid"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  Valid ({validation.totalFilledPositions}/{validation.totalRequiredPositions})
                </span>
                <span className="underline ml-1 font-bold text-emerald-800 dark:text-emerald-200">Why valid?</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>
                  {validation.hardConflictsCount > 0
                    ? `${validation.hardConflictsCount} Conflicts`
                    : `${validation.unfilledPositions} Unfilled`}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons & Prominent Dark Mode Toggle */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Apple-Style Liquid Glass Dark Mode Pill Toggle */}
            <button
              onClick={toggleDarkMode}
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              className="relative inline-flex items-center justify-between w-15 sm:w-16 h-8 px-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/80 dark:border-white/15 backdrop-blur-md shadow-inner transition-colors duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <Sun className={`w-3.5 h-3.5 transition-opacity ${isDarkMode ? 'text-slate-400 opacity-40' : 'text-amber-500 opacity-100'}`} />
              <Moon className={`w-3.5 h-3.5 transition-opacity ${isDarkMode ? 'text-sky-300 opacity-100' : 'text-slate-400 opacity-40'}`} />
              <span
                className={`absolute top-1 bottom-1 w-6 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center border border-black/5 dark:border-white/10 transition-transform duration-300 ease-spring ${
                  isDarkMode ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                }`}
              >
                {isDarkMode ? (
                  <Moon className="w-3 h-3 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
                ) : (
                  <Sun className="w-3 h-3 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
                )}
              </span>
            </button>

            {/* Google Sign-In / Cloud Sync Button */}
            <button
              onClick={() => setIsGoogleAuthModalOpen(true)}
              className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                currentUser
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/10 hover:bg-slate-50'
              }`}
              title={
                currentUser
                  ? `Signed in as ${currentUser.displayName} (${currentUser.email}). Click to manage cloud sessions.`
                  : 'Sign in with Google to save & share sessions across users (Free)'
              }
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt=""
                  className="w-4 h-4 rounded-full border border-emerald-400"
                />
              ) : currentUser ? (
                <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              ) : (
                <Cloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span className="hidden md:inline font-bold">
                {currentUser ? currentUser.displayName?.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            <button
              onClick={() => setIsWhyValidModalOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Schedule Rules & Validation Explanation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Settings & Constraints Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsResetConfirmModalOpen(true)}
              className="p-2 text-rose-500/80 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
              title="Reset Everything to Zero & Start Fresh Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700/80 rounded-xl shadow-xs transition cursor-pointer"
              title="Export to Excel, CSV, JSON, or Print"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={rebalanceCurrentSchedule}
              disabled={isGenerating}
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700/60 rounded-xl shadow-xs transition disabled:opacity-40 cursor-pointer"
              title="Rebalance while strictly preserving locked assignments"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Rebalance</span>
            </button>

            <button
              onClick={generateAlternatives}
              disabled={isGenerating}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-98 rounded-xl shadow-md shadow-sky-500/25 border border-white/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isGenerating ? 'Optimizing...' : 'Generate 5 Alternatives'}</span>
              <span className="sm:hidden">{isGenerating ? '...' : 'Solve'}</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Optimized Segmented Glass Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-200/50 dark:border-white/5 py-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-scroll">
          {[
            { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: Calendar },
            { id: 'faculty', label: 'Faculty Management', shortLabel: 'Faculty', icon: Users },
            { id: 'roles', label: 'Role Manager', shortLabel: 'Roles', icon: Award },
            { id: 'period', label: 'Examination Period', shortLabel: 'Period', icon: Clock },
            { id: 'availability', label: 'Availability Matrix', shortLabel: 'Availability', icon: CheckCircle2 },
            { id: 'schedule', label: 'Schedule Views', shortLabel: 'Schedule', icon: FileSpreadsheet },
            { id: 'instructions', label: 'Instructions & Guide', shortLabel: 'Guide', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 text-xs rounded-xl transition duration-200 cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  isActive
                    ? 'bg-sky-600 dark:bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
