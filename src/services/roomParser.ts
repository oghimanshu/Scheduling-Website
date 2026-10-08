import Papa from 'papaparse';
import { ExamRoom, Assignment } from '../types';

export interface RoomParseResult {
  success: boolean;
  rooms: ExamRoom[];
  errors: string[];
  warnings: string[];
}

export function parseRoomsCSV(csvText: string): RoomParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rooms: ExamRoom[] = [];

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach((e) => errors.push(`CSV Syntax Error (Row ${e.row}): ${e.message}`));
  }

  const rows = parsed.data as Record<string, string>[];
  if (!rows || rows.length === 0) {
    return {
      success: false,
      rooms: [],
      errors: ['The uploaded CSV file contains no data rows.'],
      warnings: [],
    };
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Resolve room name/number
    const nameKey = Object.keys(row).find((k) =>
      k.includes('room') || k.includes('hall') || k.includes('name') || k.includes('number')
    );
    const roomName = (nameKey ? row[nameKey] : '')?.trim();

    if (!roomName) {
      warnings.push(`Row ${rowNum}: Skipped row with missing Room Name/Number.`);
      return;
    }

    // Resolve Block / Building
    const blockKey = Object.keys(row).find((k) => k.includes('block') || k.includes('building') || k.includes('wing'));
    const block = blockKey ? row[blockKey]?.trim() : 'Academic Wing';

    // Resolve Floor
    const floorKey = Object.keys(row).find((k) => k.includes('floor') || k.includes('level'));
    const floor = floorKey ? row[floorKey]?.trim() : undefined;

    // Resolve Capacity
    const capKey = Object.keys(row).find((k) => k.includes('capacity') || k.includes('seats') || k.includes('students'));
    const capVal = capKey ? parseInt(row[capKey]?.trim() || '30', 10) : 30;
    const capacity = isNaN(capVal) || capVal <= 0 ? 30 : capVal;

    // Resolve Invigilators Required
    const invKey = Object.keys(row).find((k) =>
      k.includes('invigilator') || k.includes('proctor') || k.includes('supervisor') || k.includes('staff')
    );
    const invVal = invKey ? parseInt(row[invKey]?.trim() || '1', 10) : capacity >= 60 ? 2 : 1;
    const invigilatorsRequired = isNaN(invVal) || invVal <= 0 ? (capacity >= 60 ? 2 : 1) : invVal;

    // Resolve Active status
    const activeKey = Object.keys(row).find((k) => k.includes('active') || k.includes('status') || k.includes('available'));
    const activeRaw = activeKey ? row[activeKey]?.toLowerCase().trim() : 'yes';
    const isActive = activeRaw === 'no' || activeRaw === 'false' || activeRaw === '0' || activeRaw === 'inactive' ? false : true;

    // Generate unique ID
    const sanitizedId = `room-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx + 1}`;

    rooms.push({
      id: sanitizedId,
      name: roomName,
      block,
      floor,
      capacity,
      invigilatorsRequired,
      isActive,
    });
  });

  return {
    success: rooms.length > 0 && errors.length === 0,
    rooms,
    errors,
    warnings,
  };
}

export function generateSampleRoomsCSV(): string {
  const headers = ['Room Number / Name', 'Building / Block', 'Floor', 'Seating Capacity', 'Invigilators Required', 'Active'];
  const sampleRows = [
    ['Hall 101', 'Academic Block A', '1st Floor', '32', '1', 'Yes'],
    ['Hall 102', 'Academic Block A', '1st Floor', '32', '1', 'Yes'],
    ['Hall 103', 'Academic Block A', '1st Floor', '32', '1', 'Yes'],
    ['Hall 104', 'Academic Block A', '1st Floor', '32', '1', 'Yes'],
    ['Lecture Theatre 1 (LT-1)', 'Science Complex', 'Ground Floor', '64', '2', 'Yes'],
    ['Lecture Theatre 2 (LT-2)', 'Science Complex', 'Ground Floor', '64', '2', 'Yes'],
    ['Main Auditorium', 'Central Wing', 'Ground Floor', '120', '3', 'Yes'],
    ['Central Seminar Hall', 'Central Wing', '2nd Floor', '80', '2', 'Yes'],
    ['Drawing Hall 1 (DH-1)', 'Engineering Annex', '3rd Floor', '48', '1', 'Yes'],
    ['Hall 201', 'Academic Block B', '2nd Floor', '35', '1', 'Yes'],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\r\n');
}

export function downloadRoomsTemplateCSV(): void {
  const csvContent = generateSampleRoomsCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'examination_rooms_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Distributes active exam rooms among scheduled assignments per session.
 * Primary supervisors are assigned to available rooms according to invigilatorsRequired.
 * Reserve supervisors are routed to the central Exam Control / Reserve Pool.
 */
export function allocateRoomsToAssignmentList(
  assignments: Assignment[],
  rooms: ExamRoom[]
): Assignment[] {
  const activeRooms = (rooms || []).filter((r) => r.isActive !== false);
  if (activeRooms.length === 0 || assignments.length === 0) {
    return assignments;
  }

  // Group assignments by date + session
  const groups = new Map<string, Assignment[]>();
  assignments.forEach((a) => {
    const key = `${a.date}_${a.session}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  });

  const updatedAssignments: Assignment[] = [];

  groups.forEach((sessionAssignments) => {
    let roomIndex = 0;
    let roomStaffCount = 0;

    sessionAssignments.forEach((assignment) => {
      if (assignment.isReserve) {
        updatedAssignments.push({
          ...assignment,
          roomId: 'reserve-pool',
          roomName: 'Exam Control / Reserve Pool',
        });
        return;
      }

      const currentRoom = activeRooms[roomIndex % activeRooms.length];
      updatedAssignments.push({
        ...assignment,
        roomId: currentRoom.id,
        roomName: `${currentRoom.name} (${currentRoom.block})`,
      });

      roomStaffCount++;
      const req = currentRoom.invigilatorsRequired || 1;
      if (roomStaffCount >= req) {
        roomIndex++;
        roomStaffCount = 0;
      }
    });
  });

  return updatedAssignments;
}

