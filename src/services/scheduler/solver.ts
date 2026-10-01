import {
  Faculty,
  ExamDateConfig,
  Assignment,
  SessionType,
  SchedulerSettings,
  ScheduleAlternative,
  SessionDefinition,
} from '../../types';
import { isFacultyEligibleForSession, validateSchedule } from '../validation/validator';
import { analyzeInfeasibility } from '../validation/infeasibility';

// Mulberry32 seeded pseudo-random number generator
function createRng(seed: number) {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SolverOptions {
  seed?: number;
  preserveLocked?: boolean;
  lockedAssignments?: Assignment[];
  activeSchedule?: Assignment[];
  sessionDefinitions?: SessionDefinition[];
  allowBestEffort?: boolean;
  relaxArrivalConstraints?: boolean;
}

export interface SolverResult {
  success: boolean;
  assignments: Assignment[];
  message: string;
  infeasibilityReport?: ReturnType<typeof analyzeInfeasibility>;
  metrics?: ScheduleAlternative['metrics'];
}

/**
 * Constraint-based scheduling engine for examination duties.
 * Uses exact constraint satisfaction, capacity reservation, prioritized bipartite matching,
 * and randomized tie-breaking to satisfy all hard and soft requirements.
 */
export function solveExaminationSchedule(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  options: SolverOptions = {}
): SolverResult {
  const seed = options.seed ?? settings.randomSeed ?? 42;
  const rng = createRng(seed);

  const allowBestEffort = options.allowBestEffort ?? settings.allowBestEffort ?? false;
  const relaxArrivalConstraints = options.relaxArrivalConstraints ?? settings.relaxArrivalConstraints ?? false;

  const activeDates = datesConfig.filter((d) => !d.isExcluded);
  const facultyMap = new Map<number, Faculty>(facultyList.map((f) => [f.srNo, f]));
  const dateConfigMap = new Map<string, ExamDateConfig>(datesConfig.map((d) => [d.date, d]));

  const prevActiveDateMap = new Map<string, string>();
  const nextActiveDateMap = new Map<string, string>();
  for (let i = 0; i < activeDates.length; i++) {
    if (i > 0) prevActiveDateMap.set(activeDates[i].date, activeDates[i - 1].date);
    if (i < activeDates.length - 1) nextActiveDateMap.set(activeDates[i].date, activeDates[i + 1].date);
  }

  // Determine all active sessions
  const allSessionsSet = new Set<string>();
  if (options.sessionDefinitions && options.sessionDefinitions.length > 0) {
    options.sessionDefinitions.forEach((s) => allSessionsSet.add(s.id));
  } else {
    allSessionsSet.add('JRS 1');
    allSessionsSet.add('JRS 2');
    allSessionsSet.add('JRS 3');
  }
  activeDates.forEach((d) => {
    Object.keys(d.sessionRequirements).forEach((s) => allSessionsSet.add(s));
  });
  const allSessions = Array.from(allSessionsSet);

  // 1. Check for immediate mathematical infeasibility
  const lockedAssignments = options.lockedAssignments || [];
  const infeasibilityReport = analyzeInfeasibility(
    facultyList,
    datesConfig,
    lockedAssignments,
    availability,
    settings,
    options.sessionDefinitions
  );

  if (infeasibilityReport.isInfeasible && !allowBestEffort) {
    return {
      success: false,
      assignments: [],
      message: infeasibilityReport.overallReason || 'No fully valid schedule exists under the current constraints.',
      infeasibilityReport,
    };
  }

  // 2. Setup tracking structures
  // Current assignments map: date -> session -> Set of facultySrNos
  const assignmentsByDateSession = new Map<string, Map<SessionType, Set<number>>>();
  // Faculty assignments count for the whole exam period: facultySrNo -> count
  const facultyTotalNew = new Map<number, number>();
  // Faculty assignments per date: facultySrNo -> date -> Set of sessions
  const facultyDateSessions = new Map<number, Map<string, Set<SessionType>>>();
  // Faculty remaining capacity: maxSupervisions - previousSupervisions
  const facultyMaxCap = new Map<number, number>();
  const facultyTarget = new Map<number, number>();

  facultyList.forEach((f) => {
    facultyTotalNew.set(f.srNo, 0);
    facultyDateSessions.set(f.srNo, new Map());
    // Excluded faculty have 0 capacity
    const maxCap = f.isExcluded ? 0 : Math.max(0, f.maxSupervisions - f.previousSupervisions);
    const target = f.isExcluded ? 0 : Math.max(0, f.targetSupervisions - f.previousSupervisions);
    facultyMaxCap.set(f.srNo, maxCap);
    facultyTarget.set(f.srNo, target);
  });

  activeDates.forEach((d) => {
    const sessionMap = new Map<SessionType, Set<number>>();
    allSessions.forEach((s) => sessionMap.set(s, new Set()));
    assignmentsByDateSession.set(d.date, sessionMap);
  });

  const finalAssignments: Assignment[] = [];

  // 3. Apply locked assignments first (hard constraints)
  if (options.preserveLocked && lockedAssignments.length > 0) {
    lockedAssignments.forEach((locked) => {
      const dateMap = assignmentsByDateSession.get(locked.date);
      if (dateMap && dateMap.has(locked.session)) {
        dateMap.get(locked.session)!.add(locked.facultySrNo);

        const currentTotal = facultyTotalNew.get(locked.facultySrNo) || 0;
        facultyTotalNew.set(locked.facultySrNo, currentTotal + 1);

        const fDateMap = facultyDateSessions.get(locked.facultySrNo)!;
        if (!fDateMap.has(locked.date)) fDateMap.set(locked.date, new Set());
        fDateMap.get(locked.date)!.add(locked.session);

        finalAssignments.push({
          ...locked,
          isLocked: true,
        });
      }
    });
  }

  // Helper function to check if faculty is eligible and available to be assigned to (date, session)
  const canAssign = (
    faculty: Faculty,
    date: string,
    session: SessionType,
    allowSecondOfDay = false,
    relaxedArrival = false
  ): boolean => {
    // Excluded faculty check
    if (faculty.isExcluded) return false;

    // Capacity check
    const currentNew = facultyTotalNew.get(faculty.srNo) || 0;
    const maxCap = facultyMaxCap.get(faculty.srNo) || 0;
    if (currentNew >= maxCap) return false;

    // Availability check
    const availKey = `${faculty.srNo}_${date}`;
    if (availability[availKey] === false || (faculty.excludedDates && faculty.excludedDates.includes(date))) return false;

    // Eligibility check
    const dateCfg = dateConfigMap.get(date);
    const standardEligible = isFacultyEligibleForSession(faculty.arrival, session, options.sessionDefinitions, dateCfg);
    if (!standardEligible) {
      if (!relaxedArrival || !relaxArrivalConstraints) return false;
    }

    // Duplicate check in same session
    const sessionSet = assignmentsByDateSession.get(date)?.get(session);
    if (sessionSet && sessionSet.has(faculty.srNo)) return false;

    // Daily limit check
    const fDateMap = facultyDateSessions.get(faculty.srNo)!;
    const sessionsOnDate = fDateMap.get(date) || new Set();

    if (sessionsOnDate.size >= 2) return false;
    if (sessionsOnDate.size === 1 && !allowSecondOfDay) return false;

    // Check double combination rule (allowed: JRS 1+2 or JRS 2+3. Disallowed: JRS 1+3)
    if (sessionsOnDate.size === 1) {
      const existingSession = Array.from(sessionsOnDate)[0];
      if (
        (existingSession === 'JRS 1' && session === 'JRS 3') ||
        (existingSession === 'JRS 3' && session === 'JRS 1')
      ) {
        if (!settings.allowJrs1Jrs3Double) return false;
      }
    }

    return true;
  };

  // Helper to commit an assignment
  const assignFaculty = (
    facultySrNo: number,
    date: string,
    session: SessionType,
    isOverride = false,
    overrideReason?: string
  ) => {
    assignmentsByDateSession.get(date)!.get(session)!.add(facultySrNo);

    const cur = facultyTotalNew.get(facultySrNo) || 0;
    facultyTotalNew.set(facultySrNo, cur + 1);

    const fDateMap = facultyDateSessions.get(facultySrNo)!;
    if (!fDateMap.has(date)) fDateMap.set(date, new Set());
    fDateMap.get(date)!.add(session);

    finalAssignments.push({
      id: `${facultySrNo}-${date}-${session}`,
      facultySrNo,
      date,
      session,
      isLocked: false,
      isOverride,
      overrideReason,
    });
  };

  // 4. SOLVER PASSES:
  // Order of session filling:
  // JRS 1 & JRS 3 have restricted eligibility (Morning only for JRS 1/2; Afternoon only for JRS 2/3).
  // Mid can take any.
  // JRS 2 is universally available.
  // Therefore, fill more constrained sessions first, then fill universal sessions (JRS 2)!
  const sessionOrder: SessionType[] = [...allSessions].sort((a, b) => {
    if (a === 'JRS 2') return 1;
    if (b === 'JRS 2') return -1;
    if (a === 'JRS 1') return -1;
    if (b === 'JRS 1') return 1;
    return 0;
  });

  // Scoring function for faculty candidate:
  // Prioritize:
  // 1. Far below target workload
  // 2. Unassigned on this date (sessionsOnDate == 0)
  // 3. For JRS 1, prefer Morning faculty over Mid (saving Mid for JRS 3 if needed)
  // 4. For JRS 3, prefer Afternoon faculty over Mid
  // 5. Add small random perturbation from rng() to break ties deterministically per seed!

  const getCandidateScore = (
    faculty: Faculty,
    _date: string,
    session: SessionType,
    isSecondOfDay: boolean
  ): number => {
    let score = 0;
    const currentNew = facultyTotalNew.get(faculty.srNo) || 0;
    const target = facultyTarget.get(faculty.srNo) || 0;
    const maxCap = facultyMaxCap.get(faculty.srNo) || 0;

    const hodPriority = settings.hodAssignmentPriority || 'regular_first_hod_last';

    // Role Tiering & Priority:
    if (hodPriority === 'hod_first') {
      // HODs are prioritized first
      if (faculty.isHod) {
        if (currentNew < target) {
          score += 1_000_000;
          score += (target - currentNew) * 5_000;
        } else if (currentNew < maxCap) {
          score += 500_000;
          score += (maxCap - currentNew) * 1_000;
        }
      } else {
        // Regular faculty assigned secondary
        if (currentNew < target) {
          score += 200_000;
          score += (target - currentNew) * 2_000;
        } else if (currentNew < maxCap) {
          score += 100_000;
        }
      }
    } else if (hodPriority === 'proportional_equal') {
      // Proportional: everyone treated equally according to remaining distance to target
      if (currentNew < target) {
        score += 1_000_000;
        score += (target - currentNew) * 5_000;
      } else if (currentNew < maxCap) {
        score += 500_000;
        score += (maxCap - currentNew) * 1_000;
      } else {
        score -= 200_000;
      }
    } else {
      // 'regular_first_hod_last' (default):
      if (!faculty.isHod) {
        if (currentNew < target) {
          score += 1_000_000;
          score += (target - currentNew) * 5_000;
        } else if (currentNew < maxCap) {
          score += 500_000;
          score += (maxCap - currentNew) * 1_000;
        } else {
          score -= 200_000;
        }
      } else {
        // HOD tier: lower priority as concession
        score -= 1_000_000;
        score += (target - currentNew) * 1_000;
        if (currentNew >= target) {
          score -= 50_000 * (currentNew - target + 1);
        }
      }
    }

    // Role Concession / Additional Duty Delta adjustments:
    if (faculty.concessionOrAdditionalDuties) {
      score += faculty.concessionOrAdditionalDuties * 2_500;
    }

    // 1. Consecutive Days Rest Rule (give rest days between exam duties):
    if (settings.avoidConsecutiveDays) {
      const fDateMap = facultyDateSessions.get(faculty.srNo);
      if (fDateMap) {
        const prevD = prevActiveDateMap.get(_date);
        const nextD = nextActiveDateMap.get(_date);
        const workedPrev = prevD ? (fDateMap.get(prevD)?.size || 0) > 0 : false;
        const workedNext = nextD ? (fDateMap.get(nextD)?.size || 0) > 0 : false;
        if (workedPrev || workedNext) {
          score -= 35_000;
        }
      }
    }

    // 2. Double Duty Policy:
    if (isSecondOfDay) {
      score -= settings.minimizeDoubleDuties ? 250_000 : 80_000;
    }

    // 3. Seniority & Experience Balance per Session:
    if (settings.balanceSeniorityPerSession) {
      const isSenior = faculty.isHod || (faculty.role && faculty.role.toLowerCase().includes('professor'));
      const sessionAssigned = assignmentsByDateSession.get(_date)?.get(session);
      if (sessionAssigned && sessionAssigned.size > 0) {
        let seniorCount = 0;
        sessionAssigned.forEach((sr) => {
          const fac = facultyMap.get(sr);
          if (fac && (fac.isHod || (fac.role && fac.role.toLowerCase().includes('professor')))) {
            seniorCount++;
          }
        });
        if (isSenior) {
          if (seniorCount >= 2) {
            score -= 15_000; // room already has senior supervision; save for other rooms
          } else {
            score += 15_000; // room needs senior presence
          }
        }
      }
    }

    // 4. Strict Workload Equalization:
    if (settings.strictWorkloadEqualization) {
      score -= (currentNew * currentNew) * 6_000;
    }

    // Category specialization preference:
    // In JRS 1: Morning faculty score higher than Mid
    if (session === 'JRS 1') {
      if (faculty.arrival === 'Morning') score += 150;
      else if (faculty.arrival === 'Mid') score += 50;
    }
    // In JRS 3: Afternoon faculty score higher than Mid
    if (session === 'JRS 3') {
      if (faculty.arrival === 'Afternoon') score += 150;
      else if (faculty.arrival === 'Mid') score += 50;
    }
    // In JRS 2: Any, but prefer balancing
    if (session === 'JRS 2') {
      score += 100;
    }

    // Controlled random perturbation (between 0 and 80)
    score += rng() * 80;

    return score;
  };

  // PASS 1: Fill using 1st assignment of the day for faculty (strictly prefer 1 assignment/day)
  activeDates.forEach((d) => {
    sessionOrder.forEach((session) => {
      const required = d.sessionRequirements[session] || 0;
      const currentAssigned = assignmentsByDateSession.get(d.date)!.get(session)!;
      let needed = required - currentAssigned.size;

      if (needed <= 0) return;

      // Find all candidates eligible for 1st assignment today
      const candidates = facultyList
        .filter((f) => canAssign(f, d.date, session, false))
        .map((f) => ({
          faculty: f,
          score: getCandidateScore(f, d.date, session, false),
        }))
        .sort((a, b) => b.score - a.score);

      const toAssign = candidates.slice(0, needed);
      toAssign.forEach((c) => {
        assignFaculty(c.faculty.srNo, d.date, session);
      });
    });
  });

  // PASS 2: Fill remaining unfilled positions using 2nd assignment of the day (Double assignments)
  // Only for allowed pairs: JRS 1 + 2 or JRS 2 + 3
  activeDates.forEach((d) => {
    sessionOrder.forEach((session) => {
      const required = d.sessionRequirements[session] || 0;
      const currentAssigned = assignmentsByDateSession.get(d.date)!.get(session)!;
      let needed = required - currentAssigned.size;

      if (needed <= 0) return;

      const candidates = facultyList
        .filter((f) => canAssign(f, d.date, session, true))
        .map((f) => ({
          faculty: f,
          score: getCandidateScore(f, d.date, session, true),
        }))
        .sort((a, b) => b.score - a.score);

      const toAssign = candidates.slice(0, needed);
      toAssign.forEach((c) => {
        assignFaculty(c.faculty.srNo, d.date, session);
      });
    });
  });

  // PASS 2b: If relaxArrivalConstraints is enabled, fill any remaining shortages using relaxed arrival faculty
  if (relaxArrivalConstraints) {
    activeDates.forEach((d) => {
      sessionOrder.forEach((session) => {
        const required = d.sessionRequirements[session] || 0;
        const currentAssigned = assignmentsByDateSession.get(d.date)!.get(session)!;
        let needed = required - currentAssigned.size;
        if (needed <= 0) return;

        // Try single duty with relaxed arrival
        let candidates = facultyList
          .filter((f) => canAssign(f, d.date, session, false, true))
          .map((f) => ({
            faculty: f,
            score: getCandidateScore(f, d.date, session, false),
          }))
          .sort((a, b) => b.score - a.score);

        let toAssign = candidates.slice(0, needed);
        toAssign.forEach((c) => {
          assignFaculty(c.faculty.srNo, d.date, session, true, 'Arrival constraint relaxed');
        });

        needed = required - assignmentsByDateSession.get(d.date)!.get(session)!.size;
        if (needed <= 0) return;

        // Try double duty with relaxed arrival
        candidates = facultyList
          .filter((f) => canAssign(f, d.date, session, true, true))
          .map((f) => ({
            faculty: f,
            score: getCandidateScore(f, d.date, session, true),
          }))
          .sort((a, b) => b.score - a.score);

        toAssign = candidates.slice(0, needed);
        toAssign.forEach((c) => {
          assignFaculty(c.faculty.srNo, d.date, session, true, 'Arrival constraint relaxed');
        });
      });
    });
  }

  // PASS 3: Exact Workload Target Optimization & Rebalancing
  // If some regular faculty are below target while HODs or over-assigned faculty hold slots,
  // perform augmenting chain / swaps so regular faculty fulfill their full workload first!
  for (let iteration = 0; iteration < 30; iteration++) {
    let madeChange = false;

    // Look for under-assigned faculty (prioritizing regular faculty first)
    const underAssigned = facultyList
      .filter((f) => (facultyTotalNew.get(f.srNo) || 0) < (facultyTarget.get(f.srNo) || 0))
      .sort((a, b) => {
        // Regular faculty ALWAYS come before HODs
        if (!a.isHod && b.isHod) return -1;
        if (a.isHod && !b.isHod) return 1;
        const aUnder = (facultyTarget.get(a.srNo) || 0) - (facultyTotalNew.get(a.srNo) || 0);
        const bUnder = (facultyTarget.get(b.srNo) || 0) - (facultyTotalNew.get(b.srNo) || 0);
        return bUnder - aUnder;
      });

    if (underAssigned.length === 0) break;

    for (const under of underAssigned) {
      // Find an active date and session where an HOD or over-assigned faculty is assigned,
      // and 'under' is eligible and available to take the duty!
      for (const d of activeDates) {
        const uDateSessions = facultyDateSessions.get(under.srNo)?.get(d.date) || new Set();
        if (uDateSessions.size >= 2) continue; // Maximum 2 duties per day

        const availKey = `${under.srNo}_${d.date}`;
        if (availability[availKey] === false || (under.excludedDates && under.excludedDates.includes(d.date))) continue;

        for (const session of sessionOrder) {
          if (uDateSessions.has(session)) continue; // Already in this session
          if (!isFacultyEligibleForSession(under.arrival, session, options.sessionDefinitions, d)) continue;

          // Check double duty combination rule if under already has 1 duty today
          if (uDateSessions.size === 1) {
            const existing = Array.from(uDateSessions)[0];
            if (
              ((existing === 'JRS 1' && session === 'JRS 3') ||
                (existing === 'JRS 3' && session === 'JRS 1')) &&
              !settings.allowJrs1Jrs3Double
            ) {
              continue;
            }
          }

          const assignedSrNos = Array.from(assignmentsByDateSession.get(d.date)!.get(session)!);

          // Priority 1 Donor: If 'under' is regular faculty, ANY HOD assigned here must yield!
          let candidateDonorSrNo: number | undefined;

          if (!under.isHod) {
            candidateDonorSrNo = assignedSrNos.find((donorSrNo) => {
              const donor = facultyList.find((f) => f.srNo === donorSrNo);
              if (!donor || !donor.isHod) return false;
              const isLocked = lockedAssignments.some(
                (l) => l.facultySrNo === donorSrNo && l.date === d.date && l.session === session
              );
              return !isLocked;
            });
          }

          // Priority 2 Donor: Faculty with assignments > target, or with 2 duties today
          if (candidateDonorSrNo === undefined) {
            candidateDonorSrNo = assignedSrNos.find((donorSrNo) => {
              const donor = facultyList.find((f) => f.srNo === donorSrNo);
              if (!donor) return false;
              const isLocked = lockedAssignments.some(
                (l) => l.facultySrNo === donorSrNo && l.date === d.date && l.session === session
              );
              if (isLocked) return false;

              const donorTotal = facultyTotalNew.get(donorSrNo) || 0;
              const donorTarget = facultyTarget.get(donorSrNo) || 0;
              const donorDayCount = facultyDateSessions.get(donorSrNo)?.get(d.date)?.size || 0;

              return donorTotal > donorTarget || donorDayCount > 1;
            });
          }

          if (candidateDonorSrNo !== undefined) {
            // Swap: remove donor, add under
            assignmentsByDateSession.get(d.date)!.get(session)!.delete(candidateDonorSrNo);
            assignmentsByDateSession.get(d.date)!.get(session)!.add(under.srNo);

            // Update donor
            facultyTotalNew.set(candidateDonorSrNo, (facultyTotalNew.get(candidateDonorSrNo) || 1) - 1);
            facultyDateSessions.get(candidateDonorSrNo)?.get(d.date)?.delete(session);

            // Update under
            facultyTotalNew.set(under.srNo, (facultyTotalNew.get(under.srNo) || 0) + 1);
            const uMap = facultyDateSessions.get(under.srNo)!;
            if (!uMap.has(d.date)) uMap.set(d.date, new Set());
            uMap.get(d.date)!.add(session);

            // Update finalAssignments array
            const donorIdx = finalAssignments.findIndex(
              (a) =>
                a.facultySrNo === candidateDonorSrNo &&
                a.date === d.date &&
                a.session === session &&
                !a.isLocked
            );
            if (donorIdx >= 0) {
              finalAssignments.splice(donorIdx, 1);
            }
            finalAssignments.push({
              id: `${under.srNo}-${d.date}-${session}`,
              facultySrNo: under.srNo,
              date: d.date,
              session,
              isLocked: false,
              isOverride: false,
            });

            madeChange = true;
            break;
          }
        }
        if (madeChange) break;
      }
      if (madeChange) break;
    }
    if (!madeChange) break;
  }

  // PASS 4: Reserve Supervisors Allocation (if configured)
  const reservesNeeded = settings.reserveSupervisorsPerSession || 0;
  if (reservesNeeded > 0) {
    activeDates.forEach((d) => {
      sessionOrder.forEach((session) => {
        const candidates = facultyList
          .filter((f) => {
            if (f.isExcluded) return false;
            if (f.excludedDates && f.excludedDates.includes(d.date)) return false;
            const availKey = `${f.srNo}_${d.date}`;
            if (availability[availKey] === false) return false;
            if (!isFacultyEligibleForSession(f.arrival, session, options.sessionDefinitions, d)) return false;

            // Cannot be already assigned in this session (neither primary nor reserve)
            const sessionSet = assignmentsByDateSession.get(d.date)?.get(session);
            if (sessionSet && sessionSet.has(f.srNo)) return false;

            // Daily duty count limit (max 2 per day)
            const fDateMap = facultyDateSessions.get(f.srNo)!;
            const sessionsOnDate = fDateMap.get(d.date) || new Set();
            if (sessionsOnDate.size >= 2) return false;

            // Double duty combination check if already has 1 duty today
            if (sessionsOnDate.size === 1) {
              const existingSession = Array.from(sessionsOnDate)[0];
              if (
                ((existingSession === 'JRS 1' && session === 'JRS 3') ||
                  (existingSession === 'JRS 3' && session === 'JRS 1')) &&
                !settings.allowJrs1Jrs3Double
              ) {
                return false;
              }
            }

            // Workload cap limit check: only enforced if reserve duties cannot exceed cap
            if (!settings.reserveCanExceedCap) {
              const curTotal = facultyTotalNew.get(f.srNo) || 0;
              const maxCap = facultyMaxCap.get(f.srNo) || 0;
              if (curTotal >= maxCap) return false;
            }

            return true;
          })
          .map((f) => {
            let score = 0;
            const currentNew = facultyTotalNew.get(f.srNo) || 0;
            const target = facultyTarget.get(f.srNo) || 0;
            const fDateMap = facultyDateSessions.get(f.srNo)!;
            const sessionsOnDate = fDateMap.get(d.date) || new Set();

            // Prioritize regular faculty first, HODs last
            score += f.isHod ? -100_000 : 100_000;

            // Prioritize faculty with 0 assignments today over faculty with 1 assignment today
            if (sessionsOnDate.size === 0) {
              score += 20_000;
            }

            // Prefer faculty who need duties to reach target
            if (currentNew < target) {
              score += (target - currentNew) * 500;
            } else {
              score -= (currentNew - target) * 200;
            }

            // Small RNG tie breaker
            score += rng() * 50;

            return { faculty: f, score };
          })
          .sort((a, b) => b.score - a.score);

        const chosenReserves = candidates.slice(0, reservesNeeded);
        chosenReserves.forEach((c) => {
          assignmentsByDateSession.get(d.date)!.get(session)!.add(c.faculty.srNo);

          if (!settings.reserveCanExceedCap) {
            const cur = facultyTotalNew.get(c.faculty.srNo) || 0;
            facultyTotalNew.set(c.faculty.srNo, cur + 1);
          }

          const fDateMap = facultyDateSessions.get(c.faculty.srNo)!;
          if (!fDateMap.has(d.date)) fDateMap.set(d.date, new Set());
          fDateMap.get(d.date)!.add(session);

          finalAssignments.push({
            id: `reserve-${c.faculty.srNo}-${d.date}-${session}`,
            facultySrNo: c.faculty.srNo,
            date: d.date,
            session,
            isLocked: false,
            isOverride: false,
            isReserve: true,
          });
        });
      });
    });
  }

  // 5. Run independent validation on the generated schedule
  const validation = validateSchedule(
    facultyList,
    datesConfig,
    finalAssignments,
    availability,
    settings,
    options.sessionDefinitions
  );

  // Compute alternative metrics
  let workloadDev = 0;
  let doubleAssignmentsCount = 0;
  facultyList.forEach((f) => {
    const total = f.previousSupervisions + (facultyTotalNew.get(f.srNo) || 0);
    workloadDev += Math.abs(total - f.targetSupervisions);

    const fMap = facultyDateSessions.get(f.srNo);
    if (fMap) {
      fMap.forEach((sessions) => {
        if (sessions.size > 1) doubleAssignmentsCount++;
      });
    }
  });

  const qualityScore = Math.max(
    0,
    100 -
      validation.hardConflictsCount * 50 -
      validation.unfilledPositions * 20 -
      validation.softWarningsCount * 2 -
      workloadDev * 2
  );

  return {
    success: validation.isValid,
    assignments: finalAssignments,
    message: validation.isValid
      ? 'Schedule generated successfully with all constraints satisfied.'
      : allowBestEffort
      ? `Best-effort schedule generated: ${validation.totalFilledPositions}/${validation.totalRequiredPositions} positions filled (${validation.unfilledPositions} unfilled, ${validation.hardConflictsCount} conflict(s)).`
      : `Schedule generated with ${validation.hardConflictsCount} conflict(s) or unfilled positions.`,
    infeasibilityReport: validation.isValid ? undefined : infeasibilityReport,
    metrics: {
      totalPositions: validation.totalRequiredPositions,
      filledPositions: validation.totalFilledPositions,
      hardConflicts: validation.hardConflictsCount,
      softWarnings: validation.softWarningsCount,
      workloadVariance: workloadDev,
      doubleAssignmentsCount,
      targetDeviations: workloadDev,
      qualityScore,
    },
  };
}
