import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { SchedulerProvider, useScheduler } from './context/SchedulerContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { FacultyManager } from './components/FacultyManager';
import { ExamPeriodManager } from './components/ExamPeriodManager';
import { AvailabilityManager } from './components/AvailabilityManager';
import { ScheduleViewer } from './components/ScheduleViewer';
import { AlternativesModal } from './components/AlternativesModal';
import { WhyValidModal } from './components/WhyValidModal';
import { AssignmentInspectorModal } from './components/AssignmentInspectorModal';
import { ManualEditModal } from './components/ManualEditModal';
import { InfeasibilityModal } from './components/InfeasibilityModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ReassignHodsModal } from './components/ReassignHodsModal';
import { SessionManagerModal } from './components/SessionManagerModal';
import { InstructionsView } from './components/InstructionsView';
import { ResetSessionConfirmModal } from './components/ResetSessionConfirmModal';
import { RoleSegregationModal } from './components/RoleSegregationModal';
import { DutySlipsModal } from './components/DutySlipsModal';
import { RoleManagerView } from './components/RoleManagerView';
import { GenerationOptionsModal } from './components/GenerationOptionsModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { SubstituteModal } from './components/SubstituteModal';

const AppContent: React.FC = () => {
  const {
    activeTab,
    selectedForSubstitute,
    isSubstituteModalOpen,
    setIsSubstituteModalOpen,
  } = useScheduler();

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.25,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Smooth scroll to top when changing views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      {/* Apple-style Chromatic Ambient Glow Orbs with Gentle Floating Motion */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-400/20 to-blue-500/15 dark:from-sky-500/15 dark:to-indigo-500/15 blur-3xl transform-gpu animate-float-slow"></div>
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-gradient-to-bl from-indigo-400/20 to-purple-400/15 dark:from-indigo-600/15 dark:to-purple-700/15 blur-3xl transform-gpu animate-float-reverse"></div>
        <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-cyan-400/15 to-sky-300/15 dark:from-teal-500/10 dark:to-blue-600/10 blur-3xl transform-gpu animate-float-slow"></div>
      </div>

      {/* Navbar with tabs and quick status */}
      <Navbar />

      {/* Main Container with Smooth View Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10">
        <div key={activeTab} className="animate-tab-enter">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'faculty' && <FacultyManager />}
          {activeTab === 'roles' && <RoleManagerView />}
          {activeTab === 'period' && <ExamPeriodManager />}
          {activeTab === 'availability' && <AvailabilityManager />}
          {activeTab === 'schedule' && <ScheduleViewer />}
          {activeTab === 'instructions' && <InstructionsView />}
        </div>
      </main>

      {/* Footer with Liquid Glass styling & Himanshu Gaur Attribution */}
      <footer className="apple-glass border-t border-slate-200/70 dark:border-white/10 py-5 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 text-center sm:text-left">
            <span className="font-bold text-slate-800 dark:text-slate-100">Examination Supervision Scheduler</span>
            <span className="hidden sm:inline">•</span>
            <span>Constraint-Based Mathematical Duty Allocation Engine</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
              <span className="text-slate-600 dark:text-slate-300">
                Designed &amp; Developed by{' '}
                <strong className="font-bold text-sky-700 dark:text-sky-300">
                  Himanshu Gaur
                </strong>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <AlternativesModal />
      <WhyValidModal />
      <AssignmentInspectorModal />
      <ManualEditModal />
      <InfeasibilityModal />
      <ExportModal />
      <SettingsModal />
      <ReassignHodsModal />
      <SessionManagerModal />
      <ResetSessionConfirmModal />
      <RoleSegregationModal />
      <DutySlipsModal />
      <GenerationOptionsModal />
      <GoogleAuthModal />
      <SubstituteModal
        assignment={selectedForSubstitute}
        isOpen={isSubstituteModalOpen}
        onClose={() => setIsSubstituteModalOpen(false)}
      />
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <SchedulerProvider>
        <AppContent />
      </SchedulerProvider>
    </ErrorBoundary>
  );
}

export default App;
