import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  UploadCloud,
  DownloadCloud,
  Trash2,
  Users,
  ShieldCheck,
  Sparkles,
  Key,
  Share2,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { FirebaseManager } from '../services/storage/firebase';
import { CloudUser, CloudSessionSummary } from '../types';

export const GoogleAuthModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isGoogleAuthModalOpen,
    setIsGoogleAuthModalOpen,
    loadProjectFromCloudSession,
  } = useScheduler();

  const fbManager = FirebaseManager.getInstance();
  const [syncStatus, setSyncStatus] = useState(fbManager.getStatus());
  const [currentUser, setCurrentUser] = useState<CloudUser | null>(fbManager.getStatus().user);
  const [configJson, setConfigJson] = useState('');
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(!fbManager.getStatus().isConfigured);
  const [cloudSessions, setCloudSessions] = useState<CloudSessionSummary[]>([]);
  const [sessionSaveName, setSessionSaveName] = useState(project.projectName || 'Exam Session Oct 2026');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    const unsub = fbManager.subscribe((s) => {
      setSyncStatus(s);
      setCurrentUser(s.user);
      setIsConfiguring(!s.isConfigured);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isGoogleAuthModalOpen && syncStatus.isConfigured) {
      refreshSessions();
    }
  }, [isGoogleAuthModalOpen, syncStatus.isConfigured]);

  const refreshSessions = async () => {
    setIsLoadingSessions(true);
    const list = await fbManager.listCloudSessions();
    setCloudSessions(list);
    setIsLoadingSessions(false);
  };

  if (!forceOpen && !isGoogleAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setStatusMessage({ text: 'Signing in with Google...', type: 'info' });
    const res = await fbManager.signInWithGoogle();
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshSessions();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleSignOut = async () => {
    await fbManager.signOut();
    setStatusMessage({ text: 'Signed out successfully.', type: 'info' });
  };

  const handleSaveFirebaseConfig = () => {
    try {
      let parsed: any;
      const trimmed = configJson.trim();
      if (trimmed.startsWith('{')) {
        parsed = JSON.parse(trimmed);
      } else {
        // Handle const firebaseConfig = { ... } format
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Please paste a valid JSON object or Firebase config block.');
        }
      }

      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error('Config is missing mandatory apiKey or projectId.');
      }

      fbManager.saveConfig(parsed);
      setIsConfiguring(false);
      setStatusMessage({ text: 'Firebase connected successfully! You can now sign in with Google.', type: 'success' });
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'Invalid Firebase configuration.', type: 'error' });
    }
  };

  const handleImportTeamCode = () => {
    if (!teamCodeInput.trim()) {
      setStatusMessage({ text: 'Please enter a team connection code.', type: 'error' });
      return;
    }
    const ok = fbManager.importTeamCode(teamCodeInput);
    if (ok) {
      setIsConfiguring(false);
      setStatusMessage({ text: 'Team connection code applied! You are now connected to your institution’s cloud.', type: 'success' });
    } else {
      setStatusMessage({ text: 'Invalid connection code. Please check and re-try.', type: 'error' });
    }
  };

  const handleCopyTeamCode = () => {
    const code = fbManager.exportTeamCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setStatusMessage({ text: 'Team connection code copied to clipboard! Share it with your colleagues.', type: 'success' });
  };

  const handleSaveCurrentSession = async () => {
    if (!sessionSaveName.trim()) {
      setStatusMessage({ text: 'Please enter a name for the session.', type: 'error' });
      return;
    }
    setIsSavingCloud(true);
    const res = await fbManager.saveSessionToCloud(sessionSaveName.trim(), project);
    setIsSavingCloud(false);
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshSessions();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleLoadSession = async (s: CloudSessionSummary) => {
    if (confirm(`Load session "${s.projectName}"? This will replace your current in-memory schedule with the cloud session.`)) {
      const res = await fbManager.loadSessionFromCloud(s.id);
      if (res.success && res.state) {
        loadProjectFromCloudSession(res.state);
        setStatusMessage({ text: `Successfully loaded "${s.projectName}"!`, type: 'success' });
        setIsGoogleAuthModalOpen(false);
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this cloud session?')) {
      await fbManager.deleteCloudSession(sessionId);
      await refreshSessions();
      setStatusMessage({ text: 'Session removed from Cloud.', type: 'info' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Google Cloud Sync &amp; Multi-User Sessions</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  100% Free
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sign in with Google to share, save, and access examination schedules across team members.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-1 opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Signed In User Card or Sign-In Button */}
        {currentUser ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-10 h-10 rounded-full border border-sky-400 shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {currentUser.displayName}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          syncStatus.isConfigured && (
            <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-sky-200 dark:border-white/10 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Sign in with your Google account to access your institution's examination sessions.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-800 dark:text-white font-bold text-xs rounded-xl shadow-md border border-slate-200 dark:border-white/10 transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </button>
            </div>
          )
        )}

        {/* Cloud Session Management (If Configured) */}
        {syncStatus.isConfigured && !isConfiguring && (
          <div className="space-y-4 pt-2">
            {/* Save Current Session Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:flex-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Save Active Session to Cloud:
                </label>
                <input
                  type="text"
                  value={sessionSaveName}
                  onChange={(e) => setSessionSaveName(e.target.value)}
                  placeholder="e.g. Midterm Exams Oct 2026"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCurrentSession}
                disabled={isSavingCloud || project.faculty.length === 0}
                className="w-full sm:w-auto px-4 py-2 mt-auto text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 rounded-xl shadow-sm transition cursor-pointer inline-flex items-center justify-center space-x-1.5 shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSavingCloud ? 'Saving...' : 'Save to Cloud'}</span>
              </button>
            </div>

            {/* Cloud Sessions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Shared Sessions in Cloud ({cloudSessions.length})
                </span>
                <button
                  type="button"
                  onClick={refreshSessions}
                  className="text-sky-600 dark:text-sky-400 hover:underline text-[11px]"
                >
                  Refresh
                </button>
              </div>

              {isLoadingSessions ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading shared cloud sessions...</div>
              ) : cloudSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  No sessions saved to the cloud yet. Click "Save to Cloud" above to publish your first shared session.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {cloudSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs hover:border-sky-500/50 transition"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {s.projectName}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {s.facultyCount} Faculty &bull; {s.assignmentsCount} Duties &bull; By {s.savedBy || 'Team Member'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleLoadSession(s)}
                          className="px-3 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-lg font-bold text-[11px] transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Load</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share Connection Code Bar */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="text-purple-900 dark:text-purple-200">
                  Allow other faculty/colleagues to connect to this exact cloud project with 0 setup:
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyTeamCode}
                className="px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl hover:bg-purple-100 transition cursor-pointer shrink-0"
              >
                Copy Team Code
              </button>
            </div>
          </div>
        )}

        {/* 1-Time Beginner Setup Wizard (If not configured or in config mode) */}
        {isConfiguring && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Quick Free Cloud Setup (Takes 2 minutes, 100% Free Forever)</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                <li>
                  Open{' '}
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline text-amber-900 dark:text-amber-100 inline-flex items-center space-x-0.5"
                  >
                    <span>console.firebase.google.com</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                  </a>{' '}
                  and click <strong>Add project</strong> (Free Spark plan, no credit card required).
                </li>
                <li>
                  Click the <strong>Web icon (&lt;/&gt;)</strong> to register your app, then copy the <code>firebaseConfig</code> object.
                </li>
                <li>
                  In Firebase Console, enable <strong>Authentication &gt; Sign-in method &gt; Google</strong>, and click <strong>Firestore Database &gt; Create Database (Start in test mode)</strong>.
                </li>
              </ol>
            </div>

            {/* Paste Config Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Paste your Firebase Config (JSON or JS snippet):
              </label>
              <textarea
                rows={4}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                placeholder={'{\n  "apiKey": "AIzaSy...",\n  "authDomain": "college-exams.firebaseapp.com",\n  "projectId": "college-exams"\n}'}
                className="w-full p-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleSaveFirebaseConfig}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Connect Free Firebase Cloud
              </button>
            </div>

            {/* OR Paste Team Code */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                OR Paste a Team Connection Code from a colleague:
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={teamCodeInput}
                  onChange={(e) => setTeamCodeInput(e.target.value)}
                  placeholder="Paste connection code here..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleImportTeamCode}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Join Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500">
          {syncStatus.isConfigured && (
            <button
              type="button"
              onClick={() => setIsConfiguring(!isConfiguring)}
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              {isConfiguring ? 'Back to Cloud Sessions' : 'Reconfigure Firebase Project'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="ml-auto px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
