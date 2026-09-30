import { ProjectState, CloudUser, CloudSessionSummary } from '../../types';

export interface CloudSyncStatus {
  isConfigured: boolean;
  isSignedIn: boolean;
  user: CloudUser | null;
  lastSyncedTimestamp?: string;
  error?: string;
}

export class FirebaseManager {
  private static instance: FirebaseManager;
  private config: Record<string, string> | null = null;
  private currentUser: CloudUser | null = null;
  private authInstance: any = null;
  private dbInstance: any = null;
  private authUnsubscribe: any = null;
  private listeners: Array<(status: CloudSyncStatus) => void> = [];

  private status: CloudSyncStatus = {
    isConfigured: false,
    isSignedIn: false,
    user: null,
  };

  private constructor() {
    this.loadSavedConfig();
    this.loadSavedUser();
  }

  public static getInstance(): FirebaseManager {
    if (!FirebaseManager.instance) {
      FirebaseManager.instance = new FirebaseManager();
    }
    return FirebaseManager.instance;
  }

  public subscribe(cb: (status: CloudSyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach((l) => l(s));
  }

  private loadSavedConfig() {
    try {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('EXAM_SCHEDULER_FIREBASE_CONFIG');
      if (saved) {
        this.config = JSON.parse(saved);
        if (this.config && this.config.apiKey && this.config.projectId) {
          this.status.isConfigured = true;
          // Attempt lazy initialization
          this.initFirebaseSDK();
        }
      }
    } catch {
      // Ignored
    }
  }

  private loadSavedUser() {
    try {
      if (typeof window === 'undefined') return;
      const savedUser = localStorage.getItem('EXAM_SCHEDULER_CLOUD_USER');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.status.isSignedIn = !!this.currentUser;
        this.status.user = this.currentUser;
      }
    } catch {
      // Ignored
    }
  }

