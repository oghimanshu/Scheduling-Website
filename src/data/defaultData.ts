import { Faculty, ExamDateConfig, SchedulerSettings, ProjectState, SessionDefinition, InstitutionalHeaderConfig, ExamRoom, ExamSubject } from '../types';

export const DEFAULT_INSTITUTION_CONFIG: InstitutionalHeaderConfig = {
  institutionName: 'College of Engineering & Technology',
  subHeader: 'Autonomous Institution • Affiliated to State Technological University',
  address: 'Main Campus, University Road, Academic Zone',
  officeTitle: 'Office of the Controller of Examinations',
  examTitle: 'End Semester Examinations',
  logoPlacement: 'left',
  signingAuthorities: [
    {
      id: 'auth-1',
      name: '',
      role: 'Chief Superintendent / Controller',
      department: 'Examination Control Division',
    },
  ],
  invigilatorAckLabel: "Invigilator's Acknowledgment",
  customInstructions:
    '1. Report at the Examination Control Room 15 minutes before the session.\n2. Possession of mobile devices or programmable calculators in halls is strictly prohibited.\n3. Return all answer booklets and attendance sheets immediately after the session.',
};

export const DEFAULT_SESSION_TIMINGS = {
  'JRS 1': { start: '08:00', end: '10:00' },
  'JRS 2': { start: '10:30', end: '12:30' },
  'JRS 3': { start: '14:00', end: '16:00' },
};

export const DEFAULT_ROOMS_CONFIG: ExamRoom[] = [
  { id: 'room-101', name: 'Hall 101', block: 'Academic Block A', floor: '1st Floor', capacity: 32, invigilatorsRequired: 1, isActive: true },
  { id: 'room-102', name: 'Hall 102', block: 'Academic Block A', floor: '1st Floor', capacity: 32, invigilatorsRequired: 1, isActive: true },
  { id: 'room-103', name: 'Hall 103', block: 'Academic Block A', floor: '1st Floor', capacity: 32, invigilatorsRequired: 1, isActive: true },
  { id: 'room-104', name: 'Hall 104', block: 'Academic Block A', floor: '1st Floor', capacity: 32, invigilatorsRequired: 1, isActive: true },
  { id: 'room-201', name: 'Hall 201', block: 'Academic Block B', floor: '2nd Floor', capacity: 35, invigilatorsRequired: 1, isActive: true },
  { id: 'room-202', name: 'Hall 202', block: 'Academic Block B', floor: '2nd Floor', capacity: 35, invigilatorsRequired: 1, isActive: true },
  { id: 'room-203', name: 'Hall 203', block: 'Academic Block B', floor: '2nd Floor', capacity: 35, invigilatorsRequired: 1, isActive: true },
  { id: 'room-204', name: 'Hall 204', block: 'Academic Block B', floor: '2nd Floor', capacity: 35, invigilatorsRequired: 1, isActive: true },
  { id: 'room-lt1', name: 'Lecture Theatre 1 (LT-1)', block: 'Science Complex', floor: 'Ground Floor', capacity: 64, invigilatorsRequired: 2, isActive: true },
  { id: 'room-lt2', name: 'Lecture Theatre 2 (LT-2)', block: 'Science Complex', floor: 'Ground Floor', capacity: 64, invigilatorsRequired: 2, isActive: true },
  { id: 'room-lt3', name: 'Lecture Theatre 3 (LT-3)', block: 'Science Complex', floor: '1st Floor', capacity: 64, invigilatorsRequired: 2, isActive: true },
  { id: 'room-audi', name: 'Main Auditorium', block: 'Central Wing', floor: 'Ground Floor', capacity: 120, invigilatorsRequired: 3, isActive: true },
  { id: 'room-seminar', name: 'Central Seminar Hall', block: 'Central Wing', floor: '2nd Floor', capacity: 80, invigilatorsRequired: 2, isActive: true },
  { id: 'room-dh1', name: 'Drawing Hall 1 (DH-1)', block: 'Engineering Annex', floor: '3rd Floor', capacity: 48, invigilatorsRequired: 1, isActive: true },
  { id: 'room-dh2', name: 'Drawing Hall 2 (DH-2)', block: 'Engineering Annex', floor: '3rd Floor', capacity: 48, invigilatorsRequired: 1, isActive: true },
];


