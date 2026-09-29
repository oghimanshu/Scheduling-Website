import Papa from 'papaparse';
import { Faculty, ArrivalCategory } from '../types';

export interface CSVParseResult {
  success: boolean;
  faculty: Faculty[];
  errors: string[];
  warnings: string[];
  hasOptionalSupervisions: boolean;
  totalParsed: number;
}

export type InitialSupervisionOption =
  | { mode: 'zero' }
  | { mode: 'uniform'; value: number }
  | { mode: 'individual' }
  | { mode: 'from_csv' };

export const MANDATORY_HEADERS = ['Sr. No.', 'Faculty Name', 'HOD', 'Arrival'];
export const OPTIONAL_HEADER_SUPERVISION = 'No. of Supervision';

const normalizeHeader = (h: string): string => {
  return h.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const MATCH_MAP: Record<string, string> = {
  'srno': 'Sr. No.',
  'srnumber': 'Sr. No.',
  'sno': 'Sr. No.',
  'slno': 'Sr. No.',
  'sl': 'Sr. No.',
  'sr': 'Sr. No.',
  'serialno': 'Sr. No.',
  'serialnumber': 'Sr. No.',
  'id': 'Sr. No.',
  'facultyid': 'Sr. No.',
  'empno': 'Sr. No.',
  'empid': 'Sr. No.',
  'facultyname': 'Faculty Name',
  'name': 'Faculty Name',
  'faculty': 'Faculty Name',
  'teacher': 'Faculty Name',
  'teachername': 'Faculty Name',
  'staffname': 'Faculty Name',
  'staff': 'Faculty Name',
  'facultymember': 'Faculty Name',
  'hod': 'HOD',
  'ishod': 'HOD',
  'head': 'HOD',
  'designation': 'HOD',
  'role': 'HOD',
  'position': 'HOD',
  'arrival': 'Arrival',
  'arrivalcategory': 'Arrival',
  'arrivaltime': 'Arrival',
  'shift': 'Arrival',
  'timing': 'Arrival',
  'time': 'Arrival',
  'slot': 'Arrival',
  'noofsupervision': 'No. of Supervision',
  'supervisions': 'No. of Supervision',
  'supervision': 'No. of Supervision',
  'previoussupervisions': 'No. of Supervision',
  'priorduties': 'No. of Supervision',
  'duties': 'No. of Supervision',
  'pastduties': 'No. of Supervision',
  'count': 'No. of Supervision',
};

export function parseFacultyCSV(
  csvContent: string,
  initialOption: InitialSupervisionOption = { mode: 'zero' }
): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const facultyList: Faculty[] = [];

  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();

  if (!cleanContent) {
    return {
      success: false,
      faculty: [],
      errors: ['The uploaded CSV file is empty. Please select a valid CSV file with faculty data.'],
      warnings: [],
      hasOptionalSupervisions: false,
      totalParsed: 0,
    };
  }

  const parsed = Papa.parse<Record<string, string>>(cleanContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
  });

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return {
      success: false,
      faculty: [],
      errors: ['The uploaded CSV file is empty or does not contain a header row.'],
      warnings: [],
      hasOptionalSupervisions: false,
      totalParsed: 0,
    };
  }

  // Detect column mapping
  const fieldMapping: Record<string, string> = {};
  for (const rawField of parsed.meta.fields) {
    const norm = normalizeHeader(rawField);
    if (MATCH_MAP[norm]) {
      fieldMapping[MATCH_MAP[norm]] = rawField;
    }
  }

  // Verify all mandatory columns exist
  const missingMandatory: string[] = [];
  for (const mandatory of MANDATORY_HEADERS) {
    if (!fieldMapping[mandatory]) {
      missingMandatory.push(`"${mandatory}"`);
    }
  }

  if (missingMandatory.length > 0) {
    return {
      success: false,
      faculty: [],
      errors: [
        `Missing mandatory CSV column(s): ${missingMandatory.join(', ')}. ` +
        `Required headers are: "Sr. No.", "Faculty Name", "HOD", "Arrival".`,
      ],
      warnings: [],
      hasOptionalSupervisions: false,
      totalParsed: 0,
    };
  }

  if (!parsed.data || parsed.data.length === 0) {
    return {
      success: false,
      faculty: [],
      errors: [
        'The uploaded CSV file contains headers but no faculty member rows. Please add your faculty records to the CSV before importing.',
      ],
      warnings: [],
      hasOptionalSupervisions: false,
      totalParsed: 0,
    };
  }

  const hasOptionalSupervisions = Boolean(fieldMapping[OPTIONAL_HEADER_SUPERVISION]);

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2; // 1-indexed including header
    const rawSrNo = row[fieldMapping['Sr. No.']];
    const rawName = row[fieldMapping['Faculty Name']];
    const rawHod = row[fieldMapping['HOD']];
    const rawArrival = row[fieldMapping['Arrival']];

    if (!rawName || rawName.trim() === '') {
      warnings.push(`Row ${rowNum}: Skipped row with empty Faculty Name.`);
      return;
    }

    // Auto-fallback Sr. No. to sequential integer if empty or invalid
    let srNo = parseInt(rawSrNo?.trim() || '', 10);
    if (isNaN(srNo)) {
      srNo = index + 1;
    }

    // Determine HOD status flexibly (supports Yes, Y, True, 1, HOD, Head)
    const hodStr = (rawHod || '').trim().toLowerCase();
    const isHod =
      hodStr === 'yes' ||
      hodStr === 'y' ||
      hodStr === 'true' ||
      hodStr === '1' ||
      hodStr === 'hod' ||
      hodStr.includes('head') ||
      hodStr.includes('h.o.d');

    // Parse Arrival flexibly but strictly
    const arrivalClean = (rawArrival || '').trim().toLowerCase();
    let arrival: ArrivalCategory = 'Morning';
    if (
      arrivalClean === 'morning' ||
      arrivalClean === 'fn' ||
      arrivalClean === 'forenoon' ||
      arrivalClean === 'am' ||
      arrivalClean === 'morn'
    ) {
      arrival = 'Morning';
    } else if (
      arrivalClean === 'mid' ||
      arrivalClean === 'middle' ||
      arrivalClean === 'general' ||
      arrivalClean === 'noon' ||
      arrivalClean === 'midday' ||
      arrivalClean === 'mid-day'
    ) {
      arrival = 'Mid';
    } else if (
      arrivalClean === 'afternoon' ||
      arrivalClean === 'an' ||
      arrivalClean === 'pm' ||
      arrivalClean === 'postnoon' ||
      arrivalClean === 'evening'
    ) {
      arrival = 'Afternoon';
    } else {
      errors.push(
        `Invalid Arrival value "${rawArrival}" on row ${rowNum} (${rawName}). Must be Morning, Mid, or Afternoon.`
      );
    }

    // Determine Previous Supervisions
    let previousSupervisions = 0;
    if (initialOption.mode === 'uniform') {
      previousSupervisions = initialOption.value;
    } else if (initialOption.mode === 'from_csv' && hasOptionalSupervisions) {
      const rawSup = row[fieldMapping[OPTIONAL_HEADER_SUPERVISION]];
      const parsedSup = parseInt(rawSup?.trim() || '0', 10);
      previousSupervisions = isNaN(parsedSup) ? 0 : Math.max(0, parsedSup);
    } else if (initialOption.mode === 'zero') {
      previousSupervisions = 0;
    }

    // Set targets and maximums based on rules:
    // Regular faculty: max = 6, target = 6
    // HOD: max = 4, target = 4
    const targetSupervisions = isHod ? 4 : 6;
    const maxSupervisions = isHod ? 4 : 6;

    facultyList.push({
      srNo,
      name: rawName.trim(),
      isHod,
      arrival,
      previousSupervisions,
      targetSupervisions,
      maxSupervisions,
    });
  });

  const finalErrors = [...errors];
  if (finalErrors.length === 0 && facultyList.length === 0) {
    finalErrors.push('No valid faculty records found in the CSV. Please check that the file has data rows below the header row.');
  }

  return {
    success: finalErrors.length === 0 && facultyList.length > 0,
    faculty: facultyList,
    errors: finalErrors,
    warnings,
    hasOptionalSupervisions,
    totalParsed: facultyList.length,
  };
}

export function generateSampleFacultyCSV(withOptionalColumn = false): string {
  if (withOptionalColumn) {
    return `Sr. No.,Faculty Name,HOD,Arrival,No. of Supervision\n`;
  }
  return `Sr. No.,Faculty Name,HOD,Arrival\n`;
}

export function downloadFacultyTemplateCSV(withOptionalColumn = false): void {
  const csv = generateSampleFacultyCSV(withOptionalColumn);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    withOptionalColumn ? 'faculty_sample_with_supervisions.csv' : 'faculty_sample_template.csv'
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
