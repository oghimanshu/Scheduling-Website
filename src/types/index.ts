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

export type HodAssignmentPriority = 'regular_first_hod_last' | 'hod_first' | 'proportional_equal';

export interface CustomRoleDefinition {
  id: string;
  name: string;             // e.g. 'Professor', 'Associate Professor', 'Assistant Professor', 'Visiting'
  defaultTarget: number;    // e.g. 4, 6, 8
  defaultMax: number;       // e.g. 4, 6, 8
  concessionDelta: number;  // negative for concession (fewer duties), positive for additional duties
  schedulingPriority: 'concession_last' | 'standard' | 'priority_first';
  color?: string;           // Badge color e.g. 'indigo', 'sky', 'emerald', 'amber', 'purple'
}

export const DEFAULT_CUSTOM_ROLES: CustomRoleDefinition[] = [
  {
    id: 'hod',
    name: 'HOD',
    defaultTarget: 4,
    defaultMax: 4,
    concessionDelta: -2,
    schedulingPriority: 'concession_last',
    color: 'indigo',
  },
  {
    id: 'professor',
    name: 'Senior Professor',
    defaultTarget: 4,
    defaultMax: 4,
    concessionDelta: -2,
    schedulingPriority: 'concession_last',
    color: 'purple',
  },
  {
    id: 'regular',
    name: 'Regular Faculty',
    defaultTarget: 6,
    defaultMax: 6,
    concessionDelta: 0,
    schedulingPriority: 'standard',
    color: 'sky',
  },
  {
    id: 'assistant_prof',
    name: 'Assistant Professor',
    defaultTarget: 6,
    defaultMax: 6,
    concessionDelta: 0,
    schedulingPriority: 'standard',
    color: 'emerald',
  },
  {
    id: 'adjunct',
    name: 'Visiting / Additional Duty',
    defaultTarget: 8,
    defaultMax: 8,
    concessionDelta: 2,
    schedulingPriority: 'priority_first',
    color: 'amber',
  },
];

export interface Faculty {
  srNo: number;             // Preserves original Sr. No. from CSV (e.g., starts at 4)
  name: string;
  isHod: boolean;
  role?: string;            // Segregated custom role name (e.g. 'HOD', 'Regular', 'Senior Professor', etc.)
  concessionOrAdditionalDuties?: number; // Delta to baseline workload (+ for additional, - for concession)
  department?: string;      // Optional department / discipline
  arrival: ArrivalCategory;
  previousSupervisions: number; // Carried in from previous period
  targetSupervisions: number;   // Target workload (default: 6 for regular, 4 for HOD)
  maxSupervisions: number;      // Maximum allowed (default: 6 for regular, 4 for HOD, editable)
  isExcluded?: boolean;         // When true, faculty is excluded from duties in this period
  exclusionReason?: string;     // e.g., 'Sabbatical', 'Medical Leave', 'Exam Committee', 'Other'
  excludedDates?: string[];     // Specific exam dates when faculty is on leave / excluded
  allowedSessions?: SessionType[]; // Specific sessions faculty can be assigned to (e.g. ['JRS 1'])
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
  sessionArrivals?: Record<SessionType, ArrivalCategory[]>; // Overrides per date-session, fallback to session.eligibleArrivals
}

export interface SubstituteCandidate {
  faculty: Faculty;
  currentDutyCount: number;
  isAvailable: boolean;
  isEligibleArrival: boolean;
  hasOverlappingDuty: boolean;
  isEligible: boolean;
  score: number;
  conflictReasons: string[];
}

export interface ExamRoom {
  id: string;
  name: string;
  block?: string;
  capacity: number;
  invigilatorsRequired: number;
  isActive: boolean;
  floor?: string;
}

