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
  return h.trim().toLowerCase().replace(/[_\s\.]+/g, '');
};

const MATCH_MAP: Record<string, string> = {
  'srno': 'Sr. No.',
  'srnumber': 'Sr. No.',
  'sno': 'Sr. No.',
  'serialno': 'Sr. No.',
  'serialnumber': 'Sr. No.',
  'facultyname': 'Faculty Name',
  'name': 'Faculty Name',
  'faculty': 'Faculty Name',
  'hod': 'HOD',
  'arrival': 'Arrival',
  'arrivalcategory': 'Arrival',
  'arrivaltime': 'Arrival',
  'noofsupervision': 'No. of Supervision',
  'supervisions': 'No. of Supervision',
  'supervision': 'No. of Supervision',
  'previoussupervisions': 'No. of Supervision',
};

export function parseFacultyCSV(
  csvContent: string,
  initialOption: InitialSupervisionOption = { mode: 'zero' }
): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const facultyList: Faculty[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
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

    const srNo = parseInt(rawSrNo?.trim() || `${rowNum - 1}`, 10);
    if (isNaN(srNo)) {
      errors.push(`Row ${rowNum}: Invalid Sr. No. "${rawSrNo}". Must be an integer.`);
      return;
    }

    // Determine HOD status strictly from HOD column (never infer from name)
    const hodStr = (rawHod || '').trim().toLowerCase();
    const isHod = hodStr === 'yes' || hodStr === 'y' || hodStr === 'true' || hodStr === '1';

    // Parse Arrival strictly
    const arrivalStr = (rawArrival || '').trim().toLowerCase();
    let arrival: ArrivalCategory;
    if (arrivalStr === 'morning' || arrivalStr === 'morn') {
      arrival = 'Morning';
    } else if (arrivalStr === 'mid' || arrivalStr === 'midday' || arrivalStr === 'mid-day') {
      arrival = 'Mid';
    } else if (arrivalStr === 'afternoon' || arrivalStr === 'after') {
      arrival = 'Afternoon';
    } else {
      errors.push(
        `Row ${rowNum} (${rawName}): Invalid Arrival value "${rawArrival}". ` +
        `Must be one of "Morning", "Mid", or "Afternoon".`
      );
      return;
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

  return {
    success: errors.length === 0,
    faculty: facultyList,
    errors,
    warnings,
    hasOptionalSupervisions,
    totalParsed: facultyList.length,
  };
}

export function generateSampleFacultyCSV(withOptionalColumn = false): string {
  if (withOptionalColumn) {
    return (
      `Sr. No.,Faculty Name,HOD,Arrival,No. of Supervision\n` +
      `4,Dr. Neera Kumar,Yes,Morning,0\n` +
      `5,Mr. Himanshu Sunil Gaur,No,Morning,0\n` +
      `23,Mr. Chaitanya S Songirkar,Yes,Afternoon,0\n` +
      `56,Ms. Nisha Padmanabhan,No,Mid,0\n`
    );
  }
  return (
    `Sr. No.,Faculty Name,HOD,Arrival\n` +
    `4,Dr. Neera Kumar,Yes,Morning\n` +
    `5,Mr. Himanshu Sunil Gaur,No,Morning\n` +
    `23,Mr. Chaitanya S Songirkar,Yes,Afternoon\n` +
    `56,Ms. Nisha Padmanabhan,No,Mid\n`
  );
}
