import { Assignment, Faculty, ExamDateConfig, SessionTiming } from '../types';

export interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO date 'YYYY-MM-DD'
  startTime: string; // '08:00'
  endTime: string;   // '10:00'
  uid: string;
}

/**
 * Format date and time into iCalendar local timestamp: YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(dateIso: string, timeStr: string): string {
  const cleanDate = dateIso.replace(/-/g, '');
  const [hh, mm] = timeStr.split(':').map((s) => s.padStart(2, '0'));
  return `${cleanDate}T${hh}${mm}00`;
}

/**
 * Convert faculty assignments into structured CalendarEventData array
 */
export function buildFacultyCalendarEvents(
  faculty: Faculty,
  assignments: Assignment[],
  examDates: ExamDateConfig[]
): CalendarEventData[] {
  const facultyAssignments = assignments.filter((a) => Number(a.facultySrNo) === Number(faculty.srNo));
  return facultyAssignments.map((a) => {
    const dateConfig = examDates.find((d) => d.date === a.date);
    const timing: SessionTiming = dateConfig?.sessionTimings?.[a.session] || { start: '08:00', end: '10:00' };
    const roomText = a.roomName || 'Assigned Examination Hall';

    return {
      uid: `${a.id}@examscheduler.local`,
      startDate: a.date,
      startTime: timing.start,
      endTime: timing.end,
      title: `Exam Invigilation Duty: ${a.session}`,
      description: `College Examination Supervision Duty\nFaculty: ${faculty.name} (#${faculty.srNo})\nSession: ${a.session}\nHall / Room: ${roomText}\nDate: ${dateConfig?.displayDate || a.date}`,
      location: roomText,
    };
  });
}

/**
 * Generate RFC-5545 standard .ics file text with built-in 60-minute alarm reminder
 */
export function generateIcsCalendar(
  eventsOrFaculty: CalendarEventData[] | Faculty,
  calendarNameOrAssignments: string | Assignment[] = 'Exam Invigilation Schedule',
  optionalExamDates?: ExamDateConfig[]
): string {
  let events: CalendarEventData[] = [];
  let calendarName = 'Exam Invigilation Schedule';

  if (Array.isArray(eventsOrFaculty)) {
    events = eventsOrFaculty;
    if (typeof calendarNameOrAssignments === 'string') {
      calendarName = calendarNameOrAssignments;
    }
  } else if (Array.isArray(calendarNameOrAssignments) && optionalExamDates) {
    events = buildFacultyCalendarEvents(eventsOrFaculty, calendarNameOrAssignments, optionalExamDates);
    calendarName = `Exam Duties - ${eventsOrFaculty.name}`;
  }

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//College Examination Scheduler//Invigilation System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:UTC',
  ];

  events.forEach((evt) => {
    const dtStart = formatIcsDateTime(evt.startDate, evt.startTime);
    const dtEnd = formatIcsDateTime(evt.startDate, evt.endTime);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${evt.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${evt.title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${evt.location.replace(/[,;]/g, ' ')}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: Exam Invigilation duty at ${evt.location} starts in 1 hour`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Download a faculty member's duties as an .ics file for Google Calendar, Apple Calendar, or Outlook
 */
export function downloadFacultyCalendarIcs(
  faculty: Faculty,
  assignments: Assignment[],
  examDates: ExamDateConfig[]
): void {
  const facultyAssignments = assignments.filter((a) => Number(a.facultySrNo) === Number(faculty.srNo));
  if (facultyAssignments.length === 0) return;

  const events: CalendarEventData[] = facultyAssignments.map((a) => {
    const dateConfig = examDates.find((d) => d.date === a.date);
    const timing: SessionTiming = dateConfig?.sessionTimings?.[a.session] || { start: '08:00', end: '10:00' };
    const roomText = a.roomName || 'Assigned Examination Hall';

    return {
      uid: `${a.id}@examscheduler.local`,
      startDate: a.date,
      startTime: timing.start,
      endTime: timing.end,
      title: `Invigilation: ${a.session} - ${roomText}`,
      description: `College Examination Supervision Duty\\nFaculty: ${faculty.name} (#${faculty.srNo})\\nSession: ${a.session}\\nHall / Room: ${roomText}\\nDate: ${dateConfig?.displayDate || a.date}`,
      location: roomText,
    };
  });

  const icsContent = generateIcsCalendar(events, `Exam Duties - ${faculty.name}`);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedName = faculty.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('download', `invigilation_schedule_${sanitizedName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
