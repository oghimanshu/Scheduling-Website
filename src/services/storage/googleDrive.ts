import { ProjectState, CloudUser, GoogleDriveFileSummary, GoogleDriveSyncStatus } from '../../types';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FOLDER_NAME = 'Exam Scheduler';
const MAIN_FILE_NAME = 'Exam_Schedule_Main.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

const DEFAULT_CLIENT_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_CLIENT_ID) ||
  '';


export class GoogleDriveManager {
  private static instance: GoogleDriveManager;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenClient: any = null;
  private folderId: string | null = null;
  private folderWebViewLink: string | null = null;
  private listeners: Array<(status: GoogleDriveSyncStatus) => void> = [];

  private status: GoogleDriveSyncStatus = {
    isConfigured: false,
    isSignedIn: false,
    isSyncing: false,
    user: null,
    lastSyncedTimestamp: null,
    folderId: null,
    folderWebViewLink: null,
    error: null,
    clientId: DEFAULT_CLIENT_ID,
  };

  private constructor() {
    this.loadPersistedData();
  }

  public static getInstance(): GoogleDriveManager {
    if (!GoogleDriveManager.instance) {
      GoogleDriveManager.instance = new GoogleDriveManager();
    }
    return GoogleDriveManager.instance;
  }

  public subscribe(cb: (status: GoogleDriveSyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public getStatus(): GoogleDriveSyncStatus {
    return { ...this.status };
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach((l) => l(s));
  }

  private loadPersistedData() {
    if (typeof window === 'undefined') return;
    try {
      const savedClientId = localStorage.getItem('EXAM_SCHEDULER_GOOGLE_CLIENT_ID');
      if (savedClientId) {
        this.status.clientId = savedClientId;
      }
      this.status.isConfigured = !!this.status.clientId;

      const savedUser = localStorage.getItem('EXAM_SCHEDULER_GOOGLE_USER');
      if (savedUser) {
        this.status.user = JSON.parse(savedUser);
      }

      const savedFolderId = localStorage.getItem('EXAM_SCHEDULER_DRIVE_FOLDER_ID');
      if (savedFolderId) {
        this.folderId = savedFolderId;
        this.status.folderId = savedFolderId;
        this.status.folderWebViewLink = localStorage.getItem('EXAM_SCHEDULER_DRIVE_FOLDER_LINK');
      }

      const savedSyncTime = localStorage.getItem('EXAM_SCHEDULER_DRIVE_LAST_SYNC');
      if (savedSyncTime) {
        this.status.lastSyncedTimestamp = savedSyncTime;
      }

      const savedToken = sessionStorage.getItem('EXAM_SCHEDULER_DRIVE_TOKEN');
      const savedExpiry = sessionStorage.getItem('EXAM_SCHEDULER_DRIVE_TOKEN_EXPIRY');
      if (savedToken && savedExpiry && Number(savedExpiry) > Date.now()) {
        this.accessToken = savedToken;
        this.tokenExpiresAt = Number(savedExpiry);
        this.status.isSignedIn = !!this.status.user;
      }
    } catch {
      // Ignored
    }
  }

  public setClientId(clientId: string) {
    const trimmed = clientId.trim();
    this.status.clientId = trimmed;
    this.status.isConfigured = !!trimmed;
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('EXAM_SCHEDULER_GOOGLE_CLIENT_ID', trimmed);
      } else {
        localStorage.removeItem('EXAM_SCHEDULER_GOOGLE_CLIENT_ID');
      }
    }
    this.tokenClient = null; // Re-create on next sign in
    this.notify();
  }

