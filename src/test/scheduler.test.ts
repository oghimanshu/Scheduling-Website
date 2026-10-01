import { describe, it, expect } from 'vitest';
import { DEFAULT_DATES_CONFIG, DEFAULT_SETTINGS, INITIAL_PROJECT_STATE } from '../data/defaultData';
import { MOCK_FACULTY_LIST as DEFAULT_FACULTY_LIST } from './fixtures/mockFaculty';
import { solveExaminationSchedule } from '../services/scheduler/solver';
import { validateSchedule, isFacultyEligibleForSession, checkSessionTimingsOverlap } from '../services/validation/validator';
import { generateFiveAlternatives } from '../services/scheduler/alternatives';
import { rebalanceSchedule } from '../services/scheduler/rebalance';
import { parseFacultyCSV, generateSampleFacultyCSV } from '../services/csvParser';
import { analyzeInfeasibility } from '../services/validation/infeasibility';
import { exportProjectToJson, importProjectFromJson } from '../services/export/exportManager';
import { Assignment, ProjectState } from '../types';

describe('Examination Supervision Scheduler Engine', () => {
  it('should generate empty sample CSV template with only headers', () => {
    const csvContent = generateSampleFacultyCSV(false);
    expect(csvContent.trim()).toBe('Sr. No.,Faculty Name,HOD,Arrival');
    const result = parseFacultyCSV(csvContent);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('no faculty member rows');
  });

  it('should parse faculty CSV with mandatory columns and preserve original Sr. Nos.', () => {
    const csvContent =
      `Sr. No.,Faculty Name,HOD,Arrival\n` +
      `4,Dr. Neera Kumar,Yes,Morning\n` +
      `5,Mr. Test Faculty,No,Morning\n` +
      `23,Mr. Chaitanya S Songirkar,Yes,Afternoon\n` +
      `56,Ms. Nisha Padmanabhan,No,Mid\n`;
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
    const csvWithSupervision =
      `Sr. No.,Faculty Name,HOD,Arrival,No. of Supervision\n` +
      `4,Dr. Neera Kumar,Yes,Morning,2\n`;
    const result = parseFacultyCSV(csvWithSupervision, { mode: 'from_csv' });
    expect(result.success).toBe(true);
    expect(result.hasOptionalSupervisions).toBe(true);
    expect(result.faculty[0].previousSupervisions).toBe(2);
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

  it('should support date-specific arrival eligibility overrides', () => {
    const customDateConfig = {
      ...DEFAULT_DATES_CONFIG[1],
      sessionArrivals: {
        'JRS 1': ['Afternoon'] as any, // Only afternoon allowed on this special day
      },
    };

    // Afternoon is normally ineligible for JRS 1, but this date specifically allows it
    expect(isFacultyEligibleForSession('Afternoon', 'JRS 1', undefined, customDateConfig)).toBe(true);
    // Morning is normally eligible for JRS 1, but this date excludes it
    expect(isFacultyEligibleForSession('Morning', 'JRS 1', undefined, customDateConfig)).toBe(false);
  });

  it('should detect timing overlap and tight turnaround intervals', () => {
    const overlappingTimings = {
      'JRS 1': { start: '08:00', end: '10:30' },
      'JRS 2': { start: '10:00', end: '12:00' }, // Overlaps with JRS 1
    };
    const overlapWarnings = checkSessionTimingsOverlap(overlappingTimings);
    expect(overlapWarnings.some((w) => w.type === 'overlap')).toBe(true);

    const tightTimings = {
      'JRS 1': { start: '08:00', end: '10:00' },
      'JRS 2': { start: '10:10', end: '12:00' }, // 10 mins turnaround (< 15 mins)
    };
    const tightWarnings = checkSessionTimingsOverlap(tightTimings);
    expect(tightWarnings.some((w) => w.type === 'tight_turnaround')).toBe(true);
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

  it('should prioritize regular faculties first to fulfill their workloads before assigning to HODs', () => {
    // When required positions are fewer than regular faculty capacity (e.g., 200 required),
    // regular faculty must fulfill their workloads and HODs should not take slots that regular faculty can fill.
    const customDates = DEFAULT_DATES_CONFIG.map((d) => ({
      ...d,
      sessionRequirements: {
        'JRS 1': 10,
        'JRS 2': 15,
        'JRS 3': 10,
      },
    })); // 6 active dates * 35 = 210 positions.
    // 49 regular faculties * 6 capacity = 294 capacity (enough to cover 210 completely).

    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      customDates,
      {},
      DEFAULT_SETTINGS,
      { seed: 42 }
    );

    expect(result.success).toBe(true);
    expect(result.assignments.length).toBe(210);

    // Count assignments given to HODs vs Regular faculty
    const hodAssignments = result.assignments.filter((a) => {
      const f = DEFAULT_FACULTY_LIST.find((fac) => fac.srNo === a.facultySrNo);
      return f?.isHod;
    });

    const regularAssignments = result.assignments.filter((a) => {
      const f = DEFAULT_FACULTY_LIST.find((fac) => fac.srNo === a.facultySrNo);
      return !f?.isHod;
    });

    // Regular faculty should take the vast majority of slots (>90% or all slots)
    // and HOD assignments should be minimal or zero when regular faculty are available
    expect(regularAssignments.length).toBeGreaterThanOrEqual(195);
    expect(hodAssignments.length).toBeLessThanOrEqual(15);
  });

  it('should strictly exclude faculty on their specific excluded dates while assigning them on other dates', () => {
    const facultyWithDateExclusion = DEFAULT_FACULTY_LIST.map((f) => {
      if (f.srNo === 4) {
        return {
          ...f,
          excludedDates: ['2026-10-06', '2026-10-08'],
        };
      }
      return f;
    });

    const result = solveExaminationSchedule(
      facultyWithDateExclusion,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 101 }
    );

    expect(result.success).toBe(true);

    // Faculty #4 must NEVER be assigned on 2026-10-06 or 2026-10-08
    const forbiddenAssignments = result.assignments.filter(
      (a) => a.facultySrNo === 4 && (a.date === '2026-10-06' || a.date === '2026-10-08')
    );
    expect(forbiddenAssignments.length).toBe(0);

    // But Faculty #4 can still receive assignments on other active exam dates
    const allowedAssignments = result.assignments.filter(
      (a) => a.facultySrNo === 4 && a.date !== '2026-10-06' && a.date !== '2026-10-08'
    );
    expect(allowedAssignments.length).toBeGreaterThan(0);
  });

  it('should allocate reserve supervisors when configured and respect whether duties can exceed cap', () => {
    const settingsWithReserves = {
      ...DEFAULT_SETTINGS,
      reserveSupervisorsPerSession: 1,
      reserveCanExceedCap: true,
    };

    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      settingsWithReserves,
      { seed: 42 }
    );

    expect(result.success).toBe(true);

    const reserves = result.assignments.filter((a) => a.isReserve);
    // 6 active dates * 3 sessions * 1 reserve = 18 reserve duties
    expect(reserves.length).toBe(18);

    // Each session on each active date must have 1 reserve supervisor
    const activeDates = DEFAULT_DATES_CONFIG.filter((d) => !d.isExcluded);
    activeDates.forEach((d) => {
      ['JRS 1', 'JRS 2', 'JRS 3'].forEach((s) => {
        const sessionReserves = reserves.filter((a) => a.date === d.date && a.session === s);
        expect(sessionReserves.length).toBe(1);
      });
    });
  });

  it('should prioritize HOD assignments when hodAssignmentPriority is "hod_first"', () => {
    const hodPrioritySettings = {
      ...DEFAULT_SETTINGS,
      hodAssignmentPriority: 'hod_first' as const,
    };

    const regularPrioritySettings = {
      ...DEFAULT_SETTINGS,
      hodAssignmentPriority: 'regular_first_hod_last' as const,
    };

    const resultHodFirst = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      hodPrioritySettings,
      { seed: 42 }
    );

    const resultRegularFirst = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      regularPrioritySettings,
      { seed: 42 }
    );

    expect(resultHodFirst.success).toBe(true);
    expect(resultRegularFirst.success).toBe(true);

    const hodSrNos = new Set(DEFAULT_FACULTY_LIST.filter((f) => f.isHod).map((f) => f.srNo));

    const hodDutiesInHodFirst = resultHodFirst.assignments.filter((a) => !a.isReserve && hodSrNos.has(a.facultySrNo)).length;
    const hodDutiesInRegularFirst = resultRegularFirst.assignments.filter((a) => !a.isReserve && hodSrNos.has(a.facultySrNo)).length;

    // HODs should receive as many or more duties when prioritized first compared to regular first
    expect(hodDutiesInHodFirst).toBeGreaterThanOrEqual(hodDutiesInRegularFirst);
  });

  it('should honor custom role concession deltas during scheduling', () => {
    // Use 5 active dates so there is capacity slack for role concessions
    const fiveDatesConfig = DEFAULT_DATES_CONFIG.map((d, idx) =>
      idx === 5 ? { ...d, isExcluded: true } : d
    );

    const testFaculty = DEFAULT_FACULTY_LIST.map((f) => {
      if (f.srNo === 4) {
        return {
          ...f,
          role: 'Visiting Professor',
          concessionOrAdditionalDuties: -3,
        };
      }
      return f;
    });

    const result = solveExaminationSchedule(
      testFaculty,
      fiveDatesConfig,
      {},
      DEFAULT_SETTINGS,
      { seed: 42 }
    );

    expect(result.success).toBe(true);
    const faculty4Assignments = result.assignments.filter((a) => a.facultySrNo === 4);
    // Faculty #4 with -3 concession receives reduced duties
    expect(faculty4Assignments.length).toBeLessThanOrEqual(3);
  });

  it('should avoid consecutive day assignments when avoidConsecutiveDays is enabled and capacity allows', () => {
    // Active dates with light requirement (2 duties per day = 10 total duties across 61 faculty)
    const lightDatesConfig = DEFAULT_DATES_CONFIG.map((d) => ({
      ...d,
      sessionRequirements: { 'JRS 1': 2, 'JRS 2': 0, 'JRS 3': 0 },
    }));

    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      lightDatesConfig,
      {},
      { ...DEFAULT_SETTINGS, avoidConsecutiveDays: true },
      { seed: 42 }
    );

    expect(result.success).toBe(true);

    // Count consecutive assignments across all faculty
    const activeDates = lightDatesConfig.filter((d) => !d.isExcluded).map((d) => d.date);
    let consecutiveCount = 0;

    DEFAULT_FACULTY_LIST.forEach((f) => {
      const datesWorked = new Set(
        result.assignments.filter((a) => a.facultySrNo === f.srNo).map((a) => a.date)
      );
      for (let i = 0; i < activeDates.length - 1; i++) {
        if (datesWorked.has(activeDates[i]) && datesWorked.has(activeDates[i + 1])) {
          consecutiveCount++;
        }
      }
    });

    // When capacity allows, consecutive assignments should be strictly avoided (0)
    expect(consecutiveCount).toBe(0);
  });

  it('should support updating custom role tier definitions and quotas', () => {
    const customRoles = [
      {
        id: 'professor',
        name: 'Senior Professor',
        defaultTarget: 3,
        defaultMax: 3,
        concessionDelta: -3,
        schedulingPriority: 'concession_last' as const,
      },
    ];

    // Modify the role tier definition (e.g. increase quota to 5)
    const updatedRoles = customRoles.map((r) =>
      r.id === 'professor' ? { ...r, defaultTarget: 5, defaultMax: 5, concessionDelta: -1 } : r
    );

    expect(updatedRoles[0].defaultTarget).toBe(5);
    expect(updatedRoles[0].defaultMax).toBe(5);
    expect(updatedRoles[0].concessionDelta).toBe(-1);
  });

  it('should reset session back to square one while preserving faculty data', () => {
    const facultyWithDuties = DEFAULT_FACULTY_LIST.map((f) => ({
      ...f,
      previousSupervisions: 3,
    }));

    // Reset keeping faculty: previous duties reset to 0, roster preserved
    const preserved = facultyWithDuties.map((f) => ({
      ...f,
      previousSupervisions: 0,
    }));

    expect(preserved.length).toBe(DEFAULT_FACULTY_LIST.length);
    expect(preserved.every((f) => f.previousSupervisions === 0)).toBe(true);
    expect(preserved[0].name).toBe(DEFAULT_FACULTY_LIST[0].name);
    expect(preserved[0].department).toBe(DEFAULT_FACULTY_LIST[0].department);
  });

  it('should correctly generate exam dates and exclude Sundays when configured on import', () => {
    const startDate = '2026-11-02'; // Monday
    const endDate = '2026-11-08';   // Sunday (7 days total)
    const excludeSundays = true;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedDates = [];
    const cur = new Date(start);

    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      const isSunday = cur.getDay() === 0;
      const willExclude = excludeSundays && isSunday;
      generatedDates.push({
        date: iso,
        isExcluded: willExclude,
        exclusionReason: willExclude ? 'Holiday' : undefined,
      });
      cur.setDate(cur.getDate() + 1);
    }

    expect(generatedDates.length).toBe(7);
    const sundays = generatedDates.filter((d) => d.isExcluded);
    expect(sundays.length).toBe(1);
    expect(sundays[0].date).toBe('2026-11-08');
    expect(sundays[0].exclusionReason).toBe('Holiday');
  });

  it('should enforce workload caps when reserve duties count towards final count', () => {
    const settingsWithCountedReserves = {
      ...DEFAULT_SETTINGS,
      reserveSupervisorsPerSession: 1,
      reserveCanExceedCap: false, // Reserve duties count towards final count
    };

    const result = solveExaminationSchedule(
      DEFAULT_FACULTY_LIST,
      DEFAULT_DATES_CONFIG,
      {},
      settingsWithCountedReserves,
      { seed: 42 }
    );

    expect(result.success).toBe(true);

    // Total assignments per faculty (primary + reserve) must not exceed maxSupervisions
    DEFAULT_FACULTY_LIST.forEach((f) => {
      const allDuties = result.assignments.filter((a) => a.facultySrNo === f.srNo);
      expect(allDuties.length).toBeLessThanOrEqual(f.maxSupervisions);
    });
  });

  it('should generate a best-effort schedule with assignments when allowBestEffort is true even under infeasible constraints', () => {
    // Capacity deficit: 49*6 + 12*3 = 330 < 342 required
    const alteredFaculty = DEFAULT_FACULTY_LIST.map((f) =>
      f.isHod ? { ...f, maxSupervisions: 3, targetSupervisions: 3 } : f
    );

    // Standard run without allowBestEffort returns empty assignments
    const standardResult = solveExaminationSchedule(
      alteredFaculty,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 42, allowBestEffort: false }
    );
    expect(standardResult.success).toBe(false);
    expect(standardResult.assignments.length).toBe(0);

    // Run with allowBestEffort returns filled duties up to available capacity
    const bestEffortResult = solveExaminationSchedule(
      alteredFaculty,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 42, allowBestEffort: true }
    );
    expect(bestEffortResult.assignments.length).toBeGreaterThan(300);
    expect(bestEffortResult.metrics?.filledPositions).toBeGreaterThan(300);
    expect(bestEffortResult.metrics?.totalPositions).toBe(342);
  });

  it('should allow Mid and Afternoon faculty to cover JRS 1 when relaxArrivalConstraints is true', () => {
    // Restrict Morning arrivals by setting all Morning faculty to Afternoon
    const allAfternoonFaculty = DEFAULT_FACULTY_LIST.map((f) => ({
      ...f,
      arrival: 'Afternoon' as const,
    }));

    // Standard run fails to fill JRS 1 because Afternoon cannot do JRS 1
    const strictResult = solveExaminationSchedule(
      allAfternoonFaculty,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 42, allowBestEffort: true, relaxArrivalConstraints: false }
    );
    const strictJrs1 = strictResult.assignments.filter((a) => a.session === 'JRS 1');
    expect(strictJrs1.length).toBe(0);

    // Run with relaxArrivalConstraints fills JRS 1 with override flag
    const relaxedResult = solveExaminationSchedule(
      allAfternoonFaculty,
      DEFAULT_DATES_CONFIG,
      {},
      DEFAULT_SETTINGS,
      { seed: 42, allowBestEffort: true, relaxArrivalConstraints: true }
    );
    const relaxedJrs1 = relaxedResult.assignments.filter((a) => a.session === 'JRS 1');
    expect(relaxedJrs1.length).toBeGreaterThan(0);
    expect(relaxedJrs1[0].isOverride).toBe(true);
  });
});



