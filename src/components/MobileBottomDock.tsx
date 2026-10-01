import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Sparkles,
  MoreHorizontal,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  BookOpen,
  Award,
  X,
  RotateCcw,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { useLenis } from '../context/LenisContext';
import { TabType } from '../types';

export const MobileBottomDock: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    generateAlternatives,
    isGenerating,
    rebalanceCurrentSchedule,
  } = useScheduler();
  const { scrollTo } = useLenis();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
    scrollTo(0, { duration: 0.6 });
  };

  return (
    <>
      {/* Slide-up "More Tabs" Drawer on Mobile */}
      {isMoreMenuOpen && (
        <div
          data-lenis-prevent
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-end animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="w-full apple-glass rounded-t-3xl p-5 shadow-2xl border-t border-white/20 animate-sheet-up space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top drag handle */}
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto shrink-0 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">All Workspaces &amp; Controls</span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleTabSelect('roles')}
                className={`btn-spring p-3 rounded-xl flex items-center space-x-2.5 text-left border ${
                  activeTab === 'roles'
                    ? 'bg-sky-500/15 border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Award className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <div className="font-bold">Role Manager</div>
                  <div className="text-[10px] text-slate-400">Tiers &amp; Caps</div>
                </div>
              </button>

              <button
                onClick={() => handleTabSelect('period')}
                className={`btn-spring p-3 rounded-xl flex items-center space-x-2.5 text-left border ${
                  activeTab === 'period'
                    ? 'bg-sky-500/15 border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-bold">Exam Dates</div>
                  <div className="text-[10px] text-slate-400">Sessions &amp; JRS</div>
                </div>
              </button>

              <button
                onClick={() => handleTabSelect('availability')}
                className={`btn-spring p-3 rounded-xl flex items-center space-x-2.5 text-left border ${
                  activeTab === 'availability'
                    ? 'bg-sky-500/15 border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-bold">Availability</div>
                  <div className="text-[10px] text-slate-400">Leaves &amp; Offs</div>
                </div>
              </button>

              <button
                onClick={() => handleTabSelect('instructions')}
                className={`btn-spring p-3 rounded-xl flex items-center space-x-2.5 text-left border ${
                  activeTab === 'instructions'
                    ? 'bg-sky-500/15 border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-bold">Instructions</div>
                  <div className="text-[10px] text-slate-400">Guidelines &amp; Help</div>
                </div>
              </button>
            </div>

            {/* Quick Rebalance Action */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  rebalanceCurrentSchedule();
                }}
                disabled={isGenerating}
                className="btn-spring w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Rebalance Schedule (Keep Locks)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Floating Bottom Dock */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="md:hidden fixed bottom-3 inset-x-3 z-40 apple-glass rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-white/70 dark:border-white/15 safe-bottom-dock flex items-center justify-between backdrop-blur-2xl"
      >
        <div className="apple-specular-rim" />

        {/* Dashboard Tab */}
        <button
          onClick={() => handleTabSelect('dashboard')}
          className={`btn-spring flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/50 shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Control</span>
        </button>

        {/* Faculty Tab */}
        <button
          onClick={() => handleTabSelect('faculty')}
          className={`btn-spring flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
            activeTab === 'faculty'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/50 shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Faculty</span>
        </button>

        {/* Centerpiece Generate Button */}
        <div className="px-1 shrink-0">
          <button
            onClick={() => {
              generateAlternatives();
              scrollTo(0);
            }}
            disabled={isGenerating}
            className="btn-spring flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/30 border border-white/30 cursor-pointer disabled:opacity-50"
            title="Generate 5 Alternatives"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Schedule Tab */}
        <button
          onClick={() => handleTabSelect('schedule')}
          className={`btn-spring flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
            activeTab === 'schedule'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/50 shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>Schedule</span>
        </button>

        {/* More Tabs Trigger */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`btn-spring flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
            isMoreMenuOpen || ['roles', 'period', 'availability', 'instructions'].includes(activeTab)
              ? 'text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/50 shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
