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
  sessionDefinitions?: SessionDefinition[],
  options: { allowBestEffort?: boolean; relaxArrivalConstraints?: boolean } = {}
): { alternatives: ScheduleAlternative[]; error?: string; isInfeasible?: boolean } {
  const baseSeed = settings.randomSeed || 42;
  const seeds = [
    baseSeed,
    baseSeed + 107,
    baseSeed + 269,
    baseSeed + 431,
    baseSeed + 613,
  ];

  const allowBestEffort = options.allowBestEffort ?? settings.allowBestEffort ?? false;
  const relaxArrivalConstraints = options.relaxArrivalConstraints ?? settings.relaxArrivalConstraints ?? false;

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
        allowBestEffort,
        relaxArrivalConstraints,
      }
    );

    if (!result.success && i === 0 && (!allowBestEffort || result.assignments.length === 0)) {
      return {
        alternatives: [],
        error: result.message,
        isInfeasible: true,
      };
    }

    if (result.metrics) {
      const isComplete = result.metrics.filledPositions === result.metrics.totalPositions;
      alternatives.push({
        id: `alt-${i + 1}-${seed}`,
        name: isComplete ? `Schedule Alternative #${i + 1}` : `Best-Effort Alternative #${i + 1}`,
        seed,
        assignments: result.assignments,
        metrics: result.metrics,
        explanation: [
          isComplete
            ? `Satisfies all ${result.metrics.filledPositions}/${result.metrics.totalPositions} required positions.`
            : `Best-effort draft: ${result.metrics.filledPositions}/${result.metrics.totalPositions} positions filled (${result.metrics.totalPositions - result.metrics.filledPositions} unfilled).`,
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
  sessionDefinitions?: SessionDefinition[],
  options: { allowBestEffort?: boolean; relaxArrivalConstraints?: boolean } = {}
): ScheduleAlternative | null {
  const allowBestEffort = options.allowBestEffort ?? settings.allowBestEffort ?? false;
  const relaxArrivalConstraints = options.relaxArrivalConstraints ?? settings.relaxArrivalConstraints ?? false;

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
      allowBestEffort,
      relaxArrivalConstraints,
    }
  );

  if (!result.metrics) return null;

  const isComplete = result.metrics.filledPositions === result.metrics.totalPositions;

  return {
    id: `alt-custom-${seed}`,
    name: isComplete ? `Schedule (Seed ${seed})` : `Best-Effort Draft (Seed ${seed})`,
    seed,
    assignments: result.assignments,
    metrics: result.metrics,
    explanation: [
      isComplete
        ? `Satisfies ${result.metrics.filledPositions}/${result.metrics.totalPositions} required positions.`
        : `Best-effort draft: ${result.metrics.filledPositions}/${result.metrics.totalPositions} positions filled (${result.metrics.totalPositions - result.metrics.filledPositions} unfilled).`,
      `Preserved ${lockedAssignments.length} locked assignment(s).`,
      `Double-duty assignments: ${result.metrics.doubleAssignmentsCount}.`,
      `Tie-breaker seed: ${seed}.`,
    ],
  };
}
