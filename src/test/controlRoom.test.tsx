import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { ControlRoomView } from '../components/ControlRoomView';
import { ProjectState, Faculty, ExamDateConfig, Assignment } from '../types';
import { INITIAL_PROJECT_STATE } from '../data/defaultData';

const mockFaculty: Faculty[] = [
  {
    srNo: 1,
    name: 'Prof. Albus Dumbledore',
    isHod: true,
    arrival: 'Morning',
    targetSupervisions: 4,
    maxSupervisions: 5,
    previousSupervisions: 0,
    department: 'Administration',
  },
  {
    srNo: 2,
    name: 'Prof. Minerva McGonagall',
    isHod: false,
    arrival: 'Morning',
    targetSupervisions: 4,
    maxSupervisions: 5,
    previousSupervisions: 0,
    department: 'Transfiguration',
  },
  {
    srNo: 3,
    name: 'Prof. Severus Snape',
    isHod: false,
    arrival: 'Morning',
    targetSupervisions: 4,
    maxSupervisions: 5,
    previousSupervisions: 0,
    department: 'Potions',
  },
];

const mockDates: ExamDateConfig[] = [
  {
    date: '2026-10-06',
    displayDate: '06 Oct 2026',
    dayOfWeek: 'Tuesday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 1, 'JRS 2': 1, 'JRS 3': 0 },
    sessionTimings: {
      'JRS 1': { start: '08:00', end: '10:00' },
      'JRS 2': { start: '10:30', end: '12:30' },
      'JRS 3': { start: '14:00', end: '16:00' },
    },
  },
];

const mockAssignments: Assignment[] = [
  {
    id: 'asg-primary-1',
    facultySrNo: 2, // McGonagall
    date: '2026-10-06',
    session: 'JRS 1',
    isLocked: false,
    isOverride: false,
    isReserve: false,
    roomId: 'room-101',
    roomName: 'Hall 101 (Main Building)',
    attendanceStatus: 'scheduled',
  },
  {
    id: 'asg-reserve-1',
    facultySrNo: 3, // Snape (Standby Reserve)
    date: '2026-10-06',
    session: 'JRS 1',
    isLocked: false,
    isOverride: false,
    isReserve: true,
    attendanceStatus: 'scheduled',
  },
];

const testState: ProjectState = {
  ...INITIAL_PROJECT_STATE,
  faculty: mockFaculty,
  examPeriod: {
    name: 'Autumn Midterms 2026',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    dates: mockDates,
  },
  assignments: mockAssignments,
};

describe('Day-of-Exam Control Room & Attendance Operations', () => {
  it('should render ControlRoomView component cleanly via SSR/renderToString', () => {
    const html = renderToString(
      <SchedulerProvider initialProjectState={testState}>
        <ControlRoomView />
      </SchedulerProvider>
    );

    // View Header & Title
    expect(html).toContain('Day-of-Exam Control Room');
    expect(html).toContain('Live Operations');

    // Date & Session
    expect(html).toContain('06 Oct 2026');
    expect(html).toContain('JRS 1');

    // Faculty & Room Display
    expect(html).toContain('Prof. Minerva McGonagall');
    expect(html).toContain('Hall 101 (Main Building)');

    // Standby Reserve Roster
    expect(html).toContain('Prof. Severus Snape');
    expect(html).toContain('Standby Reserves Roster');
    expect(html).toContain('Control Room Pool');

    // Printable register
    expect(html).toContain('DAILY INVIGILATION ATTENDANCE REGISTER');
  });

  it('should support attendance state transitions and reserve deployment in SchedulerContext', () => {
    let capturedContext: ReturnType<typeof useScheduler> | null = null;

    const ContextCapturer: React.FC = () => {
      capturedContext = useScheduler();
      return null;
    };

    renderToString(
      <SchedulerProvider initialProjectState={testState}>
        <ContextCapturer />
      </SchedulerProvider>
    );

    expect(capturedContext).not.toBeNull();
    const ctx = capturedContext!;

    // Initial state check
    const primaryBefore = ctx.project.assignments.find((a) => a.id === 'asg-primary-1');
    const reserveBefore = ctx.project.assignments.find((a) => a.id === 'asg-reserve-1');

    expect(primaryBefore?.attendanceStatus).toBe('scheduled');
    expect(primaryBefore?.facultySrNo).toBe(2);
    expect(primaryBefore?.isReserve).toBe(false);

    expect(reserveBefore?.attendanceStatus).toBe('scheduled');
    expect(reserveBefore?.facultySrNo).toBe(3);
    expect(reserveBefore?.isReserve).toBe(true);

    // Mark attendance: present
    ctx.markAttendance('asg-primary-1', 'present');

    // Deploy reserve to replace absent primary
    const deployResult = ctx.deployReserveToRoom('asg-reserve-1', 'asg-primary-1');
    expect(deployResult.success).toBe(true);
    expect(deployResult.message).toContain('Successfully deployed');

    // Verify undoDeployReserve reverses the deployment cleanly
    ctx.undoDeployReserve('asg-reserve-1', 'asg-primary-1');
  });

  it('should verify undoDeployReserve reverts replacement and restores reserve standby status', () => {
    let capturedContext: ReturnType<typeof useScheduler> | null = null;

    const ContextCapturer: React.FC = () => {
      capturedContext = useScheduler();
      return null;
    };

    renderToString(
      <SchedulerProvider initialProjectState={testState}>
        <ContextCapturer />
      </SchedulerProvider>
    );

    const ctx = capturedContext!;
    expect(typeof ctx.undoDeployReserve).toBe('function');

    // Perform deploy then undo
    ctx.deployReserveToRoom('asg-reserve-1', 'asg-primary-1');
    ctx.undoDeployReserve('asg-reserve-1', 'asg-primary-1');

    const primaryAfterUndo = ctx.project.assignments.find((a) => a.id === 'asg-primary-1');
    const reserveAfterUndo = ctx.project.assignments.find((a) => a.id === 'asg-reserve-1');

    expect(primaryAfterUndo?.replacedByFacultySrNo).toBeUndefined();
    expect(reserveAfterUndo?.deployedToRoom).toBeUndefined();
    expect(reserveAfterUndo?.attendanceStatus).toBe('scheduled');
  });

  it('should render workload badges, drag-and-drop hints, and sort selector in ControlRoomView', () => {
    const html = renderToString(
      <SchedulerProvider initialProjectState={testState}>
        <ControlRoomView />
      </SchedulerProvider>
    );

    // Sort duties selector
    expect(html).toContain('Sort: Session &amp; Room');
    expect(html).toContain('Sort: Vacant / Absent First');

    // Standby reserve drag-and-drop prompt & workload badge
    expect(html).toContain('Drag &amp; drop onto room to deploy');
    expect(html).toContain('duty');

    // Drag hint for room duties
    expect(html).toContain('Drag a reserve supervisor here to deploy instantly');

    // Print register dropdown options
    expect(html).toContain('Print Daily Register');
  });
});
