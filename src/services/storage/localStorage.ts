import { ProjectState } from '../../types';
import { INITIAL_PROJECT_STATE, DEFAULT_SETTINGS, DEFAULT_SESSIONS, DEFAULT_SESSION_TIMINGS } from '../../data/defaultData';

const SESSION_STORAGE_KEY = 'EXAM_SCHEDULER_SESSION_STATE_V1';

export function saveProjectToStorage(state: ProjectState): string {
  try {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const stateToSave: ProjectState = {
      ...state,
      lastSavedTimestamp: timestamp,
    };
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    }
    return timestamp;
  } catch (error) {
    console.error('Failed to save state to sessionStorage:', error);
    return '';
  }
}

export function loadProjectFromStorage(): { state: ProjectState; loadedFromStorage: boolean } {
  try {
    // Clear legacy localStorage from previous persistent sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('EXAM_SCHEDULER_PROJECT_STATE_V1');
      localStorage.removeItem('EXAM_SCHEDULER_PROJECT_STATE');
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProjectState;
        if (parsed && Array.isArray(parsed.faculty) && parsed.examPeriod && Array.isArray(parsed.examPeriod.dates)) {
          if (!parsed.settings) {
            parsed.settings = { ...INITIAL_PROJECT_STATE.settings };
          }
          if (parsed.settings.reserveSupervisorsPerSession === undefined) {
            parsed.settings.reserveSupervisorsPerSession = 0;
          }
          if (parsed.settings.reserveCanExceedCap === undefined) {
            parsed.settings.reserveCanExceedCap = false;
          }
          if (!parsed.settings.hodAssignmentPriority) {
            parsed.settings.hodAssignmentPriority = DEFAULT_SETTINGS.hodAssignmentPriority;
          }
          if (!parsed.settings.customRoles || !Array.isArray(parsed.settings.customRoles)) {
            parsed.settings.customRoles = DEFAULT_SETTINGS.customRoles;
          }
          if (parsed.settings.avoidConsecutiveDays === undefined) {
            parsed.settings.avoidConsecutiveDays = DEFAULT_SETTINGS.avoidConsecutiveDays;
          }
          if (parsed.settings.minimizeDoubleDuties === undefined) {
            parsed.settings.minimizeDoubleDuties = DEFAULT_SETTINGS.minimizeDoubleDuties;
          }
          if (parsed.settings.balanceSeniorityPerSession === undefined) {
            parsed.settings.balanceSeniorityPerSession = DEFAULT_SETTINGS.balanceSeniorityPerSession;
          }
          if (parsed.settings.strictWorkloadEqualization === undefined) {
            parsed.settings.strictWorkloadEqualization = DEFAULT_SETTINGS.strictWorkloadEqualization;
          }
          if (parsed.settings.promptGenerationOptions === undefined) {
            parsed.settings.promptGenerationOptions = DEFAULT_SETTINGS.promptGenerationOptions;
          }
          if (!Array.isArray(parsed.assignments)) {
            parsed.assignments = [];
          }
          if (!parsed.availability || typeof parsed.availability !== 'object') {
            parsed.availability = {};
          }
          if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
            parsed.sessions = DEFAULT_SESSIONS;
          }
          if (!Array.isArray(parsed.alternatives)) {
            parsed.alternatives = [];
          }
          // Sanitize faculty list
          parsed.faculty.forEach((f) => {
            if (!Array.isArray(f.excludedDates)) {
              f.excludedDates = [];
            }
          });
          // Sanitize exam dates
          parsed.examPeriod.dates.forEach((d) => {
            if (!d.sessionTimings) {
              d.sessionTimings = DEFAULT_SESSION_TIMINGS;
            }
            if (!d.sessionRequirements) {
              d.sessionRequirements = { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 };
            }
          });
          return { state: parsed, loadedFromStorage: true };
        }
      }
    }
  } catch (error) {
    console.error('Failed to load state from sessionStorage:', error);
  }
  return { state: INITIAL_PROJECT_STATE, loadedFromStorage: false };
}

export function clearProjectStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to clear sessionStorage:', error);
  }
}
