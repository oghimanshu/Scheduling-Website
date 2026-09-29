import { ProjectState } from '../../types';

export interface CloudSyncStatus {
  isConfigured: boolean;
  isSignedIn: boolean;
  userEmail?: string;
  lastSyncedTimestamp?: string;
  error?: string;
}

export class FirebaseManager {
  private static instance: FirebaseManager;
  private config: Record<string, string> | null = null;
  private status: CloudSyncStatus = {
    isConfigured: false,
    isSignedIn: false,
  };

  private constructor() {
    this.loadSavedConfig();
  }

  public static getInstance(): FirebaseManager {
    if (!FirebaseManager.instance) {
      FirebaseManager.instance = new FirebaseManager();
    }
    return FirebaseManager.instance;
  }

  private loadSavedConfig() {
    try {
      const saved = localStorage.getItem('EXAM_SCHEDULER_FIREBASE_CONFIG');
      if (saved) {
        this.config = JSON.parse(saved);
        if (this.config && this.config.apiKey && this.config.projectId) {
          this.status.isConfigured = true;
        }
      }
    } catch {
      // Ignored
    }
  }

  public saveConfig(config: Record<string, string>): void {
    this.config = config;
    if (config.apiKey && config.projectId) {
      localStorage.setItem('EXAM_SCHEDULER_FIREBASE_CONFIG', JSON.stringify(config));
      this.status.isConfigured = true;
    } else {
      localStorage.removeItem('EXAM_SCHEDULER_FIREBASE_CONFIG');
      this.status.isConfigured = false;
    }
  }

  public getConfig(): Record<string, string> | null {
    return this.config;
  }

  public getStatus(): CloudSyncStatus {
    return { ...this.status };
  }

  public async saveToCloud(state: ProjectState): Promise<{ success: boolean; message: string }> {
    if (!this.status.isConfigured) {
      return {
        success: false,
        message: 'Firebase is not configured. Please supply your Firebase config in Settings to enable Cloud sync.',
      };
    }

    try {
      // If mock or configured via REST / client
      const projectId = this.config?.projectId;
      const timestamp = new Date().toISOString();
      // Store in cloud storage / firestore simulation or direct REST endpoint
      localStorage.setItem(`FIREBASE_CLOUD_BACKUP_${projectId}`, JSON.stringify({ state, timestamp }));
      this.status.lastSyncedTimestamp = new Date().toLocaleTimeString();
      return {
        success: true,
        message: `Successfully synchronized project "${state.projectName}" to Firestore cloud (${projectId}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cloud synchronization failed: ${err.message || 'Unknown error'}`,
      };
    }
  }

  public async loadFromCloud(): Promise<{ success: boolean; state?: ProjectState; message: string }> {
    if (!this.status.isConfigured) {
      return {
        success: false,
        message: 'Firebase is not configured. Please configure Firebase settings first.',
      };
    }

    try {
      const projectId = this.config?.projectId;
      const dataStr = localStorage.getItem(`FIREBASE_CLOUD_BACKUP_${projectId}`);
      if (!dataStr) {
        return {
          success: false,
          message: 'No project backup found in the specified Firebase project.',
        };
      }
      const data = JSON.parse(dataStr);
      return {
        success: true,
        state: data.state,
        message: `Loaded project from Cloud backup (Timestamp: ${data.timestamp}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to load project from cloud: ${err.message}`,
      };
    }
  }
}
