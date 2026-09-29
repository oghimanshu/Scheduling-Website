import {
  Faculty,
  ExamDateConfig,
  Assignment,
  SchedulerSettings,
  SessionDefinition,
} from '../../types';
import { solveExaminationSchedule, SolverResult } from './solver';

export function rebalanceSchedule(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  currentAssignments: Assignment[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  sessionDefinitions?: SessionDefinition[]
): SolverResult {
  // Extract all locked assignments
  const lockedAssignments = currentAssignments.filter((a) => a.isLocked);

  // Generate rebalanced schedule while strictly preserving locked assignments
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
    }
  );

  return result;
}
