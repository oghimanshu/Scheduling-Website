import { Faculty, ExamDateConfig, SchedulerSettings, ProjectState, SessionDefinition } from '../types';

export const DEFAULT_SESSION_TIMINGS = {
  'JRS 1': { start: '08:00', end: '10:00' },
  'JRS 2': { start: '10:30', end: '12:30' },
  'JRS 3': { start: '14:00', end: '16:00' },
};


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

export const DEFAULT_SETTINGS: SchedulerSettings = {
  allowJrs1Jrs3Double: false,
  defaultRegularMax: 6,
  defaultHodMax: 4,
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
  faculty: [], // Clean slate on every browser session — requires CSV upload
  sessions: DEFAULT_SESSIONS,
  examPeriod: {
    name: 'End Semester Examinations 2026',
    startDate: '2026-10-05',
    endDate: '2026-10-12',
    dates: DEFAULT_DATES_CONFIG,
  },
  availability: {}, // Default is available
  activeScheduleId: null,
  assignments: [],
  alternatives: [],
  overrides: [],
  settings: DEFAULT_SETTINGS,
};
