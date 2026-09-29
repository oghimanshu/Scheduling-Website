import {
  Faculty,
  ExamDateConfig,
  Assignment,
  SchedulerSettings,
  ScheduleAlternative,
  SessionDefinition,
} from '../../types';
import { solveExaminationSchedule } from './solver';

export function generateFiveAlternatives(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  lockedAssignments: Assignment[] = [],
  sessionDefinitions?: SessionDefinition[]
): { alternatives: ScheduleAlternative[]; error?: string } {
  const baseSeed = settings.randomSeed || 42;
  const seeds = [
    baseSeed,
    baseSeed + 107,
    baseSeed + 269,
    baseSeed + 431,
    baseSeed + 613,
  ];

  const alternatives: ScheduleAlternative[] = [];

  for (let i = 0; i < 5; i++) {
    const seed = seeds[i];
    const result = solveExaminationSchedule(
      facultyList,
      datesConfig,
      availability,
      settings,
      {
        seed,
        preserveLocked: true,
        lockedAssignments,
        sessionDefinitions,
      }
    );

    if (!result.success && i === 0 && result.infeasibilityReport) {
      return {
        alternatives: [],
        error: result.message,
      };
    }

    if (result.metrics) {
      alternatives.push({
        id: `alt-${i + 1}-${seed}`,
        name: `Schedule Alternative #${i + 1}`,
        seed,
        assignments: result.assignments,
        metrics: result.metrics,
        explanation: [
          `Satisfies all ${result.metrics.filledPositions}/${result.metrics.totalPositions} required positions.`,
          `Preserved ${lockedAssignments.length} locked assignment(s).`,
          `Double-duty assignments: ${result.metrics.doubleAssignmentsCount}.`,
          `Workload deviation from targets: ${result.metrics.targetDeviations}.`,
          `Tie-breaker seed: ${seed}.`,
        ],
      });
    }
  }

  return { alternatives };
}

export function generateSingleAlternative(
  facultyList: Faculty[],
  datesConfig: ExamDateConfig[],
  availability: Record<string, boolean>,
  settings: SchedulerSettings,
  seed: number,
  lockedAssignments: Assignment[] = [],
  sessionDefinitions?: SessionDefinition[]
): ScheduleAlternative | null {
  const result = solveExaminationSchedule(
    facultyList,
    datesConfig,
    availability,
    settings,
    {
      seed,
      preserveLocked: true,
      lockedAssignments,
      sessionDefinitions,
    }
  );

  if (!result.metrics) return null;

  return {
    id: `alt-custom-${seed}`,
    name: `Schedule (Seed ${seed})`,
    seed,
    assignments: result.assignments,
    metrics: result.metrics,
    explanation: [
      `Satisfies ${result.metrics.filledPositions}/${result.metrics.totalPositions} required positions.`,
      `Preserved ${lockedAssignments.length} locked assignment(s).`,
      `Double-duty assignments: ${result.metrics.doubleAssignmentsCount}.`,
      `Tie-breaker seed: ${seed}.`,
    ],
  };
}