export const DEFAULT_DATES_CONFIG: ExamDateConfig[] = [
  {
    date: '2026-10-05',
    displayDate: '05 Oct 2026',
    dayOfWeek: 'Monday',
    isExcluded: true,
    exclusionReason: 'No Examination',
    sessionRequirements: { 'JRS 1': 0, 'JRS 2': 0, 'JRS 3': 0 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-06',
    displayDate: '06 Oct 2026',
    dayOfWeek: 'Tuesday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-07',
    displayDate: '07 Oct 2026',
    dayOfWeek: 'Wednesday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-08',
    displayDate: '08 Oct 2026',
    dayOfWeek: 'Thursday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-09',
    displayDate: '09 Oct 2026',
    dayOfWeek: 'Friday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-10',
    displayDate: '10 Oct 2026',
    dayOfWeek: 'Saturday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-11',
    displayDate: '11 Oct 2026',
    dayOfWeek: 'Sunday',
    isExcluded: true,
    exclusionReason: 'Holiday',
    sessionRequirements: { 'JRS 1': 0, 'JRS 2': 0, 'JRS 3': 0 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
  {
    date: '2026-10-12',
    displayDate: '12 Oct 2026',
    dayOfWeek: 'Monday',
    isExcluded: false,
    sessionRequirements: { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 },
    sessionTimings: DEFAULT_SESSION_TIMINGS,
  },
];

import { DEFAULT_CUSTOM_ROLES } from '../types';

export const DEFAULT_SETTINGS: SchedulerSettings = {
  allowJrs1Jrs3Double: false,
  defaultRegularMax: 6,
  defaultHodMax: 4,
  hodAssignmentPriority: 'regular_first_hod_last',
  customRoles: DEFAULT_CUSTOM_ROLES,
  avoidConsecutiveDays: true,
  minimizeDoubleDuties: true,
  balanceSeniorityPerSession: true,
  strictWorkloadEqualization: true,
  promptGenerationOptions: true,
  defaultJrs1Required: 17,
  defaultJrs2Required: 25,
  defaultJrs3Required: 15,
  defaultSessionTimings: DEFAULT_SESSION_TIMINGS,
  randomSeed: 42,
  reserveSupervisorsPerSession: 0,
  reserveCanExceedCap: false,
};

export const DEFAULT_SESSIONS: SessionDefinition[] = [
  {
    id: 'JRS 1',
    name: 'JRS 1',
    defaultTiming: { start: '08:00', end: '10:00' },
    defaultRequirement: 17,
    eligibleArrivals: ['Morning', 'Mid'],
  },
  {
    id: 'JRS 2',
    name: 'JRS 2',
    defaultTiming: { start: '10:30', end: '12:30' },
    defaultRequirement: 25,
    eligibleArrivals: ['Morning', 'Mid', 'Afternoon'],
  },
  {
    id: 'JRS 3',
    name: 'JRS 3',
    defaultTiming: { start: '14:00', end: '16:00' },
    defaultRequirement: 15,
    eligibleArrivals: ['Mid', 'Afternoon'],
  },
];

export const INITIAL_PROJECT_STATE: ProjectState = {
  version: '1.0.0',
  projectName: 'College Examination Supervision - October 2026',
  faculty: [], // Clean slate on every browser session, requires CSV upload
  sessions: DEFAULT_SESSIONS,
  examPeriod: {
    name: 'End Semester Examinations 2026',
    startDate: '',
    endDate: '',
    dates: [],
  },
  availability: {}, // Default is available
  activeScheduleId: null,
  assignments: [],
  alternatives: [],
  overrides: [],
  settings: DEFAULT_SETTINGS,
  institution: DEFAULT_INSTITUTION_CONFIG,
  rooms: DEFAULT_ROOMS_CONFIG,
  subjects: [],
};

export const EMPTY_SESSION_PROJECT_STATE: ProjectState = {
  version: '1.0.0',
  projectName: 'Examination Supervision Scheduler - Fresh Session',
  faculty: [],
  sessions: DEFAULT_SESSIONS,
  examPeriod: {
    name: 'New Examination Period',
    startDate: '',
    endDate: '',
    dates: [],
  },
  availability: {},
  activeScheduleId: null,
  assignments: [],
  alternatives: [],
  overrides: [],
  settings: DEFAULT_SETTINGS,
  institution: DEFAULT_INSTITUTION_CONFIG,
  rooms: DEFAULT_ROOMS_CONFIG,
  subjects: [],
};