export interface ExamSubject {
  id: string;
  code: string;
  name: string;
  department?: string;
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
  isReserve?: boolean;       // When true, assigned as standby/reserve supervisor
  roomId?: string;           // Assigned Exam Hall / Room ID
  roomName?: string;         // Room Name & Block (e.g. "Hall 101, Science Block")
  subjectName?: string;      // Course / Subject Name
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

export type TabType =
  | 'dashboard'
  | 'faculty'
  | 'roles'
  | 'period'
  | 'rooms'
  | 'availability'
  | 'schedule'
  | 'instructions';

export interface CloudUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface CloudSessionSummary {
  id: string;
  projectName: string;
  examPeriodName: string;
  facultyCount: number;
  assignmentsCount: number;
  updatedAt: string;
  savedBy?: string;
  savedByEmail?: string;
}

export interface GoogleDriveFileSummary {
  id: string;
  name: string;
  projectName: string;
  examPeriodName?: string;
  facultyCount: number;
  assignmentsCount: number;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export interface GoogleDriveSyncStatus {
  isConfigured: boolean;
  isSignedIn: boolean;
  isSyncing: boolean;
  user: CloudUser | null;
  lastSyncedTimestamp?: string | null;
  folderId?: string | null;
  folderWebViewLink?: string | null;
  error?: string | null;
  clientId?: string;
}

export interface FolderSyncStatus {
  isConnected: boolean;
  folderName: string | null;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  isSupported: boolean;
  error: string | null;
}

export interface FolderFileSummary {
  name: string;
  projectName: string;
  examPeriodName?: string;
  facultyCount: number;
  assignmentsCount: number;
  modifiedTime: string;
  size?: string;
}



export interface SchedulerSettings {
  allowJrs1Jrs3Double: boolean; // Default false
  defaultRegularMax: number;    // Default 6
  defaultHodMax: number;        // Default 4
  hodAssignmentPriority: HodAssignmentPriority; // 'regular_first_hod_last' | 'hod_first' | 'proportional_equal'
  customRoles: CustomRoleDefinition[];
  avoidConsecutiveDays: boolean;            // Avoid duties on back-to-back days
  minimizeDoubleDuties: boolean;            // Minimize 2 duties on same day
  balanceSeniorityPerSession: boolean;      // Mix senior faculty with junior faculty in each session
  strictWorkloadEqualization: boolean;      // Keep duty counts identical across peers
  promptGenerationOptions: boolean;         // Show options popup before generating
  defaultJrs1Required: number;  // Default 17
  defaultJrs2Required: number;  // Default 25
  defaultJrs3Required: number;  // Default 15
  defaultSessionTimings: Record<SessionType, SessionTiming>;
  randomSeed: number;
  reserveSupervisorsPerSession: number; // Number of reserve supervisors per session (default 0)
  reserveCanExceedCap: boolean;          // Whether reserve duties can exceed workload limit (default false)
  allowBestEffort?: boolean;            // When true, generate best-effort schedule even if infeasible (default: true)
  relaxArrivalConstraints?: boolean;    // When true, allow Mid/Afternoon arrivals to cover Morning/JRS 1 when exhausted
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface SigningAuthority {
  id: string;
  name: string;        // e.g. "Dr. R. K. Sharma" (or empty for blank signature line)
  role: string;        // e.g. "Controller of Examinations", "Chief Superintendent"
  department?: string; // e.g. "Examination Branch"
}

export interface InstitutionalHeaderConfig {
  institutionName: string;                   // e.g. "College of Engineering & Technology"
  subHeader?: string;                        // e.g. "Affiliated to State Technological University"
  address?: string;                          // e.g. "Main Campus, University Road"
  officeTitle?: string;                      // e.g. "Office of the Controller of Examinations"
  examTitle?: string;                        // e.g. "End Semester Examinations"
  logoUrl?: string;                          // Base64 image data or URL (optional)
  logoPlacement?: 'left' | 'center' | 'none'; // Default 'left'
  signingAuthorities: SigningAuthority[];
  invigilatorAckLabel?: string;              // Default: "Invigilator's Acknowledgment"
  customInstructions?: string;               // Custom notes at bottom of duty slip
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
  institution?: InstitutionalHeaderConfig;
  rooms: ExamRoom[];
  subjects?: ExamSubject[];
  lastSavedTimestamp?: string;
}
