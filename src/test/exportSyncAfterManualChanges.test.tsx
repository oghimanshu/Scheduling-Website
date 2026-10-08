import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { PrintScheduleModal } from '../components/PrintScheduleModal';
import { DutySlipsModal } from '../components/DutySlipsModal';
import { RoomChartModal } from '../components/RoomChartModal';
import { buildExcelWorkbook, generateScheduleCsvString } from '../services/export/exportManager';
import { ProjectState, Faculty, ExamDateConfig, ExamRoom, Assignment } from '../types';
import { INITIAL_PROJECT_STATE, DEFAULT_DATES_CONFIG, DEFAULT_ROOMS_CONFIG } from '../data/defaultData';
import * as XLSX from 'xlsx';

describe('Export and Print Sync After Manual Swapping and Changes', () => {
  it('reflects manual swapping, duty addition, and room changes across Excel, CSV, and Print formats', () => {
    // 1. Initial State Setup with 2 faculty members and 2 active dates
    const facultyAlpha: Faculty = {
      srNo: 1,
      name: 'Harry Potter',
      isHod: false,
      arrival: 'Morning',
      targetSupervisions: 4,
      maxSupervisions: 6,
      previousSupervisions: 0,
    };

    const facultyBeta: Faculty = {
      srNo: 2,
      name: 'Hermione Granger',
      isHod: false,
      arrival: 'Morning',
      targetSupervisions: 4,
      maxSupervisions: 6,
      previousSupervisions: 0,
    };

    const activeDates: ExamDateConfig[] = [
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
      {
        date: '2026-10-07',
        displayDate: '07 Oct 2026',
        dayOfWeek: 'Wednesday',
        isExcluded: false,
        sessionRequirements: { 'JRS 1': 1, 'JRS 2': 1, 'JRS 3': 0 },
        sessionTimings: {
          'JRS 1': { start: '08:00', end: '10:00' },
          'JRS 2': { start: '10:30', end: '12:30' },
          'JRS 3': { start: '14:00', end: '16:00' },
        },
      },
    ];

    // Initial Assignments:
    // Harry (Sr 1) has JRS 1 on 2026-10-06
    // Hermione (Sr 2) has JRS 2 on 2026-10-06
    const initialAssignments: Assignment[] = [
      {
        id: '1-2026-10-06-JRS 1',
        facultySrNo: 1,
        date: '2026-10-06',
        session: 'JRS 1',
        isLocked: false,
        isReserve: false,
        isOverride: false,
      },
      {
        id: '2-2026-10-06-JRS 2',
        facultySrNo: 2,
        date: '2026-10-06',
        session: 'JRS 2',
        isLocked: false,
        isReserve: false,
        isOverride: false,
      },
    ];

    // After manual swap & addition:
    // Harry (Sr 1) swapped from JRS 1 to JRS 2 on 2026-10-06 and assigned room-101
    // Hermione (Sr 2) swapped from JRS 2 to JRS 1 on 2026-10-06
    // Harry also manually assigned extra duty on 2026-10-07 JRS 1
    const modifiedAssignments: Assignment[] = [
      {
        id: '1-2026-10-06-JRS 2',
        facultySrNo: 1,
        date: '2026-10-06',
        session: 'JRS 2',
        roomId: 'room-101',
        roomName: 'Hall 101 (Academic Block A)',
        isLocked: false,
        isReserve: false,
        isOverride: false,
      },
      {
        id: '2-2026-10-06-JRS 1',
        facultySrNo: 2,
        date: '2026-10-06',
        session: 'JRS 1',
        isLocked: false,
        isReserve: false,
        isOverride: false,
      },
      {
        id: '1-2026-10-07-JRS 1',
        facultySrNo: 1,
        date: '2026-10-07',
        session: 'JRS 1',
        isLocked: false,
        isReserve: false,
        isOverride: false,
      },
    ];

    const projectStateAfterManualChanges: ProjectState = {
      ...INITIAL_PROJECT_STATE,
      faculty: [facultyAlpha, facultyBeta],
      examPeriod: {
        name: 'End Semester Examinations',
        startDate: '2026-10-06',
        endDate: '2026-10-07',
        dates: activeDates,
      },
      rooms: DEFAULT_ROOMS_CONFIG,
      assignments: modifiedAssignments,
    };

    const latestProjectState = projectStateAfterManualChanges;

    // 2. VERIFY EXCEL EXPORT REFLECTS MANUAL SWAP & ADDITION
    const workbook = buildExcelWorkbook(latestProjectState);
    expect(workbook.SheetNames).toContain('Faculty Schedule');
    expect(workbook.SheetNames).toContain('Session Rosters');
    expect(workbook.SheetNames).toContain('Workload Analysis');

    // Check Sheet 1 (Faculty Schedule)
    const facultySheetData = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets['Faculty Schedule']);
    const harryRowExcel = facultySheetData.find((r) => r['Faculty Name'] === 'Harry Potter');
    const hermioneRowExcel = facultySheetData.find((r) => r['Faculty Name'] === 'Hermione Granger');

    expect(harryRowExcel).toBeDefined();
    expect(hermioneRowExcel).toBeDefined();

    // After swap: Harry has JRS 2 (with Hall 101) on 06 Oct 2026
    expect(harryRowExcel!['06 Oct 2026']).toContain('JRS 2');
    expect(harryRowExcel!['06 Oct 2026']).toContain('Hall 101');
    // Harry also has newly added duty JRS 1 on 07 Oct 2026
    expect(harryRowExcel!['07 Oct 2026']).toContain('JRS 1');
    expect(harryRowExcel!['Total']).toBe(2);

    // After swap: Hermione has JRS 1 on 06 Oct 2026
    expect(hermioneRowExcel!['06 Oct 2026']).toContain('JRS 1');
    expect(hermioneRowExcel!['Total']).toBe(1);

    // Check Sheet 2 (Session Rosters)
    const sessionSheetData = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets['Session Rosters']);
    const jrs1Oct6 = sessionSheetData.find((r) => r['Date'] === '06 Oct 2026' && r['Session'] === 'JRS 1');
    const jrs2Oct6 = sessionSheetData.find((r) => r['Date'] === '06 Oct 2026' && r['Session'] === 'JRS 2');

    // JRS 1 now has Hermione Granger
    expect(jrs1Oct6!['Supervisors']).toContain('Hermione Granger');
    // JRS 2 now has Harry Potter with Hall 101
    expect(jrs2Oct6!['Supervisors']).toContain('Harry Potter [Hall 101]');

    // 3. VERIFY CSV EXPORT REFLECTS MANUAL SWAP & ADDITION
    const csvString = generateScheduleCsvString(latestProjectState);

    // Harry Potter line has JRS 2 and JRS 1
    expect(csvString).toContain('Harry Potter');
    expect(csvString).toContain('Hermione Granger');
    expect(csvString).toContain('JRS 2 [Hall 101]');
    expect(csvString).toContain('JRS 1');

    // 4. VERIFY MASTER SCHEDULE PRINT MODAL REFLECTS MANUAL SWAP & ADDITION
    const printMasterHtml = renderToString(
      <SchedulerProvider initialProjectState={latestProjectState}>
        <PrintScheduleModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(printMasterHtml).toContain('Harry Potter');
    expect(printMasterHtml).toContain('Hermione Granger');
    expect(printMasterHtml).toContain('Hall 101');
    expect(printMasterHtml).toContain('JRS 2');
    expect(printMasterHtml).toContain('JRS 1');

    // 5. VERIFY DUTY SLIPS PRINT MODAL REFLECTS MANUAL SWAP & ADDITION
    const dutySlipsHtml = renderToString(
      <SchedulerProvider initialProjectState={latestProjectState}>
        <DutySlipsModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(dutySlipsHtml).toContain('Invigilation Duty Appointment Order &amp; Schedule');
    expect(dutySlipsHtml).toContain('Harry Potter');
    expect(dutySlipsHtml).toContain('Hermione Granger');
    expect(dutySlipsHtml).toContain('Hall 101');

    // 6. VERIFY NOTICEBOARD ROOM CHART REFLECTS MANUAL SWAP & ROOM ASSIGNMENT
    const roomChartHtml = renderToString(
      <SchedulerProvider initialProjectState={latestProjectState}>
        <RoomChartModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(roomChartHtml).toContain('Noticeboard Room-wise Invigilation Chart');
    expect(roomChartHtml).toContain('Harry Potter');
  });
});
