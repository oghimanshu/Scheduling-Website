import { ProjectState, FolderSyncStatus, FolderFileSummary } from '../../types';

const DB_NAME = 'exam_scheduler_fs_db';
const STORE_NAME = 'handles';
const KEY_NAME = 'sync_folder_handle';
const MAIN_FILE_NAME = 'Exam_Schedule_Main.json';

// Lightweight IndexedDB helper to persist FileSystemDirectoryHandle
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandleToDb(handle: any): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Could not persist directory handle to IndexedDB:', e);
  }
}

async function getHandleFromDb(): Promise<any | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearHandleFromDb(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignored
  }
}

export class FolderSyncManager {
  private static instance: FolderSyncManager;
  private dirHandle: any = null;
  private listeners: Array<(status: FolderSyncStatus) => void> = [];

  private status: FolderSyncStatus = {
    isConnected: false,
    folderName: null,
    isSyncing: false,
    lastSyncedTime: null,
    isSupported: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    error: null,
  };

  private constructor() {
    this.reconnect();
  }

  public static getInstance(): FolderSyncManager {
    if (!FolderSyncManager.instance) {
      FolderSyncManager.instance = new FolderSyncManager();
    }
    return FolderSyncManager.instance;
  }

  public subscribe(cb: (status: FolderSyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public getStatus(): FolderSyncStatus {
    return { ...this.status };
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach((l) => l(s));
  }

  /**
   * Attempts to reconnect to previously selected folder from IndexedDB on startup
   */
  public async reconnect(): Promise<boolean> {
    if (!this.status.isSupported) return false;
    try {
      const handle = await getHandleFromDb();
      if (!handle) return false;

      this.dirHandle = handle;
      this.status.folderName = handle.name || 'Connected Folder';

      // Check if permission is already granted or can be queried
      if (typeof handle.queryPermission === 'function') {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        this.status.isConnected = perm === 'granted';
      } else {
        this.status.isConnected = true;
      }

      this.status.error = null;
      this.notify();
      return this.status.isConnected;
    } catch (e: any) {
      this.status.isConnected = false;
      this.status.error = e?.message || 'Failed to reconnect to folder';
      this.notify();
      return false;
    }
  }

  /**
   * Prompts user with native folder picker to select their Google Drive or local folder
   */
  public async pickFolder(): Promise<{ success: boolean; folderName?: string; message: string }> {
    if (!this.status.isSupported) {
      return {
        success: false,
        message: 'Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.',
      };
    }

    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        id: 'exam_scheduler_auto_sync',
        mode: 'readwrite',
      });

      if (!handle) {
        return { success: false, message: 'No folder was selected.' };
      }

      // Verify write permission
      if (typeof handle.requestPermission === 'function') {
        const perm = await handle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          return { success: false, message: 'Write permission was not granted for the selected folder.' };
        }
      }

      this.dirHandle = handle;
      await saveHandleToDb(handle);

      this.status.isConnected = true;
      this.status.folderName = handle.name || 'Connected Folder';
      this.status.error = null;
      this.notify();

      return {
        success: true,
        folderName: this.status.folderName || undefined,
        message: `Successfully connected to '${this.status.folderName}'! Auto-sync is active.`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Folder selection was cancelled.' };
      }
      const msg = err?.message || 'Failed to select folder.';
      this.status.error = msg;
      this.notify();
      return { success: false, message: msg };
    }
  }

  /**
   * Disconnects the active sync folder
   */
  public async disconnect(): Promise<void> {
    this.dirHandle = null;
    await clearHandleFromDb();
    this.status.isConnected = false;
    this.status.folderName = null;
    this.status.error = null;
    this.notify();
  }

  /**
   * Automatically saves or updates the project state in the connected folder
   */
  public async saveProject(
    project: ProjectState,
    customFilename?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.dirHandle) {
      // Try reconnecting
      const ok = await this.reconnect();
      if (!ok || !this.dirHandle) {
        return { success: false, message: 'No folder is connected for auto-sync.' };
      }
    }

    // Verify permission if required
    try {
      if (typeof this.dirHandle.queryPermission === 'function') {
        const perm = await this.dirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await this.dirHandle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            this.status.isConnected = false;
            this.notify();
            return { success: false, message: 'Write permission required. Click Reconnect in settings.' };
          }
        }
      }
    } catch {
      // Continue if permission query fails
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.notify();

    const fileName = customFilename || MAIN_FILE_NAME;
    const jsonContent = JSON.stringify(project, null, 2);

    try {
      const fileHandle = await this.dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.status.lastSyncedTime = now;
      this.status.isSyncing = false;
      this.status.error = null;
      this.notify();

      return {
        success: true,
        message: `Saved '${fileName}' to folder '${this.status.folderName}' at ${now}.`,
      };
    } catch (err: any) {
      console.error('Folder sync write error:', err);
      const msg = err?.message || 'Failed to write schedule file to folder.';
      this.status.isSyncing = false;
      this.status.error = msg;
      this.notify();
      return { success: false, message: msg };
    }
  }

  /**
   * Lists all schedule JSON files in the connected folder
   */
  public async listFiles(): Promise<FolderFileSummary[]> {
    if (!this.dirHandle) {
      await this.reconnect();
      if (!this.dirHandle) return [];
    }

    const files: FolderFileSummary[] = [];

    try {
      // @ts-ignore
      for await (const [name, entry] of this.dirHandle.entries()) {
        if (entry.kind === 'file' && name.endsWith('.json')) {
          try {
            const file = await entry.getFile();
            let projectName = name.replace('.json', '');
            let examPeriodName = '';
            let facultyCount = 0;
            let assignmentsCount = 0;

            // Attempt fast partial parse for metadata
            try {
              const text = await file.text();
              const parsed = JSON.parse(text);
              if (parsed.projectName) projectName = parsed.projectName;
              if (parsed.examPeriod?.name) examPeriodName = parsed.examPeriod.name;
              if (Array.isArray(parsed.faculty)) facultyCount = parsed.faculty.length;
              if (Array.isArray(parsed.assignments)) assignmentsCount = parsed.assignments.length;
            } catch {
              // Use defaults if parse fails
            }

            files.push({
              name,
              projectName,
              examPeriodName,
              facultyCount,
              assignmentsCount,
              modifiedTime: new Date(file.lastModified).toISOString(),
              size: `${(file.size / 1024).toFixed(1)} KB`,
            });
          } catch (e) {
            console.warn(`Error reading file entry ${name}:`, e);
          }
        }
      }

      // Sort by modifiedTime descending
      files.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    } catch (e) {
      console.error('Error listing folder files:', e);
    }

    return files;
  }

  /**
   * Loads and parses a project JSON from the connected folder
   */
  public async loadFile(filename: string): Promise<ProjectState | null> {
    if (!this.dirHandle) {
      await this.reconnect();
      if (!this.dirHandle) return null;
    }

    try {
      const fileHandle = await this.dirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      return parsed as ProjectState;
    } catch (e: any) {
      console.error(`Error loading file '${filename}':`, e);
      this.status.error = `Failed to load '${filename}': ${e?.message}`;
      this.notify();
      return null;
    }
  }

  /**
   * Deletes a file from the connected folder
   */
  public async deleteFile(filename: string): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      await this.dirHandle.removeEntry(filename);
      return true;
    } catch (e) {
      console.error(`Error deleting file '${filename}':`, e);
      return false;
    }
  }
}
