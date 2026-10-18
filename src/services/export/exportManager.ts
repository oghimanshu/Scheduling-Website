import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ProjectState, SessionType, ExamDateConfig, SessionTiming, Faculty } from '../../types';

export interface ExportOptions {
  includeRooms?: boolean;
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function triggerExcelDownload(wb: XLSX.WorkBook, filename: string): void {
  if (typeof window === 'undefined') return;
  XLSX.writeFile(wb, filename);
}

export function exportProjectToJson(state: ProjectState): void {
  const jsonStr = JSON.stringify(state, null, 2);
  const sanitizedName = (state.projectName || 'Exam_Schedule')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerDownload(jsonStr, `${sanitizedName}_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}

export function importProjectFromJson(
  jsonContent: string
): { success: boolean; state?: ProjectState; error?: string } {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || !Array.isArray(parsed.faculty) || !parsed.examPeriod || !Array.isArray(parsed.examPeriod.dates)) {
      return {
        success: false,
        error: 'Invalid project file format. Missing required faculty or examination period structures.',
      };
    }
    return { success: true, state: parsed as ProjectState };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse JSON project file: ${err.message}`,
    };
  }
}

export function buildExcelWorkbook(state: ProjectState, options?: ExportOptions): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const includeRooms = options?.includeRooms ?? true;

  const configuredActiveDates = (state.examPeriod?.dates || []).filter((d) => !d.isExcluded);
  const activeDates: ExamDateConfig[] = configuredActiveDates.length > 0
    ? configuredActiveDates
    : (Array.from(new Set(state.assignments.map((a) => a.date))).sort().map((date) => ({
        date,
        dayOfWeek: '',
        sessionRequirements: {} as Record<SessionType, number>,
        sessionTimings: {} as Record<SessionType, SessionTiming>,
        isExcluded: false,
        displayDate: date,
      })) as ExamDateConfig[]);
  const activeDatesSet = new Set(activeDates.map((d) => d.date));

  // 1. Sheet 1: Faculty Master Schedule View
  const facultyRows: any[] = [];
  state.faculty.forEach((fac) => {
    const row: Record<string, string | number> = {
      'Sr. No.': fac.srNo,
      'Faculty Name': fac.name,
      'Role': fac.isHod ? 'HOD' : 'Regular',
      'Arrival': fac.arrival,
    };

    let countedNew = 0;
    let reserveTotal = 0;
    activeDates.forEach((d) => {
      const assigned = state.assignments.filter(
        (a) => Number(a.facultySrNo) === Number(fac.srNo) && a.date === d.date
      );
      const colKey = d.displayDate || d.date;
      if (assigned.length > 0) {
        const primaryDuties = assigned.filter((a) => !a.isReserve);
        const reserveDuties = assigned.filter((a) => a.isReserve);
        reserveTotal += reserveDuties.length;
        const countedToday = state.settings.reserveCanExceedCap
          ? primaryDuties.length
          : assigned.length;
        countedNew += countedToday;
        const sessionsStr = assigned
          .map((a) => {
            const rTag = (includeRooms && a.roomName) ? ` [${a.roomName.split('(')[0].trim()}]` : '';
            return `${a.session}${a.isReserve ? ' (Reserve)' : ''}${rTag}`;
          })
          .join(' + ');
        row[colKey] = sessionsStr;
      } else {
        row[colKey] = '-';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = countedNew;
    row['Total'] = fac.previousSupervisions + countedNew;
    if (state.settings.reserveCanExceedCap) {
      row['Reserve (Auxiliary)'] = reserveTotal;
    }
    row['Target'] = fac.targetSupervisions;
    row['Maximum'] = fac.maxSupervisions;
    row['Remaining'] = Math.max(0, fac.maxSupervisions - (fac.previousSupervisions + countedNew));

    facultyRows.push(row);
  });

  const facultyWs = XLSX.utils.json_to_sheet(facultyRows);
  XLSX.utils.book_append_sheet(wb, facultyWs, 'Faculty Schedule');

  // 2. Sheet 2: Daily Session Duty Rosters
  const sessionRows: any[] = [];
  const facultyMap = new Map(state.faculty.map((f) => [Number(f.srNo), f]));
  const sessionList = (state.sessions && state.sessions.length > 0
    ? state.sessions.map((s) => s.id)
    : ['JRS 1', 'JRS 2', 'JRS 3']) as SessionType[];

  activeDates.forEach((d) => {
    sessionList.forEach((session) => {
      const assigned = state.assignments.filter(
        (a) => a.date === d.date && a.session === session
      );
      const req = (d.sessionRequirements as Record<string, number> | undefined)?.[session] || 0;
      const timingObj = (d.sessionTimings as Record<string, { start: string; end: string }> | undefined)?.[session] || { start: '09:00', end: '12:00' };
      const supervisorNames = assigned
        .map((a) => {
          const name = facultyMap.get(Number(a.facultySrNo))?.name || `Sr ${a.facultySrNo}`;
          const roomTag = (includeRooms && a.roomName) ? ` [${a.roomName.split('(')[0].trim()}]` : a.isReserve ? ' [Reserve]' : '';
          return `${name}${roomTag}`;
        })
        .join('; ');

      sessionRows.push({
        'Date': d.displayDate || d.date,
        'Day': d.dayOfWeek || '',
        'Session': session,
        'Timing': `${timingObj.start} - ${timingObj.end}`,
        'Required': req,
        'Assigned': assigned.length,
        'Status': assigned.length >= req ? 'Filled' : `Deficit (${req - assigned.length})`,
        'Supervisors': supervisorNames,
      });
    });
  });

  const sessionWs = XLSX.utils.json_to_sheet(sessionRows);
  XLSX.utils.book_append_sheet(wb, sessionWs, 'Session Rosters');

  // 3. Sheet 3: Individual Duties Roster (Row per Duty)
  const individualDutyRows = generateConsolidatedDutiesRows(state, options);
  if (individualDutyRows.length > 0) {
    const individualWs = XLSX.utils.json_to_sheet(individualDutyRows);
    XLSX.utils.book_append_sheet(wb, individualWs, 'Individual Duties');
  }

  // 4. Sheet 4: Workload Summary
  const workloadRows = state.faculty.map((fac) => {
    const facAssignments = state.assignments.filter(
      (a) => Number(a.facultySrNo) === Number(fac.srNo) && activeDatesSet.has(a.date)
    );
    const primaryCount = facAssignments.filter((a) => !a.isReserve).length;
    const reserveCount = facAssignments.filter((a) => a.isReserve).length;
    const countedNew = state.settings.reserveCanExceedCap ? primaryCount : primaryCount + reserveCount;
    const total = fac.previousSupervisions + countedNew;
    return {
      'Sr. No.': fac.srNo,
      'Faculty Name': fac.name,
      'Designation': fac.isHod ? 'HOD' : 'Faculty Member',
      'Arrival Category': fac.arrival,
      'Previous Supervisions': fac.previousSupervisions,
      'Primary Duties': primaryCount,
      'Reserve Duties': reserveCount,
      'Final Counted Supervisions': total,
      'Workload Target': fac.targetSupervisions,
      'Maximum Allowed': fac.maxSupervisions,
      'Remaining Capacity': Math.max(0, fac.maxSupervisions - total),
      'Target Status': total === fac.targetSupervisions ? 'Met Target' : `${total - fac.targetSupervisions > 0 ? '+' : ''}${total - fac.targetSupervisions}`,
    };
  });

  const workloadWs = XLSX.utils.json_to_sheet(workloadRows);
  XLSX.utils.book_append_sheet(wb, workloadWs, 'Workload Analysis');

  // 5. Sheet 5: Exam Rooms & Halls Configuration
  if (includeRooms && state.rooms && state.rooms.length > 0) {
    const roomRows = state.rooms.map((r) => ({
      'Room / Hall Name': r.name,
      'Building / Block': r.block,
      'Floor': r.floor || 'Standard',
      'Candidate Capacity': r.capacity,
      'Invigilators Required': r.invigilatorsRequired || 1,
      'Active Status': r.isActive !== false ? 'Yes' : 'No',
    }));
    const roomsWs = XLSX.utils.json_to_sheet(roomRows);
    XLSX.utils.book_append_sheet(wb, roomsWs, 'Exam Halls & Rooms');
  }

  return wb;
}

export function exportScheduleToExcel(state: ProjectState, options?: ExportOptions): void {
  const wb = buildExcelWorkbook(state, options);
  triggerExcelDownload(wb, `Examination_Supervision_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function generateScheduleCsvString(state: ProjectState, options?: ExportOptions): string {
  const includeRooms = options?.includeRooms ?? true;
  const configuredActiveDates = (state.examPeriod?.dates || []).filter((d) => !d.isExcluded);
  const activeDates: ExamDateConfig[] = configuredActiveDates.length > 0
    ? configuredActiveDates
    : (Array.from(new Set(state.assignments.map((a) => a.date))).sort().map((date) => ({
        date,
        dayOfWeek: '',
        sessionRequirements: {} as Record<SessionType, number>,
        sessionTimings: {} as Record<SessionType, SessionTiming>,
        isExcluded: false,
        displayDate: date,
      })) as ExamDateConfig[]);
  const rows: any[] = [];

  state.faculty.forEach((fac) => {
    const row: Record<string, string | number> = {
      'Sr. No.': fac.srNo,
      'Faculty Name': fac.name,
      'Role': fac.isHod ? 'HOD' : 'Regular',
      'Arrival': fac.arrival,
    };

    let countedNew = 0;
    let reserveTotal = 0;
    activeDates.forEach((d) => {
      const assigned = state.assignments.filter(
        (a) => Number(a.facultySrNo) === Number(fac.srNo) && a.date === d.date
      );
      const colKey = d.displayDate || d.date;
      if (assigned.length > 0) {
        const primaryDuties = assigned.filter((a) => !a.isReserve);
        const reserveDuties = assigned.filter((a) => a.isReserve);
        reserveTotal += reserveDuties.length;
        const countedToday = state.settings.reserveCanExceedCap
          ? primaryDuties.length
          : assigned.length;
        countedNew += countedToday;
        row[colKey] = assigned
          .map((a) => {
            const rTag = (includeRooms && a.roomName) ? ` [${a.roomName.split('(')[0].trim()}]` : '';
            return `${a.session}${a.isReserve ? ' (R)' : ''}${rTag}`;
          })
          .join(' + ');
      } else {
        row[colKey] = '';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = countedNew;
    row['Total'] = fac.previousSupervisions + countedNew;
    if (state.settings.reserveCanExceedCap) {
      row['Reserve Standby'] = reserveTotal;
    }
    row['Target'] = fac.targetSupervisions;
    row['Max'] = fac.maxSupervisions;

    rows.push(row);
  });

  return Papa.unparse(rows);
}

export function exportScheduleToCsv(state: ProjectState, options?: ExportOptions): void {
  const csv = generateScheduleCsvString(state, options);
  triggerDownload(csv, `Examination_Schedule_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function generateConsolidatedDutiesRows(
  state: ProjectState,
  options?: ExportOptions
): any[] {
  const includeRooms = options?.includeRooms ?? true;
  const configuredActiveDates = (state.examPeriod?.dates || []).filter((d) => !d.isExcluded);
  const activeDatesSet = new Set(
    configuredActiveDates.length > 0
      ? configuredActiveDates.map((d) => d.date)
      : state.assignments.map((a) => a.date)
  );
  const facultyMap = new Map(state.faculty.map((f) => [Number(f.srNo), f]));
  const dateMap = new Map((state.examPeriod?.dates || []).map((d) => [d.date, d]));

  const sortedDuties = [...state.assignments]
    .filter((a) => activeDatesSet.has(a.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session) || Number(a.facultySrNo) - Number(b.facultySrNo));

  return sortedDuties.map((duty, idx) => {
    const fac = facultyMap.get(Number(duty.facultySrNo));
    const dConfig = dateMap.get(duty.date);
    const timing = (dConfig?.sessionTimings as Record<string, { start: string; end: string }> | undefined)?.[duty.session] || { start: '09:00', end: '12:00' };
    const roomText = (includeRooms && duty.roomName)
      ? duty.roomName.split('(')[0].trim()
      : duty.isReserve
      ? 'Exam Control Room'
      : 'Standard Hall';

    return {
      'S.No.': idx + 1,
      'Sr. No.': fac?.srNo || duty.facultySrNo,
      'Faculty Name': fac?.name || `Sr ${duty.facultySrNo}`,
      'Role': fac?.isHod ? 'HOD' : 'Regular',
      'Arrival': fac?.arrival || 'Morning',
      'Exam Date': dConfig?.displayDate || duty.date,
      'Day': dConfig?.dayOfWeek || '',
      'Session': duty.session,
      'Timing': `${timing.start} - ${timing.end}`,
      'Room / Hall': roomText,
      'Duty Type': duty.isReserve ? 'Standby Reserve' : 'Primary Invigilator',
    };
  });
}

export function generateConsolidatedDutiesCsvString(
  state: ProjectState,
  options?: ExportOptions
): string {
  const rows = generateConsolidatedDutiesRows(state, options);
  return Papa.unparse(rows);
}

export function exportConsolidatedDutiesToCsv(
  state: ProjectState,
  options?: ExportOptions
): void {
  const csv = generateConsolidatedDutiesCsvString(state, options);
  triggerDownload(csv, `Examination_Consolidated_Duties_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportConsolidatedDutiesToExcel(
  state: ProjectState,
  options?: ExportOptions
): void {
  const wb = XLSX.utils.book_new();
  const rows = generateConsolidatedDutiesRows(state, options);
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    'S.No.': '-',
    'Sr. No.': '-',
    'Faculty Name': '-',
    'Role': '-',
    'Arrival': '-',
    'Exam Date': '-',
    'Day': '-',
    'Session': 'No duties assigned',
    'Timing': '-',
    'Room / Hall': '-',
    'Duty Type': '-',
  }]);
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Duties');
  triggerExcelDownload(wb, `Examination_Consolidated_Duties_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function buildSingleFacultyWorkbook(
  faculty: Faculty,
  state: ProjectState,
  options?: ExportOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const includeRooms = options?.includeRooms ?? true;
  const configuredActiveDates = (state.examPeriod?.dates || []).filter((d) => !d.isExcluded);
  const activeDatesSet = new Set(
    configuredActiveDates.length > 0
      ? configuredActiveDates.map((d) => d.date)
      : state.assignments.map((a) => a.date)
  );
  const dateMap = new Map((state.examPeriod?.dates || []).map((d) => [d.date, d]));

  const facDuties = state.assignments
    .filter((a) => Number(a.facultySrNo) === Number(faculty.srNo) && activeDatesSet.has(a.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session));

  // Sheet 1: Duties Table
  const dutyRows = facDuties.map((duty, idx) => {
    const dConfig = dateMap.get(duty.date);
    const timing = (dConfig?.sessionTimings as Record<string, { start: string; end: string }> | undefined)?.[duty.session] || { start: '09:00', end: '12:00' };
    const roomText = (includeRooms && duty.roomName)
      ? duty.roomName.split('(')[0].trim()
      : duty.isReserve
      ? 'Exam Control Room'
      : 'Standard Hall';

    return {
      'S.No.': idx + 1,
      'Date': dConfig?.displayDate || duty.date,
      'Day': dConfig?.dayOfWeek || '',
      'Session': duty.session,
      'Reporting Time': timing.start,
      'Session Timing': `${timing.start} - ${timing.end}`,
      'Assigned Hall / Room': roomText,
      'Duty Type': duty.isReserve ? 'Standby Reserve' : 'Primary Invigilator',
    };
  });

  const dutiesWs = XLSX.utils.json_to_sheet(dutyRows.length > 0 ? dutyRows : [{
    'S.No.': '-',
    'Date': '-',
    'Day': '-',
    'Session': 'No duties assigned',
    'Reporting Time': '-',
    'Session Timing': '-',
    'Assigned Hall / Room': '-',
    'Duty Type': '-',
  }]);
  XLSX.utils.book_append_sheet(wb, dutiesWs, 'Duty Schedule');

  // Sheet 2: Faculty Profile & Workload Summary
  const profileRows = [
    { 'Property': 'Faculty Name', 'Details': faculty.name },
    { 'Property': 'Seniority Serial No.', 'Details': faculty.srNo },
    { 'Property': 'Role / Designation', 'Details': faculty.isHod ? 'Head of Department (HOD)' : 'Faculty Member' },
    { 'Property': 'Arrival Category', 'Details': faculty.arrival },
    { 'Property': 'Previous Duties Completed', 'Details': faculty.previousSupervisions },
    { 'Property': 'Newly Assigned Duties', 'Details': facDuties.length },
    { 'Property': 'Grand Total Supervisions', 'Details': faculty.previousSupervisions + facDuties.length },
    { 'Property': 'Target Workload', 'Details': faculty.targetSupervisions },
    { 'Property': 'Maximum Allowed Workload', 'Details': faculty.maxSupervisions },
    { 'Property': 'Examination Period', 'Details': state.examPeriod?.name || 'End Semester Examinations' },
  ];
  const profileWs = XLSX.utils.json_to_sheet(profileRows);
  XLSX.utils.book_append_sheet(wb, profileWs, 'Faculty Profile');

  return wb;
}

export function exportSingleFacultyToExcel(
  faculty: Faculty,
  state: ProjectState,
  options?: ExportOptions
): void {
  const wb = buildSingleFacultyWorkbook(faculty, state, options);
  const safeName = (faculty.name || `Faculty_${faculty.srNo}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerExcelDownload(wb, `Duty_Schedule_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function generateSingleFacultyCsvString(
  faculty: Faculty,
  state: ProjectState,
  options?: ExportOptions
): string {
  const includeRooms = options?.includeRooms ?? true;
  const configuredActiveDates = (state.examPeriod?.dates || []).filter((d) => !d.isExcluded);
  const activeDatesSet = new Set(
    configuredActiveDates.length > 0
      ? configuredActiveDates.map((d) => d.date)
      : state.assignments.map((a) => a.date)
  );
  const dateMap = new Map((state.examPeriod?.dates || []).map((d) => [d.date, d]));

  const facDuties = state.assignments
    .filter((a) => Number(a.facultySrNo) === Number(faculty.srNo) && activeDatesSet.has(a.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session));

  const rows = facDuties.map((duty, idx) => {
    const dConfig = dateMap.get(duty.date);
    const timing = (dConfig?.sessionTimings as Record<string, { start: string; end: string }> | undefined)?.[duty.session] || { start: '09:00', end: '12:00' };
    const roomText = (includeRooms && duty.roomName)
      ? duty.roomName.split('(')[0].trim()
      : duty.isReserve
      ? 'Exam Control Room'
      : 'Standard Hall';

    return {
      'S.No.': idx + 1,
      'Faculty Sr No': faculty.srNo,
      'Faculty Name': faculty.name,
      'Date': dConfig?.displayDate || duty.date,
      'Day': dConfig?.dayOfWeek || '',
      'Session': duty.session,
      'Reporting Time': timing.start,
      'Session Timing': `${timing.start} - ${timing.end}`,
      'Assigned Hall': roomText,
      'Duty Type': duty.isReserve ? 'Standby Reserve' : 'Primary Invigilator',
    };
  });

  return Papa.unparse(rows.length > 0 ? rows : [{
    'S.No.': 1,
    'Faculty Sr No': faculty.srNo,
    'Faculty Name': faculty.name,
    'Date': '-',
    'Day': '-',
    'Session': 'No duties assigned',
    'Reporting Time': '-',
    'Session Timing': '-',
    'Assigned Hall': '-',
    'Duty Type': '-',
  }]);
}

export function exportSingleFacultyToCsv(
  faculty: Faculty,
  state: ProjectState,
  options?: ExportOptions
): void {
  const csv = generateSingleFacultyCsvString(faculty, state, options);
  const safeName = (faculty.name || `Faculty_${faculty.srNo}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerDownload(csv, `Duty_Schedule_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}
