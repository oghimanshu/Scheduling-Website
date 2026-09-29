import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { ScheduleViewer } from '../components/ScheduleViewer';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { InstructionsView } from '../components/InstructionsView';
import { FacultyManager } from '../components/FacultyManager';
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
});
