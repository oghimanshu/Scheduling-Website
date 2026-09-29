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

export function exportScheduleToExcel(state: ProjectState): void {
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

    let newCount = 0;
    activeDates.forEach((d) => {
      const assigned = state.assignments.filter(
        (a) => a.facultySrNo === fac.srNo && a.date === d.date
      );
      if (assigned.length > 0) {
        newCount += assigned.length;
        const sessionsStr = assigned.map((a) => a.session).join(' + ');
        row[d.displayDate] = sessionsStr;
      } else {
        row[d.displayDate] = '-';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = newCount;
    row['Total'] = fac.previousSupervisions + newCount;
    row['Target'] = fac.targetSupervisions;
    row['Maximum'] = fac.maxSupervisions;
    row['Remaining'] = Math.max(0, fac.maxSupervisions - (fac.previousSupervisions + newCount));

    facultyRows.push(row);
  });

  const facultyWs = XLSX.utils.json_to_sheet(facultyRows);
  XLSX.utils.book_append_sheet(wb, facultyWs, 'Faculty Schedule');

  // 2. Sheet 2: Daily Session Duty Rosters
  const sessionRows: any[] = [];
  const facultyMap = new Map(state.faculty.map((f) => [f.srNo, f]));

  activeDates.forEach((d) => {
    (['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).forEach((session) => {
      const assigned = state.assignments.filter(
        (a) => a.date === d.date && a.session === session
      );
      const req = d.sessionRequirements[session] || 0;
      const supervisorNames = assigned
        .map((a) => facultyMap.get(a.facultySrNo)?.name || `Sr ${a.facultySrNo}`)
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
    const assignedCount = state.assignments.filter((a) => a.facultySrNo === fac.srNo).length;
    const total = fac.previousSupervisions + assignedCount;
    return {
      'Sr. No.': fac.srNo,
      'Faculty Name': fac.name,
      'Designation': fac.isHod ? 'HOD' : 'Faculty Member',
      'Arrival Category': fac.arrival,
      'Previous Supervisions': fac.previousSupervisions,
      'New Allocated': assignedCount,
      'Total Supervisions': total,
      'Target Workload': fac.targetSupervisions,
      'Maximum Allowed': fac.maxSupervisions,
      'Remaining Capacity': Math.max(0, fac.maxSupervisions - total),
      'Target Status': total === fac.targetSupervisions ? 'Met Target' : `${total - fac.targetSupervisions > 0 ? '+' : ''}${total - fac.targetSupervisions}`,
    };
  });

  const workloadWs = XLSX.utils.json_to_sheet(workloadRows);
  XLSX.utils.book_append_sheet(wb, workloadWs, 'Workload Analysis');

  XLSX.writeFile(wb, `Examination_Supervision_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportScheduleToCsv(state: ProjectState): void {
  const activeDates = state.examPeriod.dates.filter((d) => !d.isExcluded);
  const rows: any[] = [];

  state.faculty.forEach((fac) => {
    const row: Record<string, string | number> = {
      'Sr. No.': fac.srNo,
      'Faculty Name': fac.name,
      'Role': fac.isHod ? 'HOD' : 'Regular',
      'Arrival': fac.arrival,
    };

    let newCount = 0;
    activeDates.forEach((d) => {
      const assigned = state.assignments.filter(
        (a) => a.facultySrNo === fac.srNo && a.date === d.date
      );
      if (assigned.length > 0) {
        newCount += assigned.length;
        row[d.displayDate] = assigned.map((a) => a.session).join(' + ');
      } else {
        row[d.displayDate] = '';
      }
    });

    row['Previous'] = fac.previousSupervisions;
    row['New'] = newCount;
    row['Total'] = fac.previousSupervisions + newCount;
    row['Target'] = fac.targetSupervisions;
    row['Max'] = fac.maxSupervisions;

    rows.push(row);
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Examination_Schedule_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
