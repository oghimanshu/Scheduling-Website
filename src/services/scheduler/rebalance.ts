import {
  Faculty,
  ExamDateConfig,
  Assignment,
  SchedulerSettings,
  SessionDefinition,
} from '../../types';
import { isFacultyAvailableForSlot } from '../validation/validator';
import { solveExaminationSchedule, SolverResult } from './solver';

export function rebalanceSchedule(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  currentAssignments: Assignment[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  sessionDefinitions?: SessionDefinition[]
): SolverResult {
  // Extract all locked assignments, ensuring faculty who became unavailable or excluded are evicted
  const facultyMap = new Map(facultyList.map((f) => [f.srNo, f]));
  const lockedAssignments = currentAssignments.filter((a) => {
    if (!a.isLocked) return false;
    const fac = facultyMap.get(a.facultySrNo);
    if (!fac || fac.isExcluded) return false;
    return isFacultyAvailableForSlot(fac, a.date, a.session, availability);
  });

  // Generate rebalanced schedule while strictly preserving valid locked assignments
  const result = solveExaminationSchedule(
    facultyList,
    datesConfig,
    availability,
    settings,
    {
      seed: (settings.randomSeed || 42) + 999,
      preserveLocked: true,
      lockedAssignments,
      sessionDefinitions,
      allowBestEffort: true,
    }
  );

  return result;
}
