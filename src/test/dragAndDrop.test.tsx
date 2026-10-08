import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { FileDropZone } from '../components/FileDropZone';
import { GlobalFileDropzone } from '../components/GlobalFileDropzone';
import { RoleManagerView } from '../components/RoleManagerView';
import { ScheduleViewer } from '../components/ScheduleViewer';
import { Dashboard } from '../components/Dashboard';
import { QuickstartWizardModal } from '../components/QuickstartWizardModal';

function CrossDateTransferTester() {
  const { project, atomicTransferOrSwapDuty, addOrUpdateAssignment, updateFacultyList } = useScheduler();
  const [testResult, setTestResult] = React.useState<string>('idle');

  React.useEffect(() => {
    // Setup 2 mock faculties
    updateFacultyList([
      { srNo: 1, name: 'Faculty Alpha', isHod: false, arrival: 'Morning', targetSupervisions: 4, maxSupervisions: 6, previousSupervisions: 0 },
      { srNo: 2, name: 'Faculty Beta', isHod: false, arrival: 'Morning', targetSupervisions: 4, maxSupervisions: 6, previousSupervisions: 0 },
    ]);

    // Add assignment for Alpha on 2026-10-10 session JRS 1
    addOrUpdateAssignment(1, '2026-10-10', 'JRS 1');
  }, []);

  const handleTestMove = () => {
    const srcId = '1-2026-10-10-JRS 1';
    // Move Alpha's duty to a different date: 2026-10-12 session JRS 2
    const res = atomicTransferOrSwapDuty(srcId, 1, 'replace', false, undefined, false, '2026-10-12', 'JRS 2');
    setTestResult(res.success ? 'success' : 'failed');
  };

  return (
    <div>
      <div id="result">{testResult}</div>
      <button onClick={handleTestMove} id="move-btn">Move Duty</button>
      <div id="assignments-count">{project.assignments.length}</div>
    </div>
  );
}

describe('Drag and Drop Functionality & Components', () => {
  it('renders FileDropZone component with custom labels and format hints', () => {
    const html = renderToString(
      <FileDropZone
        title="Drop Faculty CSV Here"
        description="or click to browse from your device"
        supportedFormatsText="Requires columns: Sr. No., Faculty Name, HOD, Arrival"
        onFileLoaded={() => {}}
      />
    );
    expect(html).toContain('Drop Faculty CSV Here');
    expect(html).toContain('Requires columns: Sr. No., Faculty Name, HOD, Arrival');
  });

  it('renders GlobalFileDropzone component inside SchedulerProvider', () => {
    const html = renderToString(
      <SchedulerProvider>
        <GlobalFileDropzone />
      </SchedulerProvider>
    );
    expect(html).toBeDefined();
  });

  it('renders Drag & Drop Role Target Bar in RoleManagerView', () => {
    const html = renderToString(
      <SchedulerProvider>
        <RoleManagerView />
      </SchedulerProvider>
    );
    expect(html).toContain('Drag &amp; Drop Role Target Bar:');
    expect(html).toContain('Drop or Click');
  });

  it('renders FileDropZone inside QuickstartWizardModal', () => {
    const html = renderToString(
      <SchedulerProvider>
        <QuickstartWizardModal forceOpen />
      </SchedulerProvider>
    );
    expect(html).toContain('Drop Faculty CSV Here');
  });

  it('renders FileDropZone in Dashboard when starting with empty faculty', () => {
    const html = renderToString(
      <SchedulerProvider>
        <Dashboard />
      </SchedulerProvider>
    );
    expect(html).toContain('Plug &amp; Play: Drop Faculty CSV or Project JSON Here');
  });

  it('renders ScheduleViewer cleanly in session view mode', () => {
    const html = renderToString(
      <SchedulerProvider>
        <ScheduleViewer viewModeOverride="session" />
      </SchedulerProvider>
    );
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(50);
  });
});
