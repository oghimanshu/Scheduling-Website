import React from 'react';
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
  } = useScheduler();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  EXAMINATION SUPERVISION SCHEDULER
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                  College Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-2">
                <span>Auto-saved locally</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">Last saved: {lastSaved}</span>
              </p>
            </div>
          </div>

          {/* Center: Validation badge */}
          <div className="hidden lg:flex items-center space-x-2">
            {validation.isValid ? (
              <button
                onClick={() => setIsWhyValidModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition text-xs font-medium cursor-pointer"
                title="Click to see why this schedule is valid"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Valid Schedule ({validation.totalFilledPositions}/{validation.totalRequiredPositions} filled)
                </span>
                <span className="underline ml-1 font-semibold text-emerald-800">Why valid?</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>
                  {validation.hardConflictsCount > 0
                    ? `${validation.hardConflictsCount} Hard Conflict(s)`
                    : `${validation.unfilledPositions} Unfilled Slot(s)`}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsWhyValidModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Schedule Rules & Validation Explanation"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Settings & Firebase Config"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Export to Excel, CSV, JSON, or Print"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export</span>
            </button>

            <button
              onClick={rebalanceCurrentSchedule}
              disabled={isGenerating}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition disabled:opacity-50"
              title="Rebalance while strictly preserving locked assignments"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Rebalance</span>
            </button>

            <button
              onClick={generateAlternatives}
              disabled={isGenerating}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm shadow-sky-600/30 transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Optimizing...' : 'Generate 5 Alternatives'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-100 pt-1 -mb-px">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Calendar },
            { id: 'faculty', label: 'Faculty Management', icon: Users },
            { id: 'period', label: 'Examination Period', icon: Clock },
            { id: 'availability', label: 'Availability Matrix', icon: CheckCircle2 },
            { id: 'schedule', label: 'Schedule Views', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                  isActive
                    ? 'border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-md font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