  /**
   * Loads Google Identity Services client library
   */
  private async loadGisScript(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.accounts?.oauth2) return;

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-gis-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(new Error('Failed to load Google Identity Services library')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Prompts user with 1-click Google Sign-In popup
   */
  public async signIn(): Promise<{ success: boolean; message: string }> {
    const clientId = this.status.clientId;
    if (!clientId) {
      return {
        success: false,
        message: 'Google OAuth Client ID is required. Please set your Client ID in Settings.',
      };
    }

    try {
      await this.loadGisScript();

      return new Promise((resolve) => {
        // @ts-ignore
        const google = window.google;
        if (!google?.accounts?.oauth2) {
          resolve({ success: false, message: 'Google Identity Services could not be loaded.' });
          return;
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              const msg = `Google Sign-in failed: ${tokenResponse.error_description || tokenResponse.error}`;
              this.status.error = msg;
              this.notify();
              resolve({ success: false, message: msg });
              return;
            }

            this.accessToken = tokenResponse.access_token;
            // expires_in is in seconds
            const expiresIn = (tokenResponse.expires_in || 3599) * 1000;
            this.tokenExpiresAt = Date.now() + expiresIn;
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('EXAM_SCHEDULER_DRIVE_TOKEN', this.accessToken!);
              sessionStorage.setItem('EXAM_SCHEDULER_DRIVE_TOKEN_EXPIRY', String(this.tokenExpiresAt));
            }

            // Fetch user profile info
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${this.accessToken}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                const user: CloudUser = {
                  uid: info.sub,
                  displayName: info.name || info.given_name || 'Google User',
                  email: info.email || null,
                  photoURL: info.picture || null,
                };
                this.status.user = user;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('EXAM_SCHEDULER_GOOGLE_USER', JSON.stringify(user));
                }
              }
            } catch (e) {
              console.warn('Could not fetch user profile info:', e);
            }

            this.status.isSignedIn = true;
            this.status.error = null;
            this.notify();

            // Locate or create the "Exam Scheduler" folder
            await this.ensureFolder();

            resolve({
              success: true,
              message: `Signed in as ${this.status.user?.displayName || 'Google User'}. Google Drive connected!`,
            });
          },
        });

        // Trigger Google OAuth popup
        this.tokenClient.requestAccessToken({ prompt: '' });
      });
    } catch (err: any) {
      const msg = err?.message || 'Google Sign-in encountered an unexpected error.';
      this.status.error = msg;
      this.notify();
      return { success: false, message: msg };
    }
  }

  /**
   * Signs out from Google Drive and clears cached credentials
   */
  public async signOut(): Promise<void> {
    if (this.accessToken && typeof window !== 'undefined') {
      try {
        // @ts-ignore
        const google = window.google;
        if (google?.accounts?.oauth2?.revoke) {
          google.accounts.oauth2.revoke(this.accessToken, () => {});
        }
      } catch {
        // Ignored
      }
    }

    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.status.isSignedIn = false;
    this.status.user = null;
    this.status.error = null;

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('EXAM_SCHEDULER_DRIVE_TOKEN');
      sessionStorage.removeItem('EXAM_SCHEDULER_DRIVE_TOKEN_EXPIRY');
      localStorage.removeItem('EXAM_SCHEDULER_GOOGLE_USER');
    }

    this.notify();
  }

  /**
   * Ensures the "Exam Scheduler" folder exists in user's Google Drive root
   */
  private async ensureFolder(): Promise<string | null> {
    if (this.folderId) return this.folderId;
    if (!this.accessToken) return null;

    try {
      // 1. Search for existing folder
      const query = encodeURIComponent(
        `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      );
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          this.folderId = data.files[0].id;
          this.folderWebViewLink = data.files[0].webViewLink || `https://drive.google.com/drive/folders/${this.folderId}`;
          this.status.folderId = this.folderId;
          this.status.folderWebViewLink = this.folderWebViewLink;
          if (typeof window !== 'undefined') {
            localStorage.setItem('EXAM_SCHEDULER_DRIVE_FOLDER_ID', this.folderId!);
            localStorage.setItem('EXAM_SCHEDULER_DRIVE_FOLDER_LINK', this.folderWebViewLink!);
          }
          this.notify();
          return this.folderId;
        }
      }

      // 2. Folder does not exist, create it
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Official backup and auto-sync folder for Exam Scheduler projects',
        }),
      });

      if (createRes.ok) {
        const folder = await createRes.json();
        this.folderId = folder.id;
        this.folderWebViewLink = folder.webViewLink || `https://drive.google.com/drive/folders/${this.folderId}`;
        this.status.folderId = this.folderId;
        this.status.folderWebViewLink = this.folderWebViewLink;
        if (typeof window !== 'undefined') {
          localStorage.setItem('EXAM_SCHEDULER_DRIVE_FOLDER_ID', this.folderId!);
          localStorage.setItem('EXAM_SCHEDULER_DRIVE_FOLDER_LINK', this.folderWebViewLink!);
        }
        this.notify();
        return this.folderId;
      }
    } catch (e: any) {
      console.error('Error ensuring Drive folder:', e);
      this.status.error = `Could not access 'Exam Scheduler' folder: ${e?.message}`;
      this.notify();
    }
    return null;
  }

  /**
   * Saves or auto-updates a project file in the Exam Scheduler folder
   */
  public async saveProjectToDrive(
    project: ProjectState,
    customFilename?: string
  ): Promise<{ success: boolean; fileId?: string; message: string }> {
    if (!this.accessToken) {
      return { success: false, message: 'Not signed in with Google Drive.' };
    }

    const folderId = await this.ensureFolder();
    if (!folderId) {
      return { success: false, message: 'Google Drive folder could not be established.' };
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.notify();

    const fileName = customFilename || MAIN_FILE_NAME;
    const jsonContent = JSON.stringify(project, null, 2);

    try {
      // Check if file already exists in folder
      const query = encodeURIComponent(
        `name = '${fileName}' and '${folderId}' in parents and trashed = false`
      );
      const findRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      let existingFileId: string | null = null;
      if (findRes.ok) {
        const findData = await findRes.json();
        if (findData.files && findData.files.length > 0) {
          existingFileId = findData.files[0].id;
        }
      }

      let resFileId = '';
      const appProperties = {
        app: 'ExamScheduler',
        projectName: project.projectName || 'Exam Schedule',
        examPeriodName: project.examPeriod?.name || '',
        facultyCount: String(project.faculty?.length || 0),
        assignmentsCount: String(project.assignments?.length || 0),
        updatedAt: new Date().toISOString(),
      };

      if (existingFileId) {
        // Update existing file content
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: jsonContent,
          }
        );

        if (!updateRes.ok) {
          throw new Error(`Drive update failed: ${updateRes.statusText}`);
        }

        // Update metadata
        await fetch(`https://www.googleapis.com/drive/v3/files/${existingFileId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appProperties }),
        });

        resFileId = existingFileId;
      } else {
        // Create new file using multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
          appProperties,
        };

        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          jsonContent +
          closeDelimiter;

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );

        if (!createRes.ok) {
          throw new Error(`Drive create failed: ${createRes.statusText}`);
        }

        const createData = await createRes.json();
        resFileId = createData.id;
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.status.lastSyncedTimestamp = now;
      this.status.isSyncing = false;
      this.status.error = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('EXAM_SCHEDULER_DRIVE_LAST_SYNC', now);
      }
      this.notify();

      return {
        success: true,
        fileId: resFileId,
        message: `Successfully synced '${fileName}' to Google Drive at ${now}.`,
      };
    } catch (err: any) {
      console.error('Drive save error:', err);
      const msg = err?.message || 'Failed to save to Google Drive';
      this.status.isSyncing = false;
      this.status.error = msg;
      this.notify();
      return { success: false, message: msg };
    }
  }

  /**
   * Lists all schedule JSON files in the Exam Scheduler folder
   */
  public async listFiles(): Promise<GoogleDriveFileSummary[]> {
    if (!this.accessToken) return [];

    const folderId = await this.ensureFolder();
    if (!folderId) return [];

    try {
      const query = encodeURIComponent(
        `'${folderId}' in parents and trashed = false and (name contains '.json' or mimeType = 'application/json')`
      );
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,appProperties,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (!res.ok) return [];

      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        projectName: f.appProperties?.projectName || f.name.replace('.json', ''),
        examPeriodName: f.appProperties?.examPeriodName || '',
        facultyCount: Number(f.appProperties?.facultyCount) || 0,
        assignmentsCount: Number(f.appProperties?.assignmentsCount) || 0,
        modifiedTime: f.modifiedTime,
        size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : undefined,
        webViewLink: f.webViewLink,
      }));
    } catch (e) {
      console.error('Error listing Drive files:', e);
      return [];
    }
  }

  /**
   * Downloads and parses a project JSON from Google Drive by fileId
   */
  public async downloadFile(fileId: string): Promise<ProjectState | null> {
    if (!this.accessToken) return null;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to download file from Google Drive: ${res.statusText}`);
      }

      const project = await res.json();
      return project as ProjectState;
    } catch (e: any) {
      console.error('Error downloading file from Drive:', e);
      this.status.error = `Download failed: ${e?.message}`;
      this.notify();
      return null;
    }
  }

  /**
   * Deletes a file in Google Drive
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return res.ok;
    } catch (e) {
      console.error('Error deleting file:', e);
      return false;
    }
  }
}
