// Core Domain Types for Examination Supervision Scheduler

export type ArrivalCategory = 'Morning' | 'Mid' | 'Afternoon';

export type SessionType = string;

export const DEFAULT_SESSION_TYPES: SessionType[] = ['JRS 1', 'JRS 2', 'JRS 3'];

export interface SessionTiming {
  start: string; // e.g., '08:00'
  end: string;   // e.g., '10:00'
}

export interface SessionDefinition {
  id: string; // e.g. 'JRS 1', 'JRS 2', 'JRS 3', 'JRS 4'
  name: string;
  defaultTiming: SessionTiming;
  defaultRequirement: number;
  eligibleArrivals: ArrivalCategory[]; // which arrival categories can supervise this session
}

export interface Faculty {
  srNo: number;             // Preserves original Sr. No. from CSV (e.g., starts at 4)
  name: string;
  isHod: boolean;
  arrival: ArrivalCategory;
  previousSupervisions: number; // Carried in from previous period
  targetSupervisions: number;   // Target workload (default: 6 for regular, 4 for HOD)
  maxSupervisions: number;      // Maximum allowed (default: 6 for regular, 4 for HOD, editable)
  isExcluded?: boolean;         // When true, faculty is excluded from duties in this period
  exclusionReason?: string;     // e.g., 'Sabbatical', 'Medical Leave', 'Exam Committee', 'Other'
  notes?: string;
}

export type ExclusionReason = 'Holiday' | 'No Examination' | 'Other';

export interface ExamDateConfig {
  date: string;              // ISO format 'YYYY-MM-DD'
  displayDate: string;       // Formatted 'DD/MM/YYYY' or '06 Oct 2026'
  dayOfWeek: string;         // 'Monday', etc.
  isExcluded: boolean;       // Holiday / non-exam day
  exclusionReason?: ExclusionReason;
  sessionRequirements: Record<SessionType, number>; // e.g. { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15, 'JRS 4': 10 }
  sessionTimings: Record<SessionType, SessionTiming>;
}

export interface Assignment {
  id: string;                // Unique ID: `${facultySrNo}-${date}-${session}`
  facultySrNo: number;
  date: string;              // 'YYYY-MM-DD'
  session: SessionType;
  isLocked: boolean;         // Cannot be altered by optimizer or rebalancer
  isOverride: boolean;       // Overridden constraint (eligibility or max workload)
  overrideReason?: string;
  overrideTimestamp?: string;
  assignedBy?: string;       // Admin identifier if authenticated
}

export interface ValidationConflict {
  id: string;
  type: 'hard' | 'soft';
  category:
    | 'unavailability'
    | 'ineligibility'
    | 'daily_limit'
    | 'overlapping'
    | 'max_workload'
    | 'staffing_deficit'
    | 'staffing_surplus'
    | 'locked_violation'
    | 'excluded_date'
    | 'excluded_faculty'
    | 'duplicate_in_session'
    | 'jrs1_jrs3_combination'
    | 'target_deviation'
    | 'workload_imbalance'
    | 'date_concentration';
  message: string;
  facultySrNo?: number;
  facultyName?: string;
  date?: string;
  session?: SessionType;
}

export interface ValidationSummary {
  totalRequiredPositions: number;
  totalFilledPositions: number;
  unfilledPositions: number;
  totalFacultyCount: number;
  activeFacultyCount: number;
  excludedFacultyCount: number;
  regularCount: number;
  hodCount: number;
  hardConflictsCount: number;
  softWarningsCount: number;
  regularAtTargetCount: number;
  hodAtTargetCount: number;
  regularWorkloadDistribution: Record<number, number>; // workload -> count
  hodWorkloadDistribution: Record<number, number>;
  conflicts: ValidationConflict[];
  isValid: boolean;
}

export interface ScheduleAlternative {
  id: string;
  name: string;
  seed: number;
  assignments: Assignment[];
  metrics: {
    totalPositions: number;
    filledPositions: number;
    hardConflicts: number;
    softWarnings: number;
    workloadVariance: number;
    doubleAssignmentsCount: number;
    targetDeviations: number;
    qualityScore: number; // 0-100
  };
  explanation?: string[];
}

export interface AdministratorOverride {
  id: string;
  assignmentId: string;
  facultySrNo: number;
  facultyName: string;
  date: string;
  session: SessionType;
  overrideType: 'eligibility' | 'workload' | 'double_combination';
  reason: string;
  timestamp: string;
  adminName?: string;
}

export interface SchedulerSettings {
  allowJrs1Jrs3Double: boolean; // Default false
  defaultRegularMax: number;    // Default 6
  defaultHodMax: number;        // Default 4
  defaultJrs1Required: number;  // Default 17
  defaultJrs2Required: number;  // Default 25
  defaultJrs3Required: number;  // Default 15
  defaultSessionTimings: Record<SessionType, SessionTiming>;
  randomSeed: number;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface ProjectState {
  version: string;
  projectName: string;
  faculty: Faculty[];
  sessions: SessionDefinition[]; // Dynamic list of examination sessions
  examPeriod: {
    name: string;
    startDate: string;
    endDate: string;
    dates: ExamDateConfig[];
  };
  availability: Record<string, boolean>; // key: `${facultySrNo}_${date}` -> true if available, false if unavailable
  activeScheduleId: string | null;
  assignments: Assignment[];
  alternatives: ScheduleAlternative[];
  overrides: AdministratorOverride[];
  settings: SchedulerSettings;
  lastSavedTimestamp?: string;
}
