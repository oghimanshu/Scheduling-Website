import { describe, it, expect } from 'vitest';
import { DEFAULT_FACULTY_LIST, DEFAULT_DATES_CONFIG, DEFAULT_SETTINGS, INITIAL_PROJECT_STATE } from '../data/defaultData';
import { solveExaminationSchedule } from '../services/scheduler/solver';
import { validateSchedule, isFacultyEligibleForSession } from '../services/validation/validator';
import { generateFiveAlternatives } from '../services/scheduler/alternatives';
import { rebalanceSchedule } from '../services/scheduler/rebalance';
import { parseFacultyCSV, generateSampleFacultyCSV } from '../services/csvParser';
import { analyzeInfeasibility } from '../services/validation/infeasibility';
import { exportProjectToJson, importProjectFromJson } from '../services/export/exportManager';
import { Assignment, ProjectState } from '../types';

describe('Examination Supervision Scheduler Engine', () => {
  it('should parse faculty CSV with mandatory columns and preserve original Sr. Nos.', () => {
    const csvContent = generateSampleFacultyCSV(false);
    const result = parseFacultyCSV(csvContent);
    expect(result.success).toBe(true);
    expect(result.faculty.length).toBe(4);
    expect(result.faculty[0].srNo).toBe(4);
    expect(result.faculty[0].name).toBe('Dr. Neera Kumar');
    expect(result.faculty[0].isHod).toBe(true);
    expect(result.faculty[0].arrival).toBe('Morning');
    expect(result.faculty[1].srNo).toBe(5);
    expect(result.faculty[1].isHod).toBe(false);
  });

  it('should clearly report missing mandatory columns', () => {
    const invalidCsv = 'Faculty Name,HOD\nDr. Test,Yes\n';
    const result = parseFacultyCSV(invalidCsv);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Missing mandatory CSV column(s)');
  });

  it('should reject invalid arrival values and flag the specific row and value', () => {
    const invalidCsv = 'Sr. No.,Faculty Name,HOD,Arrival\n1,Dr. Invalid,No,Midnight\n';
    const result = parseFacultyCSV(invalidCsv);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Invalid Arrival value "Midnight"');
  });

  it('should correctly import optional No. of Supervision column when selected', () => {
    const csvWithSupervision = generateSampleFacultyCSV(true);
    const result = parseFacultyCSV(csvWithSupervision, { mode: 'from_csv' });
    expect(result.success).toBe(true);
    expect(result.hasOptionalSupervisions).toBe(true);
  });

  it('should enforce arrival category eligibility rules accurately', () => {
    // Morning: eligible JRS 1, JRS 2; ineligible JRS 3
    expect(isFacultyEligibleForSession('Morning', 'JRS 1')).toBe(true);
    expect(isFacultyEligibleForSession('Morning', 'JRS 2')).toBe(true);
    expect(isFacultyEligibleForSession('Morning', 'JRS 3')).toBe(false);

    // Mid: eligible for all
    expect(isFacultyEligibleForSession('Mid', 'JRS 1')).toBe(true);
    expect(isFacultyEligibleForSession('Mid', 'JRS 2')).toBe(true);
    expect(isFacultyEligibleForSession('Mid', 'JRS 3')).toBe(true);

    // Afternoon: ineligible JRS 1; eligible JRS 2, JRS 3
    expect(isFacultyEligibleForSession('Afternoon', 'JRS 1')).toBe(false);
    expect(isFacultyEligibleForSession('Afternoon', 'JRS 2')).toBe(true);
    expect(isFacultyEligibleForSession('Afternoon', 'JRS 3')).toBe(true);
  });

  it('should correctly balance 6 active dates × 57 positions = 342 positions with 61 faculty', () => {
    const activeDates = DEFAULT_DATES_CONFIG.filter((d) => !d.isExcluded);
    expect(activeDates.length).toBe(6);

    const regularCount = DEFAULT_FACULTY_LIST.filter((f) => !f.isHod).length;
    const hodCount = DEFAULT_FACULTY_LIST.filter((f) => f.isHod).length;
    expect(regularCount).toBe(49);
    expect(hodCount).toBe(12);

    const totalReq = activeDates.reduce((acc, d) => {
      return acc + d.sessionRequirements['JRS 1'] + d.sessionRequirements['JRS 2'] + d.sessionRequirements['JRS 3'];
    }, 0);
    expect(totalReq).toBe(342);

    const totalCapacity = 49 * 6 + 12 * 4;
    expect(totalCapacity).toBe(342);
  });

  it('should generate a 100% mathematically valid schedule for the default problem', () => {
    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 42 }
    );

    expect(result.success).toBe(true);
    expect(result.assignments.length).toBe(342);

    const validation = validateSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      result.assignments,
      {},
      DEFAULT_SETTINGS
    );

    expect(validation.isValid).toBe(true);
    expect(validation.hardConflictsCount).toBe(0);
    expect(validation.totalFilledPositions).toBe(342);
    expect(validation.unfilledPositions).toBe(0);

    // Verify all 49 regular faculty got exactly 6 supervisions
    const regularWith6 = validation.regularAtTargetCount;
    expect(regularWith6).toBe(49);

    // Verify all 12 HODs got exactly 4 supervisions
    const hodWith4 = validation.hodAtTargetCount;
    expect(hodWith4).toBe(12);
  });

  it('should generate 5 genuinely distinct valid alternative schedules', () => {
    const { alternatives } = generateFiveAlternatives(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS
    );

    expect(alternatives.length).toBe(5);

    alternatives.forEach((alt) => {
      expect(alt.metrics.hardConflicts).toBe(0);
      expect(alt.metrics.filledPositions).toBe(342);
      expect(alt.assignments.length).toBe(342);
    });

    const set1 = new Set(alternatives[0].assignments.map((a) => `${a.facultySrNo}_${a.date}_${a.session}`));
    const set2 = new Set(alternatives[1].assignments.map((a) => `${a.facultySrNo}_${a.date}_${a.session}`));

    let identicalCount = 0;
    set1.forEach((val) => {
      if (set2.has(val)) identicalCount++;
    });

    expect(identicalCount).toBeLessThan(342);
  });

  it('should strictly preserve locked assignments during generation and rebalancing', () => {
    const lockedAssignment: Assignment = {
      id: '5-2026-10-07-JRS 2',
      facultySrNo: 5, // Mr. Himanshu Sunil Gaur
      date: '2026-10-07',
      session: 'JRS 2',
      isLocked: true,
      isOverride: false,
    };

    const initial = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      {
        seed: 42,
        preserveLocked: true,
        lockedAssignments: [lockedAssignment],
      }
    );

    expect(initial.success).toBe(true);
    const hasLocked = initial.assignments.some(
      (a) => a.facultySrNo === 5 && a.date === '2026-10-07' && a.session === 'JRS 2' && a.isLocked
    );
    expect(hasLocked).toBe(true);

    // Rebalance
    const rebalanced = rebalanceSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      initial.assignments,
      {},
      DEFAULT_SETTINGS
    );

    expect(rebalanced.success).toBe(true);
    const stillHasLocked = rebalanced.assignments.some(
      (a) => a.facultySrNo === 5 && a.date === '2026-10-07' && a.session === 'JRS 2' && a.isLocked
    );
    expect(stillHasLocked).toBe(true);
  });

  it('should detect infeasibility when capacity is reduced and provide diagnostic report', () => {
    // If we reduce all HOD max to 3 instead of 4 without changing required positions:
    // Capacity = 49*6 + 12*3 = 294 + 36 = 330 < 342
    const alteredFaculty = DEFAULT_FACULTY_LIST.map((f) =>
      f.isHod ? { ...f, maxSupervisions: 3, targetSupervisions: 3 } : f
    );

    const report = analyzeInfeasibility(
      alteredFaculty,
      DEFAULT_DATES_CONFIG,
      [],
      {},
      DEFAULT_SETTINGS
    );

    expect(report.isInfeasible).toBe(true);
    expect(report.capacityDeficit).toBe(12);
    expect(report.recommendedActions.length).toBeGreaterThan(0);
  });

  it('should strictly exclude unavailable faculty on that date', () => {
    // Mark Dr. Neera Kumar (Sr. 4) unavailable on 06/10/2026
    const availability: Record<string, boolean> = {
      '4_2026-10-06': false,
    };

    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      availability,
      DEFAULT_SETTINGS,
      { seed: 99 }
    );

    expect(result.success).toBe(true);
    const assignedOnUnavailable = result.assignments.some(
      (a) => a.facultySrNo === 4 && a.date === '2026-10-06'
    );
    expect(assignedOnUnavailable).toBe(false);
  });

  it('should preserve full project state across JSON serialization and deserialization', () => {
    const testState = { ...INITIAL_PROJECT_STATE, faculty: DEFAULT_FACULTY_LIST };
    const jsonStr = JSON.stringify(testState);
    const parsed = importProjectFromJson(jsonStr);

    expect(parsed.success).toBe(true);
    expect(parsed.state?.faculty.length).toBe(61);
    expect(parsed.state?.examPeriod.dates.length).toBe(8);
  });
});
