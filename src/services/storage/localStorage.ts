import { ProjectState } from '../../types';
import { INITIAL_PROJECT_STATE } from '../../data/defaultData';

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
        if (parsed && Array.isArray(parsed.faculty) && parsed.examPeriod) {
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
