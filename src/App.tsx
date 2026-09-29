import React from 'react';
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

const AppContent: React.FC = () => {
  const { activeTab } = useScheduler();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Navbar with tabs and quick status */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'faculty' && <FacultyManager />}
        {activeTab === 'period' && <ExamPeriodManager />}
        {activeTab === 'availability' && <AvailabilityManager />}
        {activeTab === 'schedule' && <ScheduleViewer />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Examination Supervision Scheduler</span>
            <span>•</span>
            <span>Constraint-Based Mathematical Duty Allocation Engine</span>
          </div>
          <div className="text-[11px] text-slate-400">
            College Academic & Examination Administration Portal
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
    </div>
  );
};

export function App() {
  return (
    <SchedulerProvider>
      <AppContent />
    </SchedulerProvider>
  );
}

export default App;
