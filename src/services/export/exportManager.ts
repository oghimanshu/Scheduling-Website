import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ProjectState, SessionType } from '../../types';

export function exportProjectToJson(state: ProjectState): void {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const sanitizedName = (state.projectName || 'Exam_Schedule')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `${sanitizedName}_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
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

export function buildExcelWorkbook(state: ProjectState): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const activeDates = state.examPeriod.dates.filter((d) => !d.isExcluded);

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
      if (assigned.length > 0) {
        const primaryDuties = assigned.filter((a) => !a.isReserve);
        const reserveDuties = assigned.filter((a) => a.isReserve);
        reserveTotal += reserveDuties.length;
        const countedToday = state.settings.reserveCanExceedCap
          ? primaryDuties.length
          : assigned.length;
        countedNew += countedToday;
        const sessionsStr = assigned
          .map((a) => a.session + (a.isReserve ? ' (Reserve)' : ''))
          .join(' + ');
        row[d.displayDate] = sessionsStr;
      } else {
        row[d.displayDate] = '-';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = countedNew;
    row['Total'] = fac.previousSupervisions + countedNew;
    if (reserveTotal > 0 && state.settings.reserveCanExceedCap) {
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

  activeDates.forEach((d) => {
    (['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).forEach((session) => {
      const assigned = state.assignments.filter(
        (a) => a.date === d.date && a.session === session
      );
      const req = d.sessionRequirements[session] || 0;
      const supervisorNames = assigned
        .map((a) => {
          const name = facultyMap.get(Number(a.facultySrNo))?.name || `Sr ${a.facultySrNo}`;
          const roomTag = a.roomName ? ` [${a.roomName}]` : a.isReserve ? ' [Reserve]' : '';
          return `${name}${roomTag}`;
        })
        .join('; ');

      sessionRows.push({
        'Date': d.displayDate,
        'Day': d.dayOfWeek,
        'Session': session,
        'Timing': `${d.sessionTimings[session].start} - ${d.sessionTimings[session].end}`,
        'Required': req,
        'Assigned': assigned.length,
        'Status': assigned.length >= req ? 'Filled' : `Deficit (${req - assigned.length})`,
        'Supervisors': supervisorNames,
      });
    });
  });

  const sessionWs = XLSX.utils.json_to_sheet(sessionRows);
  XLSX.utils.book_append_sheet(wb, sessionWs, 'Session Rosters');

  // 3. Sheet 3: Workload Summary
  const workloadRows = state.faculty.map((fac) => {
    const facAssignments = state.assignments.filter(
      (a) => Number(a.facultySrNo) === Number(fac.srNo)
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

  // 4. Sheet 4: Exam Rooms & Halls Configuration
  if (state.rooms && state.rooms.length > 0) {
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

export function exportScheduleToExcel(state: ProjectState): void {
  const wb = buildExcelWorkbook(state);
  XLSX.writeFile(wb, `Examination_Supervision_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function generateScheduleCsvString(state: ProjectState): string {
  const activeDates = state.examPeriod.dates.filter((d) => !d.isExcluded);
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
      if (assigned.length > 0) {
        const primaryDuties = assigned.filter((a) => !a.isReserve);
        const reserveDuties = assigned.filter((a) => a.isReserve);
        reserveTotal += reserveDuties.length;
        const countedToday = state.settings.reserveCanExceedCap
          ? primaryDuties.length
          : assigned.length;
        countedNew += countedToday;
        row[d.displayDate] = assigned
          .map((a) => a.session + (a.isReserve ? ' (R)' : ''))
          .join(' + ');
      } else {
        row[d.displayDate] = '';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = countedNew;
    row['Total'] = fac.previousSupervisions + countedNew;
    if (reserveTotal > 0 && state.settings.reserveCanExceedCap) {
      row['Reserve Standby'] = reserveTotal;
    }
    row['Target'] = fac.targetSupervisions;
    row['Max'] = fac.maxSupervisions;

    rows.push(row);
  });

  return Papa.unparse(rows);
}

export function exportScheduleToCsv(state: ProjectState): void {
  const csv = generateScheduleCsvString(state);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Examination_Schedule_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
