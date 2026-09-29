import { ProjectState } from '../../types';
import { INITIAL_PROJECT_STATE } from '../../data/defaultData';

const STORAGE_KEY = 'EXAM_SCHEDULER_PROJECT_STATE_V1';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    return timestamp;
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    return '';
  }
}

export function loadProjectFromStorage(): { state: ProjectState; loadedFromStorage: boolean } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ProjectState;
      // Sanity checks on structure
      if (parsed && Array.isArray(parsed.faculty) && parsed.examPeriod) {
        return { state: parsed, loadedFromStorage: true };
      }
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }
  return { state: INITIAL_PROJECT_STATE, loadedFromStorage: false };
}

export function clearProjectStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}