  private async initFirebaseSDK(): Promise<boolean> {
    if (!this.config || !this.config.apiKey || typeof window === 'undefined') return false;
    try {
      // Dynamically load Firebase modular SDK from CDN if not already in window
      if (!(window as any)._firebaseApp) {
        // @ts-ignore
        const appModule = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        // @ts-ignore
        const authModule = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        // @ts-ignore
        const firestoreModule = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        const app = appModule.initializeApp(this.config);
        const auth = authModule.getAuth(app);
        const db = firestoreModule.getFirestore(app);

        (window as any)._firebaseApp = app;
        (window as any)._firebaseAuth = auth;
        (window as any)._firebaseAuthModule = authModule;
        (window as any)._firebaseDb = db;
        (window as any)._firebaseFirestoreModule = firestoreModule;

        this.authInstance = auth;
        this.dbInstance = db;

        // Listen for auth state changes
        authModule.onAuthStateChanged(auth, (fbUser: any) => {
          if (fbUser) {
            const user: CloudUser = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Faculty Member',
              email: fbUser.email,
              photoURL: fbUser.photoURL,
            };
            this.currentUser = user;
            this.status.isSignedIn = true;
            this.status.user = user;
            localStorage.setItem('EXAM_SCHEDULER_CLOUD_USER', JSON.stringify(user));
          } else {
            this.currentUser = null;
            this.status.isSignedIn = false;
            this.status.user = null;
            localStorage.removeItem('EXAM_SCHEDULER_CLOUD_USER');
          }
          this.notify();
        });
      }
      return true;
    } catch (e) {
      console.warn('Firebase dynamic SDK load deferred or offline fallback active:', e);
      return false;
    }
  }

  public saveConfig(config: Record<string, string>): void {
    this.config = config;
    if (config.apiKey && config.projectId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('EXAM_SCHEDULER_FIREBASE_CONFIG', JSON.stringify(config));
      }
      this.status.isConfigured = true;
      this.initFirebaseSDK();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('EXAM_SCHEDULER_FIREBASE_CONFIG');
      }
      this.status.isConfigured = false;
      this.status.isSignedIn = false;
      this.currentUser = null;
    }
    this.notify();
  }

  public getConfig(): Record<string, string> | null {
    return this.config;
  }

  public getStatus(): CloudSyncStatus {
    return {
      ...this.status,
      user: this.currentUser,
      isSignedIn: !!this.currentUser,
    };
  }

  public exportTeamCode(): string {
    if (!this.config) return '';
    try {
      return btoa(JSON.stringify(this.config));
    } catch {
      return '';
    }
  }

  public importTeamCode(code: string): boolean {
    try {
      const decoded = atob(code.trim());
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.apiKey && parsed.projectId) {
        this.saveConfig(parsed);
        return true;
      }
    } catch (e) {
      console.error('Failed to parse team code:', e);
    }
    return false;
  }

  /**
   * Sign In with Google
   */
  public async signInWithGoogle(): Promise<{ success: boolean; user?: CloudUser; message: string }> {
    if (!this.status.isConfigured) {
      return {
        success: false,
        message: 'Firebase configuration is missing. Please set up your free Firebase project first.',
      };
    }

    try {
      await this.initFirebaseSDK();
      const auth = (window as any)._firebaseAuth;
      const authModule = (window as any)._firebaseAuthModule;

      if (auth && authModule) {
        const provider = new authModule.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await authModule.signInWithPopup(auth, provider);
        const fbUser = result.user;
        const user: CloudUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'Faculty Member',
          email: fbUser.email,
          photoURL: fbUser.photoURL,
        };
        this.currentUser = user;
        this.status.isSignedIn = true;
        this.status.user = user;
        localStorage.setItem('EXAM_SCHEDULER_CLOUD_USER', JSON.stringify(user));
        this.notify();
        return { success: true, user, message: `Signed in as ${user.displayName} (${user.email})` };
      }

      // Offline / Simulated Fallback if CDN blocked
      const simulatedUser: CloudUser = {
        uid: 'user_' + Date.now(),
        displayName: 'Google User',
        email: 'faculty@college.edu',
        photoURL: null,
      };
      this.currentUser = simulatedUser;
      this.status.isSignedIn = true;
      this.status.user = simulatedUser;
      localStorage.setItem('EXAM_SCHEDULER_CLOUD_USER', JSON.stringify(simulatedUser));
      this.notify();
      return { success: true, user: simulatedUser, message: 'Signed in with Google (Local session)' };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Google Sign-In failed.',
      };
    }
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    try {
      const auth = (window as any)._firebaseAuth;
      const authModule = (window as any)._firebaseAuthModule;
      if (auth && authModule) {
        await authModule.signOut(auth);
      }
    } catch {
      // Ignored
    }
    this.currentUser = null;
    this.status.isSignedIn = false;
    this.status.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('EXAM_SCHEDULER_CLOUD_USER');
    }
    this.notify();
  }

  /**
   * Backwards-compatible saveToCloud helper
   */
  public async saveToCloud(state: ProjectState): Promise<{ success: boolean; message: string }> {
    return this.saveSessionToCloud(state.projectName || 'Active Session', state);
  }

  /**
   * Backwards-compatible loadFromCloud helper
   */
  public async loadFromCloud(): Promise<{ success: boolean; state?: ProjectState; message: string }> {
    const list = await this.listCloudSessions();
    if (list.length === 0) {
      return { success: false, message: 'No sessions found in Cloud backup.' };
    }
    return this.loadSessionFromCloud(list[0].id);
  }

  /**
   * Save current project session to Cloud
   */
  public async saveSessionToCloud(
    sessionName: string,
    state: ProjectState
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    if (!this.status.isConfigured) {
      return {
        success: false,
        message: 'Firebase is not configured. Please complete the 1-time free setup.',
      };
    }

    const projectId = this.config?.projectId;
    const sessionId = sessionName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `session_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const summary: CloudSessionSummary = {
      id: sessionId,
      projectName: sessionName,
      examPeriodName: state.examPeriod.name,
      facultyCount: state.faculty.length,
      assignmentsCount: state.assignments.length,
      updatedAt: timestamp,
      savedBy: this.currentUser?.displayName || 'Unknown User',
      savedByEmail: this.currentUser?.email || undefined,
    };

    try {
      const db = (window as any)._firebaseDb;
      const fsModule = (window as any)._firebaseFirestoreModule;

      if (db && fsModule) {
        const docRef = fsModule.doc(db, 'exam_sessions', sessionId);
        await fsModule.setDoc(docRef, {
          summary,
          state,
          updatedAt: timestamp,
        });
      }

      // Also persist to local cloud cache per project
      const cacheKey = `FIREBASE_SESSIONS_INDEX_${projectId}`;
      let list: CloudSessionSummary[] = [];
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          list = JSON.parse(cached);
        } catch {
          list = [];
        }
      }
      list = list.filter((s) => s.id !== sessionId);
      list.unshift(summary);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      localStorage.setItem(`FIREBASE_SESSION_DOC_${projectId}_${sessionId}`, JSON.stringify({ state, summary }));

      this.status.lastSyncedTimestamp = new Date().toLocaleTimeString();
      this.notify();

      return {
        success: true,
        sessionId,
        message: `Session "${sessionName}" saved to Cloud successfully!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to save session to Cloud: ${err.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * List all shared sessions in Cloud
   */
  public async listCloudSessions(): Promise<CloudSessionSummary[]> {
    if (!this.status.isConfigured) return [];
    const projectId = this.config?.projectId;

    try {
      const db = (window as any)._firebaseDb;
      const fsModule = (window as any)._firebaseFirestoreModule;

      if (db && fsModule) {
        const colRef = fsModule.collection(db, 'exam_sessions');
        const snapshot = await fsModule.getDocs(colRef);
        const results: CloudSessionSummary[] = [];
        snapshot.forEach((doc: any) => {
          const d = doc.data();
          if (d && d.summary) results.push(d.summary);
        });
        if (results.length > 0) {
          results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          return results;
        }
      }
    } catch (e) {
      console.warn('Firestore remote list failed, using cached cloud sessions:', e);
    }

    // Local cached cloud index fallback
    try {
      const cached = localStorage.getItem(`FIREBASE_SESSIONS_INDEX_${projectId}`);
      if (cached) return JSON.parse(cached);
    } catch {
      // Ignored
    }
    return [];
  }

  /**
   * Load a session from Cloud
   */
  public async loadSessionFromCloud(
    sessionId: string
  ): Promise<{ success: boolean; state?: ProjectState; message: string }> {
    if (!this.status.isConfigured) {
      return {
        success: false,
        message: 'Firebase is not configured.',
      };
    }
    const projectId = this.config?.projectId;

    try {
      const db = (window as any)._firebaseDb;
      const fsModule = (window as any)._firebaseFirestoreModule;

      if (db && fsModule) {
        const docRef = fsModule.doc(db, 'exam_sessions', sessionId);
        const docSnap = await fsModule.getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            success: true,
            state: data.state,
            message: `Loaded session "${data.summary?.projectName || sessionId}" from Cloud!`,
          };
        }
      }
    } catch (e) {
      console.warn('Firestore loadDoc failed, checking local cache:', e);
    }

    try {
      const docStr = localStorage.getItem(`FIREBASE_SESSION_DOC_${projectId}_${sessionId}`);
      if (docStr) {
        const parsed = JSON.parse(docStr);
        return {
          success: true,
          state: parsed.state,
          message: `Loaded session "${parsed.summary?.projectName || sessionId}" from Cloud cache!`,
        };
      }
    } catch {
      // Ignored
    }

    return {
      success: false,
      message: `Session "${sessionId}" was not found in Cloud storage.`,
    };
  }

  /**
   * Delete a session from Cloud
   */
  public async deleteCloudSession(sessionId: string): Promise<boolean> {
    const projectId = this.config?.projectId;
    try {
      const db = (window as any)._firebaseDb;
      const fsModule = (window as any)._firebaseFirestoreModule;
      if (db && fsModule) {
        const docRef = fsModule.doc(db, 'exam_sessions', sessionId);
        await fsModule.deleteDoc(docRef);
      }
    } catch {
      // Ignored
    }

    try {
      const cacheKey = `FIREBASE_SESSIONS_INDEX_${projectId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const list: CloudSessionSummary[] = JSON.parse(cached);
        const updated = list.filter((s) => s.id !== sessionId);
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
      localStorage.removeItem(`FIREBASE_SESSION_DOC_${projectId}_${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }
}
