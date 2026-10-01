import {
  Faculty,
  ExamDateConfig,
  Assignment,
  SessionType,
  SchedulerSettings,
} from '../../types';
import { isFacultyEligibleForSession, isFacultyAvailableForSlot } from './validator';

export interface InfeasibilityBottleneck {
  date: string;
  displayDate: string;
  session: SessionType;
  required: number;
  availableEligibleCount: number;
  availableEligibleNames: string[];
  facultyAtMaxCount: number;
  unavailableCount: number;
  lockedCount: number;
  shortage: number;
  explanation: string;
}

export interface InfeasibilityReport {
  isInfeasible: boolean;
  overallReason?: string;
  totalRequired: number;
  totalCapacity: number;
  capacityDeficit: number;
  bottlenecks: InfeasibilityBottleneck[];
  recommendedActions: string[];
}

export function analyzeInfeasibility(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  assignments: Assignment[],
  availability: Record<string, boolean>,
  _settings: SchedulerSettings,
  sessionDefinitions?: any[]
): InfeasibilityReport {
  const activeDates = datesConfig.filter((d) => !d.isExcluded);

  // Determine all active sessions
  const allSessionsSet = new Set<string>();
  if (sessionDefinitions && sessionDefinitions.length > 0) {
    sessionDefinitions.forEach((s: any) => allSessionsSet.add(s.id));
  } else {
    allSessionsSet.add('JRS 1');
    allSessionsSet.add('JRS 2');
    allSessionsSet.add('JRS 3');
  }
  activeDates.forEach((d) => {
    Object.keys(d.sessionRequirements).forEach((s) => allSessionsSet.add(s));
  });
  const sessionList = Array.from(allSessionsSet);

  // 1. Total capacity vs total required
  let totalRequired = 0;
  activeDates.forEach((d) => {
    sessionList.forEach((s) => {
      totalRequired += d.sessionRequirements[s] || 0;
    });
  });

  let totalCapacity = 0;
  facultyList.forEach((f) => {
    if (f.isExcluded) return; // Excluded faculty do not contribute capacity
    const remaining = Math.max(0, f.maxSupervisions - f.previousSupervisions);
    totalCapacity += remaining;
  });

  const bottlenecks: InfeasibilityBottleneck[] = [];
  const recommendedActions = new Set<string>();

  if (totalCapacity < totalRequired) {
    const deficit = totalRequired - totalCapacity;
    recommendedActions.add(`Total active faculty capacity (${totalCapacity}) is less than required positions (${totalRequired}). Deficit: ${deficit}. Re-include excluded faculty, increase individual HOD or regular faculty maximums, or reduce required supervisors.`);
  }

  // 2. Check each active date and session for eligibility/availability/daily limit bottlenecks
  activeDates.forEach((d) => {
    sessionList.forEach((session) => {
      const required = d.sessionRequirements[session] || 0;
      if (required === 0) return;

      let eligibleCount = 0;
      const eligibleNames: string[] = [];
      let facultyAtMax = 0;
      let unavailableCount = 0;

      // Count locked in this session
      const lockedInThisSession = assignments.filter(
        (a) => a.date === d.date && a.session === session && a.isLocked
      ).length;

      facultyList.forEach((f) => {
        if (!isFacultyAvailableForSlot(f, d.date, session, availability)) {
          unavailableCount++;
          return;
        }

        const remaining = f.maxSupervisions - f.previousSupervisions;
        if (remaining <= 0) {
          facultyAtMax++;
          return;
        }

        const isEligible = isFacultyEligibleForSession(f.arrival, session, sessionDefinitions, d);
        if (isEligible) {
          eligibleCount++;
          eligibleNames.push(f.name);
        }
      });

      // If available and eligible candidates are fewer than required positions
      if (eligibleCount < required) {
        const shortage = required - eligibleCount;
        bottlenecks.push({
          date: d.date,
          displayDate: d.displayDate,
          session,
          required,
          availableEligibleCount: eligibleCount,
          availableEligibleNames: eligibleNames,
          facultyAtMaxCount: facultyAtMax,
          unavailableCount,
          lockedCount: lockedInThisSession,
          shortage,
          explanation: `On ${d.displayDate}, ${session} requires ${required} supervisors, but only ${eligibleCount} faculty are available and eligible. Shortage: ${shortage}.`,
        });

        recommendedActions.add(
          `On ${d.displayDate} (${session}): Mark more faculty as available, lower the staffing requirement from ${required} to ${eligibleCount}, or authorize an eligibility override.`
        );
      }
    });

    // Check daily capacity limit: daily total required vs 2 * available faculty
    const dailyTotalRequired = (d.sessionRequirements['JRS 1'] || 0) +
      (d.sessionRequirements['JRS 2'] || 0) +
      (d.sessionRequirements['JRS 3'] || 0);

    const availableOnDate = facultyList.filter((f) => availability[`${f.srNo}_${d.date}`] !== false).length;
    const maxPossibleOnDate = availableOnDate * 2; // Since max 2 per day

    if (dailyTotalRequired > maxPossibleOnDate) {
      recommendedActions.add(
        `On ${d.displayDate}: Total required supervisors (${dailyTotalRequired}) exceeds the absolute physical maximum (2 × ${availableOnDate} available = ${maxPossibleOnDate}). You must make more faculty available or lower requirements.`
      );
    }
  });

  const isInfeasible = totalCapacity < totalRequired || bottlenecks.length > 0;

  return {
    isInfeasible,
    overallReason: isInfeasible
      ? 'No fully valid schedule exists under the current constraints.'
      : undefined,
    totalRequired,
    totalCapacity,
    capacityDeficit: Math.max(0, totalRequired - totalCapacity),
    bottlenecks,
    recommendedActions: Array.from(recommendedActions),
  };
}
