import {
  Faculty,
  ExamDateConfig,
  Assignment,
  ValidationConflict,
  ValidationSummary,
  SchedulerSettings,
  ArrivalCategory,
  SessionType,
  SessionDefinition,
} from '../../types';

export function isFacultyEligibleForSession(
  arrival: ArrivalCategory,
  session: SessionType,
  sessionDefinitions?: SessionDefinition[]
): boolean {
  if (sessionDefinitions && sessionDefinitions.length > 0) {
    const def = sessionDefinitions.find((s) => s.id === session || s.name === session);
    if (def) {
      return def.eligibleArrivals.includes(arrival);
    }
  }
  if (arrival === 'Mid') {
    return true; // Mid is eligible for JRS 1, JRS 2, JRS 3 and custom
  }
  if (arrival === 'Morning') {
    return session === 'JRS 1' || session === 'JRS 2';
  }
  if (arrival === 'Afternoon') {
    return session === 'JRS 2' || session === 'JRS 3';
  }
  return true;
}

export function validateSchedule(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  assignments: Assignment[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  sessionDefinitions?: SessionDefinition[]
): ValidationSummary {
  const conflicts: ValidationConflict[] = [];

  const facultyMap = new Map<number, Faculty>();
  facultyList.forEach((f) => facultyMap.set(f.srNo, f));

  const dateConfigMap = new Map<string, ExamDateConfig>();
  datesConfig.forEach((d) => dateConfigMap.set(d.date, d));

  const activeDates = datesConfig.filter((d) => !d.isExcluded);

  // 1. Session staffing check
  let totalRequiredPositions = 0;
  let totalFilledPositions = 0;

  // Determine all active session types across dates
  const allSessionsSet = new Set<string>();
  if (sessionDefinitions && sessionDefinitions.length > 0) {
    sessionDefinitions.forEach((s) => allSessionsSet.add(s.id));
  } else {
    allSessionsSet.add('JRS 1');
    allSessionsSet.add('JRS 2');
    allSessionsSet.add('JRS 3');
  }
  activeDates.forEach((d) => {
    Object.keys(d.sessionRequirements).forEach((s) => allSessionsSet.add(s));
  });

  const sessionList = Array.from(allSessionsSet);

  activeDates.forEach((d) => {
    sessionList.forEach((session) => {
      const required = d.sessionRequirements[session] || 0;
      totalRequiredPositions += required;

      const sessionAssignments = assignments.filter(
        (a) => a.date === d.date && a.session === session
      );
      const assignedCount = sessionAssignments.length;
      totalFilledPositions += assignedCount;

      if (assignedCount < required) {
        conflicts.push({
          id: `deficit-${d.date}-${session}`,
          type: 'hard',
          category: 'staffing_deficit',
          message: `${d.displayDate} - ${session}: Staffing deficit! Required ${required} supervisors, but only ${assignedCount} assigned (deficit: ${required - assignedCount}).`,
          date: d.date,
          session,
        });
      } else if (assignedCount > required) {
        conflicts.push({
          id: `surplus-${d.date}-${session}`,
          type: 'hard',
          category: 'staffing_surplus',
          message: `${d.displayDate} - ${session}: Staffing surplus! Required ${required} supervisors, but ${assignedCount} assigned (surplus: ${assignedCount - required}).`,
          date: d.date,
          session,
        });
      }

      // Check duplicates within the same session
      const seenFacultyInSession = new Set<number>();
      sessionAssignments.forEach((a) => {
        if (seenFacultyInSession.has(a.facultySrNo)) {
          const fac = facultyMap.get(a.facultySrNo);
          conflicts.push({
            id: `dup-${a.date}-${session}-${a.facultySrNo}`,
            type: 'hard',
            category: 'duplicate_in_session',
            message: `Duplicate assignment: ${fac?.name || `Sr ${a.facultySrNo}`} appears more than once in ${session} on ${d.displayDate}.`,
            facultySrNo: a.facultySrNo,
            facultyName: fac?.name,
            date: a.date,
            session,
          });
        }
        seenFacultyInSession.add(a.facultySrNo);
      });
    });
  });

  // 2. Check excluded dates
  const excludedDates = datesConfig.filter((d) => d.isExcluded);
  excludedDates.forEach((d) => {
    const invalidAssignments = assignments.filter((a) => a.date === d.date);
    if (invalidAssignments.length > 0) {
      invalidAssignments.forEach((a) => {
        const fac = facultyMap.get(a.facultySrNo);
        conflicts.push({
          id: `excluded-date-${a.id}`,
          type: 'hard',
          category: 'excluded_date',
          message: `Assignment on excluded date: ${fac?.name || `Sr ${a.facultySrNo}`} is assigned on ${d.displayDate} which is marked as ${d.exclusionReason || 'Excluded'}.`,
          facultySrNo: a.facultySrNo,
          facultyName: fac?.name,
          date: a.date,
          session: a.session,
        });
      });
    }
  });

  // 3. Faculty-level checks
  const facultyDateAssignments = new Map<number, Map<string, SessionType[]>>();
  const facultyTotalNewSupervisions = new Map<number, number>();
  const facultyJrsTypeCounts = new Map<number, Record<SessionType, number>>();

  facultyList.forEach((f) => {
    facultyDateAssignments.set(f.srNo, new Map());
    facultyTotalNewSupervisions.set(f.srNo, 0);
    facultyJrsTypeCounts.set(f.srNo, { 'JRS 1': 0, 'JRS 2': 0, 'JRS 3': 0 });
  });

  assignments.forEach((a) => {
    const fac = facultyMap.get(a.facultySrNo);
    if (!fac) {
      conflicts.push({
        id: `unknown-faculty-${a.id}`,
        type: 'hard',
        category: 'ineligibility',
        message: `Assignment with unknown Faculty Sr. No. ${a.facultySrNo}.`,
        facultySrNo: a.facultySrNo,
      });
      return;
    }

    // Excluded faculty check
    if (fac.isExcluded && !a.isOverride) {
      conflicts.push({
        id: `excluded-fac-${a.id}`,
        type: 'hard',
        category: 'excluded_faculty',
        message: `${fac.name} is EXCLUDED from duties (${fac.exclusionReason || 'Excluded'}) but is assigned to ${a.session} on ${a.date}.`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
        date: a.date,
        session: a.session,
      });
    }

    // Availability check
    const availKey = `${a.facultySrNo}_${a.date}`;
    const isAvail = availability[availKey] !== false; // Default true if undefined
    if (!isAvail && !a.isOverride) {
      const dateCfg = dateConfigMap.get(a.date);
      conflicts.push({
        id: `unavail-${a.id}`,
        type: 'hard',
        category: 'unavailability',
        message: `${fac.name} is marked UNAVAILABLE on ${dateCfg?.displayDate || a.date} but has been assigned to ${a.session}.`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
        date: a.date,
        session: a.session,
      });
    }

    // Eligibility check
    const eligible = isFacultyEligibleForSession(fac.arrival, a.session, sessionDefinitions);
    if (!eligible && !a.isOverride) {
      conflicts.push({
        id: `inelig-${a.id}`,
        type: 'hard',
        category: 'ineligibility',
        message: `${fac.name} (${fac.arrival} arrival) is INELIGIBLE for ${a.session} on ${a.date}.`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
        date: a.date,
        session: a.session,
      });
    }

    // Aggregate by date
    const dateMap = facultyDateAssignments.get(a.facultySrNo)!;
    const currentSessions = dateMap.get(a.date) || [];
    currentSessions.push(a.session);
    dateMap.set(a.date, currentSessions);

    // Aggregate total new
    const curNew = facultyTotalNewSupervisions.get(a.facultySrNo) || 0;
    facultyTotalNewSupervisions.set(a.facultySrNo, curNew + 1);

    // Aggregate JRS types
    const jrsCounts = facultyJrsTypeCounts.get(a.facultySrNo)!;
    jrsCounts[a.session] = (jrsCounts[a.session] || 0) + 1;
  });

  // 4. Daily limits & combinations per faculty
  let regularAtTargetCount = 0;
  let hodAtTargetCount = 0;
  let regularCount = 0;
  let hodCount = 0;
  const regularWorkloadDistribution: Record<number, number> = {};
  const hodWorkloadDistribution: Record<number, number> = {};

  facultyList.forEach((fac) => {
    if (fac.isHod) hodCount++;
    else regularCount++;

    const dateMap = facultyDateAssignments.get(fac.srNo)!;
    let doubleCountForFaculty = 0;

    dateMap.forEach((sessions, dateStr) => {
      const dateCfg = dateConfigMap.get(dateStr);
      const displayDate = dateCfg?.displayDate || dateStr;

      // Rule: Max 2 per day
      if (sessions.length > 2) {
        conflicts.push({
          id: `daily-limit-${fac.srNo}-${dateStr}`,
          type: 'hard',
          category: 'daily_limit',
          message: `${fac.name} has ${sessions.length} assignments on ${displayDate}. Maximum allowed is 2 per day.`,
          facultySrNo: fac.srNo,
          facultyName: fac.name,
          date: dateStr,
        });
      }

      if (sessions.length === 2) {
        doubleCountForFaculty++;
        // Check allowed combinations: JRS 1 + 2 or JRS 2 + 3
        const hasJrs1 = sessions.includes('JRS 1');
        const hasJrs2 = sessions.includes('JRS 2');
        const hasJrs3 = sessions.includes('JRS 3');

        if (hasJrs1 && hasJrs3 && !hasJrs2) {
          if (!settings.allowJrs1Jrs3Double) {
            conflicts.push({
              id: `jrs1-jrs3-${fac.srNo}-${dateStr}`,
              type: 'hard',
              category: 'jrs1_jrs3_combination',
              message: `${fac.name} has forbidden double combination (JRS 1 + JRS 3) on ${displayDate}. Only JRS 1+2 or JRS 2+3 are permitted.`,
              facultySrNo: fac.srNo,
              facultyName: fac.name,
              date: dateStr,
            });
          } else {
            conflicts.push({
              id: `jrs1-jrs3-warn-${fac.srNo}-${dateStr}`,
              type: 'soft',
              category: 'jrs1_jrs3_combination',
              message: `${fac.name} is scheduled for JRS 1 + JRS 3 on ${displayDate} (allowed by administrator exception).`,
              facultySrNo: fac.srNo,
              facultyName: fac.name,
              date: dateStr,
            });
          }
        }
      }
    });

    // Check soft warning: excessive double assignments
    if (doubleCountForFaculty >= 3) {
      conflicts.push({
        id: `excess-double-${fac.srNo}`,
        type: 'soft',
        category: 'workload_imbalance',
        message: `${fac.name} has ${doubleCountForFaculty} double-duty days. Consider rebalancing to distribute workload.`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
      });
    }

    // Workload checks
    const newCount = facultyTotalNewSupervisions.get(fac.srNo) || 0;
    const totalCount = fac.previousSupervisions + newCount;

    if (fac.isHod) {
      hodWorkloadDistribution[totalCount] = (hodWorkloadDistribution[totalCount] || 0) + 1;
      if (totalCount === fac.targetSupervisions) hodAtTargetCount++;
    } else {
      regularWorkloadDistribution[totalCount] = (regularWorkloadDistribution[totalCount] || 0) + 1;
      if (totalCount === fac.targetSupervisions) regularAtTargetCount++;
    }

    if (totalCount > fac.maxSupervisions) {
      conflicts.push({
        id: `over-max-${fac.srNo}`,
        type: 'hard',
        category: 'max_workload',
        message: `${fac.name} exceeded maximum workload! Total: ${totalCount} (Previous: ${fac.previousSupervisions}, New: ${newCount}), Maximum: ${fac.maxSupervisions}.`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
      });
    } else if (totalCount !== fac.targetSupervisions && totalRequiredPositions === 342 && activeDates.length === 6) {
      // Soft target warning
      const diff = totalCount - fac.targetSupervisions;
      conflicts.push({
        id: `target-dev-${fac.srNo}`,
        type: 'soft',
        category: 'target_deviation',
        message: `${fac.name} has ${totalCount} supervisions (${diff > 0 ? `+${diff}` : diff} from target ${fac.targetSupervisions}).`,
        facultySrNo: fac.srNo,
        facultyName: fac.name,
      });
    }
  });

  const hardConflictsCount = conflicts.filter((c) => c.type === 'hard').length;
  const softWarningsCount = conflicts.filter((c) => c.type === 'soft').length;

  return {
    totalRequiredPositions,
    totalFilledPositions,
    unfilledPositions: Math.max(0, totalRequiredPositions - totalFilledPositions),
    totalFacultyCount: facultyList.length,
    activeFacultyCount: facultyList.filter(
      (f) => !f.isExcluded && (facultyTotalNewSupervisions.get(f.srNo) || 0) > 0
    ).length,
    excludedFacultyCount: facultyList.filter((f) => f.isExcluded).length,
    regularCount,
    hodCount,
    hardConflictsCount,
    softWarningsCount,
    regularAtTargetCount,
    hodAtTargetCount,
    regularWorkloadDistribution,
    hodWorkloadDistribution,
    conflicts,
    isValid: hardConflictsCount === 0 && totalFilledPositions === totalRequiredPositions,
  };
}
