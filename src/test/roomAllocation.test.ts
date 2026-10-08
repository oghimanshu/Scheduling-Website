import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  parseRoomsCSV,
  generateSampleRoomsCSV,
  allocateRoomsToAssignmentList,
} from '../services/roomParser';
import { generateIcsCalendar } from '../services/calendarService';
import { ExamRoom, Assignment, Faculty, ExamDateConfig } from '../types';
import { SchedulerProvider } from '../context/SchedulerContext';
import { RoomManager } from '../components/RoomManager';
import { RoomChartModal } from '../components/RoomChartModal';

describe('Room & Hall Management and Allocation Tests', () => {
  it('parses valid rooms CSV accurately with custom headers', () => {
    const csvData = `Room Name,Building,Floor,Capacity,Invigilators,Active
Hall 101,Block A,1st Floor,35,1,Yes
LT-1,Science Complex,Ground Floor,70,2,Yes
Seminar Hall,Central Block,2nd Floor,50,1,No`;

    const result = parseRoomsCSV(csvData);
    expect(result.success).toBe(true);
    expect(result.rooms.length).toBe(3);

    const hall101 = result.rooms[0];
    expect(hall101.name).toBe('Hall 101');
    expect(hall101.block).toBe('Block A');
    expect(hall101.floor).toBe('1st Floor');
    expect(hall101.capacity).toBe(35);
    expect(hall101.invigilatorsRequired).toBe(1);
    expect(hall101.isActive).toBe(true);

    const lt1 = result.rooms[1];
    expect(lt1.capacity).toBe(70);
    expect(lt1.invigilatorsRequired).toBe(2);

    const seminar = result.rooms[2];
    expect(seminar.isActive).toBe(false);
  });

  it('generates a valid sample rooms CSV string', () => {
    const sample = generateSampleRoomsCSV();
    expect(sample).toContain('Room Number / Name');
    expect(sample).toContain('Hall 101');
    expect(sample).toContain('Lecture Theatre 1 (LT-1)');

    const parseSample = parseRoomsCSV(sample);
    expect(parseSample.success).toBe(true);
    expect(parseSample.rooms.length).toBeGreaterThan(5);
  });

  it('distributes rooms to primary assignments and routes reserve duties to control desk', () => {
    const mockRooms: ExamRoom[] = [
      { id: 'r1', name: 'Room 101', block: 'Block A', capacity: 30, invigilatorsRequired: 1, isActive: true },
      { id: 'r2', name: 'Room 102', block: 'Block A', capacity: 30, invigilatorsRequired: 1, isActive: true },
      { id: 'r3', name: 'LT-1', block: 'Science Wing', capacity: 60, invigilatorsRequired: 2, isActive: true },
    ];

    const mockAssignments: Assignment[] = [
      { id: '1-2026-10-10-JRS 1', facultySrNo: 1, date: '2026-10-10', session: 'JRS 1', isLocked: false, isOverride: false, isReserve: false },
      { id: '2-2026-10-10-JRS 1', facultySrNo: 2, date: '2026-10-10', session: 'JRS 1', isLocked: false, isOverride: false, isReserve: false },
      { id: '3-2026-10-10-JRS 1', facultySrNo: 3, date: '2026-10-10', session: 'JRS 1', isLocked: false, isOverride: false, isReserve: false },
      { id: '4-2026-10-10-JRS 1', facultySrNo: 4, date: '2026-10-10', session: 'JRS 1', isLocked: false, isOverride: false, isReserve: false },
      { id: '5-2026-10-10-JRS 1', facultySrNo: 5, date: '2026-10-10', session: 'JRS 1', isLocked: false, isOverride: false, isReserve: true },
    ];

    const allocated = allocateRoomsToAssignmentList(mockAssignments, mockRooms);

    // Primary supervisor 1 -> Room 101
    expect(allocated[0].roomId).toBe('r1');
    expect(allocated[0].roomName).toBe('Room 101 (Block A)');

    // Primary supervisor 2 -> Room 102
    expect(allocated[1].roomId).toBe('r2');
    expect(allocated[1].roomName).toBe('Room 102 (Block A)');

    // Primary supervisor 3 & 4 -> LT-1 (requires 2 supervisors)
    expect(allocated[2].roomId).toBe('r3');
    expect(allocated[2].roomName).toBe('LT-1 (Science Wing)');
    expect(allocated[3].roomId).toBe('r3');
    expect(allocated[3].roomName).toBe('LT-1 (Science Wing)');

    // Reserve supervisor 5 -> Reserve Pool
    expect(allocated[4].roomId).toBe('reserve-pool');
    expect(allocated[4].roomName).toBe('Exam Control / Reserve Pool');
  });

  it('generates compliant iCalendar (.ics) format with 60-min pre-exam alarm', () => {
    const faculty: Faculty = {
      srNo: 101,
      name: 'Dr. Hermione Granger',
      isHod: false,
      arrival: 'Morning',
      targetSupervisions: 4,
      maxSupervisions: 6,
      previousSupervisions: 0,
    };

    const assignments: Assignment[] = [
      {
        id: '101-2026-10-12-JRS 1',
        facultySrNo: 101,
        date: '2026-10-12',
        session: 'JRS 1',
        isLocked: false,
        isOverride: false,
        roomId: 'r-101',
        roomName: 'Hall 101 (Academic Block A)',
      },
    ];

    const dates: ExamDateConfig[] = [
      {
        date: '2026-10-12',
        displayDate: '12 Oct 2026',
        dayOfWeek: 'Monday',
        isExcluded: false,
        sessionRequirements: { 'JRS 1': 4 },
        sessionTimings: {
          'JRS 1': { start: '10:00', end: '13:00' },
        },
      },
    ];

    const icsContent = generateIcsCalendar(faculty, assignments, dates);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('SUMMARY:Exam Invigilation Duty: JRS 1');
    expect(icsContent).toContain('LOCATION:Hall 101 (Academic Block A)');
    expect(icsContent).toContain('BEGIN:VALARM');
    expect(icsContent).toContain('TRIGGER:-PT60M');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('renders RoomManager without runtime errors in SSR mode', () => {
    const html = renderToString(
      React.createElement(SchedulerProvider, null, React.createElement(RoomManager))
    );

    expect(html).toContain('Exam Rooms &amp; Examination Halls');
    expect(html).toContain('Total Exam Halls');
    expect(html).toContain('Active Seating');
    expect(html).toContain('Auto-Assign Rooms');
  });

  it('renders RoomChartModal without runtime errors in SSR mode', () => {
    const html = renderToString(
      React.createElement(
        SchedulerProvider,
        null,
        React.createElement(RoomChartModal, { forceOpen: true })
      )
    );

    expect(html).toContain('Noticeboard Room-wise Invigilation Chart');
    expect(html).toContain('Official hall allocation &amp; supervisor signature register');
  });
});
