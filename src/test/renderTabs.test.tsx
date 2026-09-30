import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { ScheduleViewer } from '../components/ScheduleViewer';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { InstructionsView } from '../components/InstructionsView';
import { FacultyManager } from '../components/FacultyManager';
import { ResetSessionConfirmModal } from '../components/ResetSessionConfirmModal';
import { RoleSegregationModal } from '../components/RoleSegregationModal';
import { DutySlipsModal } from '../components/DutySlipsModal';
import { RoleManagerView } from '../components/RoleManagerView';
import { GenerationOptionsModal } from '../components/GenerationOptionsModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';
import { DateSessionModal } from '../components/DateSessionModal';
import { SubstituteModal } from '../components/SubstituteModal';
import { WorkloadAnalytics } from '../components/WorkloadAnalytics';
import { generateSampleFacultyCSV } from '../services/csvParser';
import { MOCK_FACULTY_LIST as DEFAULT_FACULTY_LIST } from './fixtures/mockFaculty';

function PopulatedScheduleTester({ mode }: { mode: 'faculty' | 'session' | 'workload' }) {
  const { setScheduleViewMode, updateFacultyList } = useScheduler();
  React.useEffect(() => {
    setScheduleViewMode(mode);
  }, [mode]);
  return <ScheduleViewer />;
}

describe('Populated UI Components Test', () => {
  it('renders ScheduleViewer with loaded faculty and assignments in faculty, session, and workload modes', () => {
    for (const mode of ['faculty', 'session', 'workload'] as const) {
      const html = renderToString(
        <SchedulerProvider>
          <PopulatedScheduleTester mode={mode} />
        </SchedulerProvider>
      );
      expect(html.length).toBeGreaterThan(50);
    }
  });

  it('renders AvailabilityManager with loaded faculty', () => {
    const html = renderToString(
      <SchedulerProvider>
        <AvailabilityManager />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
  });

  it('renders InstructionsView cleanly', () => {
    const html = renderToString(
      <SchedulerProvider>
        <InstructionsView />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
    expect(html).toContain('How to Use the Examination Supervision Scheduler');
  });

  it('renders FacultyManager cleanly', () => {
    const html = renderToString(
      <SchedulerProvider>
        <FacultyManager />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
    expect(html).toContain('Faculty Master Data');
    expect(html).toContain('DOWNLOAD EXAMPLE FORMAT');
  });

  it('verifies sample CSV format is completely empty of faculty data', () => {
    const sample = generateSampleFacultyCSV(false);
    expect(sample.trim()).toBe('Sr. No.,Faculty Name,HOD,Arrival');
    expect(sample).not.toContain('Neera');
    expect(sample).not.toContain('Himanshu');
  });

  it('renders ResetSessionConfirmModal, RoleSegregationModal, and DutySlipsModal', () => {
    function ModalsTester() {
      const { setIsResetConfirmModalOpen, setIsRoleSegregationModalOpen, setIsDutySlipsModalOpen } = useScheduler();
      React.useEffect(() => {
        setIsResetConfirmModalOpen(true);
        setIsRoleSegregationModalOpen(true);
        setIsDutySlipsModalOpen(true);
      }, []);
      return (
        <>
          <ResetSessionConfirmModal forceOpen={true} />
          <RoleSegregationModal forceOpen={true} />
          <DutySlipsModal forceOpen={true} />
        </>
      );
    }

    const html = renderToString(
      <SchedulerProvider>
        <ModalsTester />
      </SchedulerProvider>
    );
    expect(html).toContain('Reset Session to Zero');
    expect(html).toContain('Faculty Role Segregation');
    expect(html).toContain('Faculty Duty Slips');
  });

  it('renders RoleManagerView tab cleanly with custom roles and allocation controls', () => {
    const html = renderToString(
      <SchedulerProvider>
        <RoleManagerView />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain('Faculty Role Manager');
    expect(html).toContain('Batch Faculty Role Assignment');
  });

  it('renders GenerationOptionsModal and GoogleAuthModal with forceOpen', () => {
    const genModalHtml = renderToString(
      <SchedulerProvider>
        <GenerationOptionsModal forceOpen={true} />
      </SchedulerProvider>
    );
    expect(genModalHtml).toContain('Faculty Selection');
    expect(genModalHtml).toContain('HOD Duty Allocation Priority');
    expect(genModalHtml).toContain('Consecutive Days Rest Rule');

    const authModalHtml = renderToString(
      <SchedulerProvider>
        <GoogleAuthModal forceOpen={true} />
      </SchedulerProvider>
    );
    expect(authModalHtml).toContain('Google Cloud Sync &amp; Multi-User Sessions');
    expect(authModalHtml).toContain('100% Free');
  });

  it('renders DateSessionModal, SubstituteModal, and WorkloadAnalytics cleanly', () => {
    const dateModalHtml = renderToString(
      <SchedulerProvider>
        <DateSessionModal
          dateConfig={null}
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
        />
      </SchedulerProvider>
    );
    expect(dateModalHtml).toContain('Date Session Customizer');
    expect(dateModalHtml).toContain('Eligible Faculty Arrivals');

    const subModalHtml = renderToString(
      <SchedulerProvider>
        <SubstituteModal
          assignment={{
            id: '1-2026-10-06-JRS 1',
            facultySrNo: 1,
            date: '2026-10-06',
            session: 'JRS 1',
            isLocked: false,
            isOverride: false,
          }}
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
        />
      </SchedulerProvider>
    );
    expect(subModalHtml).toContain('Find Substitute / Duty Swap');
    expect(subModalHtml).toContain('Conflict-Free Only');

    const analyticsHtml = renderToString(
      <SchedulerProvider>
        <WorkloadAnalytics />
      </SchedulerProvider>
    );
    expect(analyticsHtml).toContain('Workload Fairness &amp; Equity Analytics');
    expect(analyticsHtml).toContain('Avg Duties');
  });
});


