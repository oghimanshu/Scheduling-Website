import React, { useEffect } from 'react';
import { SchedulerProvider, useScheduler } from './context/SchedulerContext';
import { LenisProvider, useLenis } from './context/LenisContext';
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
import { MobileBottomDock } from './components/MobileBottomDock';
import { AcademicConstellation } from './components/AcademicConstellation';
import { CherryBlossomBackground } from './components/CherryBlossomBackground';
import { LiquidClickRipple } from './components/LiquidClickRipple';
import { SolverTelemetryModal } from './components/SolverTelemetryModal';
import { LetterheadCustomizerModal } from './components/LetterheadCustomizerModal';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { QuickstartWizardModal } from './components/QuickstartWizardModal';
import { GlobalFileDropzone } from './components/GlobalFileDropzone';
import { RoomManager } from './components/RoomManager';
import { RoomChartModal } from './components/RoomChartModal';

const AppContent: React.FC = () => {
  const {
    activeTab,
    selectedForSubstitute,
    isSubstituteModalOpen,
    setIsSubstituteModalOpen,
  } = useScheduler();
  const { scrollTo } = useLenis();

  // Smooth scroll to top when changing views via Lenis
  useEffect(() => {
    scrollTo(0, { duration: 0.7 });
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      {/* Global Universal File Drag & Drop Receiver */}
      <GlobalFileDropzone />

      {/* Global Hardware-Accelerated Liquid Click Ripple */}
      <LiquidClickRipple />

      {/* Dynamic Academic Graph Orbitals & Mathematical Constellation Network */}
      <AcademicConstellation />

      {/* Dark Mode Cherry Blossom Drifting Petals Ambient Effect */}
      <CherryBlossomBackground />

      {/* Apple VisionOS Ambient Radial Glow Orbs with Floating Motion */}
      <div className="ambient-glow-orbs no-print print:hidden fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Top-Left Sky Blue Glow */}
        <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-sky-400/25 via-blue-500/20 to-transparent dark:from-sky-500/20 dark:via-blue-600/15 dark:to-transparent blur-[120px] transform-gpu animate-float-slow" />
        {/* Top-Right Indigo/Violet Glow */}
        <div className="absolute top-1/6 -right-40 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-indigo-500/25 via-purple-500/20 to-transparent dark:from-indigo-600/20 dark:via-purple-700/15 dark:to-transparent blur-[130px] transform-gpu animate-float-reverse" />
        {/* Mid-Left Warm Violet Accent */}
        <div className="absolute top-1/2 -left-20 w-[26rem] h-[26rem] rounded-full bg-gradient-to-tr from-violet-400/15 via-fuchsia-400/10 to-transparent dark:from-violet-600/10 dark:via-purple-800/10 dark:to-transparent blur-[100px] transform-gpu animate-float-slow" />
        {/* Bottom Center Teal/Cyan Subsurface Glow */}
        <div className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tr from-teal-400/15 via-sky-300/15 to-transparent dark:from-teal-600/12 dark:via-sky-700/10 dark:to-transparent blur-[120px] transform-gpu animate-float-reverse" />
      </div>

      {/* Navbar with tabs and quick status */}
      <Navbar />

      {/* Main Container with Smooth View Transitions & Mobile Bottom Dock Clearance */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-6 relative z-10">
        <div key={activeTab} className="animate-tab-enter">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'faculty' && <FacultyManager />}
          {activeTab === 'roles' && <RoleManagerView />}
          {activeTab === 'period' && <ExamPeriodManager />}
          {activeTab === 'rooms' && <RoomManager />}
          {activeTab === 'availability' && <AvailabilityManager />}
          {activeTab === 'schedule' && <ScheduleViewer />}
          {activeTab === 'instructions' && <InstructionsView />}
        </div>
      </main>

      {/* Mobile Floating Action Dock for Single-Thumb Control */}
      <MobileBottomDock />

      {/* Footer with Liquid Glass styling & Himanshu Gaur Attribution */}
      <footer className="apple-glass border-t border-slate-200/70 dark:border-white/10 py-5 mt-auto relative z-10 pb-20 md:pb-5 no-print print:hidden">
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
      <RoomChartModal />
      <LetterheadCustomizerModal />
      <PrintScheduleModal />
      <GenerationOptionsModal />
      <GoogleAuthModal />
      <QuickstartWizardModal />
      <SubstituteModal
        assignment={selectedForSubstitute}
        isOpen={isSubstituteModalOpen}
        onClose={() => setIsSubstituteModalOpen(false)}
      />
      <SolverTelemetryModal />
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <SchedulerProvider>
        <LenisProvider>
          <AppContent />
        </LenisProvider>
      </SchedulerProvider>
    </ErrorBoundary>
  );
}

export default App;
