import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  ExternalLink,
  LogIn,
  LogOut,
  UploadCloud,
  DownloadCloud,
  Trash2,
  HardDrive,
  RefreshCw,
  FolderOpen,
  Settings,
  ShieldCheck,
  FileJson,
  Sparkles,
  Users,
  Database,
  Copy,
  Key,
  Check,
  AlertTriangle,
  Folder,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { GoogleDriveManager } from '../services/storage/googleDrive';
import { FolderSyncManager } from '../services/storage/folderSync';
import { FirebaseManager } from '../services/storage/firebase';
import { GoogleDriveFileSummary, CloudSessionSummary, FolderFileSummary } from '../types';

export const GoogleAuthModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isGoogleAuthModalOpen,
    setIsGoogleAuthModalOpen,
    googleDriveSyncStatus,
    signInWithGoogleDrive,
    signOutFromGoogleDrive,
    syncNowToGoogleDrive,
    loadProjectFromGoogleDrive,
    setGoogleDriveClientId,
    folderSyncStatus,
    pickSyncFolder,
    disconnectSyncFolder,
    syncNowToFolder,
    loadProjectFromFolder,
  } = useScheduler();

  // Active Tab: 'folder' (default zero-setup) | 'drive' (Google Drive API) | 'firebase'
  const [activeTab, setActiveTab] = useState<'folder' | 'drive' | 'firebase'>('folder');

  // Folder sync state (Zero Setup)
  const folderManager = FolderSyncManager.getInstance();
  const [folderFiles, setFolderFiles] = useState<FolderFileSummary[]>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);
  const [folderSnapshotName, setFolderSnapshotName] = useState(
    `${project.projectName || 'Exam_Schedule'}_${new Date().toISOString().split('T')[0]}`
  );
  const [isSavingFolderSnapshot, setIsSavingFolderSnapshot] = useState(false);
  const [isFolderSyncingNow, setIsFolderSyncingNow] = useState(false);

  // Drive state (OAuth API)
  const driveManager = GoogleDriveManager.getInstance();
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFileSummary[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [snapshotName, setSnapshotName] = useState(
    `${project.projectName || 'Exam_Schedule'}_${new Date().toISOString().split('T')[0]}`
  );
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Custom Client ID settings for Drive OAuth
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState(
    googleDriveSyncStatus.clientId || ''
  );
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const handleCopyOrigin = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

  // Firebase legacy state
  const fbManager = FirebaseManager.getInstance();
  const [fbConfigJson, setFbConfigJson] = useState('');
  const [fbIsConfiguring, setFbIsConfiguring] = useState(!fbManager.getStatus().isConfigured);
  const [, setFbSessions] = useState<CloudSessionSummary[]>([]);
  const [, setIsLoadingFbSessions] = useState(false);

  // Escape key listener
  useEffect(() => {
    if (!isGoogleAuthModalOpen && !forceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGoogleAuthModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGoogleAuthModalOpen, forceOpen, setIsGoogleAuthModalOpen]);

  // Refresh folder files when folder tab is active or connected
  const refreshFolderFiles = async () => {
    setIsLoadingFolderFiles(true);
    try {
      const files = await folderManager.listFiles();
      setFolderFiles(files);
    } catch {
      // Ignored
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  useEffect(() => {
    if ((isGoogleAuthModalOpen || forceOpen) && folderSyncStatus.isConnected) {
      refreshFolderFiles();
    }
  }, [isGoogleAuthModalOpen, forceOpen, folderSyncStatus.isConnected]);

  // Refresh Drive files on modal open if signed in
  useEffect(() => {
    if ((isGoogleAuthModalOpen || forceOpen) && googleDriveSyncStatus.isSignedIn) {
      refreshDriveFiles();
    }
  }, [isGoogleAuthModalOpen, forceOpen, googleDriveSyncStatus.isSignedIn]);

  const refreshDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    const files = await driveManager.listFiles();
    setDriveFiles(files);
    setIsLoadingDriveFiles(false);
  };

  // Folder sync actions
  const handleConnectFolder = async () => {
    setStatusMessage({ text: 'Opening system folder picker...', type: 'info' });
    const res = await pickSyncFolder();
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshFolderFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleDisconnectFolder = async () => {
    await disconnectSyncFolder();
    setFolderFiles([]);
    setStatusMessage({ text: 'Disconnected sync folder.', type: 'info' });
  };

  const handleFolderSyncNow = async () => {
    setIsFolderSyncingNow(true);
    const res = await syncNowToFolder();
    setIsFolderSyncingNow(false);
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshFolderFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleSaveFolderSnapshot = async () => {
    if (!folderSnapshotName.trim()) return;
    setIsSavingFolderSnapshot(true);
    const filename = folderSnapshotName.trim().endsWith('.json')
      ? folderSnapshotName.trim()
      : `${folderSnapshotName.trim()}.json`;

    const res = await syncNowToFolder(filename);
    setIsSavingFolderSnapshot(false);
    if (res.success) {
      setStatusMessage({ text: `Saved backup snapshot '${filename}'!`, type: 'success' });
      await refreshFolderFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRestoreFromFolder = async (file: FolderFileSummary) => {
    if (
      !confirm(
        `Load schedule '${file.projectName || file.name}' from your sync folder?\n\nThis will replace your current workspace schedule with the copy saved on ${new Date(
          file.modifiedTime
        ).toLocaleString()}.`
      )
    ) {
      return;
    }

    setStatusMessage({ text: `Loading '${file.name}' from folder...`, type: 'info' });
    const ok = await loadProjectFromFolder(file.name);
    if (ok) {
      setStatusMessage({
        text: `Successfully restored '${file.name}'!`,
        type: 'success',
      });
      setIsGoogleAuthModalOpen(false);
    } else {
      setStatusMessage({
        text: `Failed to load '${file.name}'.`,
        type: 'error',
      });
    }
  };

  const handleDeleteFolderFile = async (file: FolderFileSummary) => {
    if (!confirm(`Delete '${file.name}' permanently from your folder?`)) return;
    const ok = await folderManager.deleteFile(file.name);
    if (ok) {
      setStatusMessage({ text: `Deleted '${file.name}'.`, type: 'success' });
      await refreshFolderFiles();
    } else {
      setStatusMessage({ text: `Could not delete '${file.name}'.`, type: 'error' });
    }
  };

  // Google Drive OAuth actions
  const handleDriveSignIn = async () => {
    if (!googleDriveSyncStatus.clientId) {
      setShowClientIdConfig(true);
      setStatusMessage({
        text: 'A Google OAuth Client ID is needed for the Web API. Or switch to the 1-Click Folder Sync tab for zero setup!',
        type: 'info',
      });
      return;
    }
    setStatusMessage({ text: 'Opening Google Sign-In popup...', type: 'info' });
    const res = await signInWithGoogleDrive();
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshDriveFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleSaveClientIdAndConnect = async () => {
    const trimmed = customClientIdInput.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'Please paste your Google OAuth Client ID.', type: 'error' });
      return;
    }
    setGoogleDriveClientId(trimmed);
    setStatusMessage({ text: 'Client ID saved! Opening Google Sign-In...', type: 'info' });
    const res = await signInWithGoogleDrive();
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      setShowClientIdConfig(false);
      await refreshDriveFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleDriveSignOut = async () => {
    await signOutFromGoogleDrive();
    setDriveFiles([]);
    setStatusMessage({ text: 'Signed out from Google Drive.', type: 'info' });
  };

  const handleSaveDriveSnapshot = async () => {
    if (!snapshotName.trim()) return;
    setIsSavingSnapshot(true);
    const filename = snapshotName.trim().endsWith('.json')
      ? snapshotName.trim()
      : `${snapshotName.trim()}.json`;

    const res = await syncNowToGoogleDrive(filename);
    setIsSavingSnapshot(false);

    if (res.success) {
      setStatusMessage({ text: `Saved backup '${filename}' to Google Drive!`, type: 'success' });
      await refreshDriveFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    const res = await syncNowToGoogleDrive();
    setIsSyncingNow(false);
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      await refreshDriveFiles();
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRestoreFromDrive = async (file: GoogleDriveFileSummary) => {
    if (
      !confirm(
        `Load schedule '${file.projectName}' from Google Drive?\n\nThis will replace your current workspace schedule with the cloud copy saved on ${new Date(
          file.modifiedTime
        ).toLocaleString()}.`
      )
    ) {
      return;
    }

    setStatusMessage({ text: `Downloading '${file.name}' from Google Drive...`, type: 'info' });
    const ok = await loadProjectFromGoogleDrive(file.id);
    if (ok) {
      setStatusMessage({
        text: `Successfully restored '${file.projectName}' from Google Drive!`,
        type: 'success',
      });
      setIsGoogleAuthModalOpen(false);
    } else {
      setStatusMessage({
        text: `Failed to download '${file.name}' from Google Drive.`,
        type: 'error',
      });
    }
  };

  const handleDeleteDriveFile = async (file: GoogleDriveFileSummary) => {
    if (!confirm(`Delete '${file.name}' permanently from your Google Drive?`)) return;
    const ok = await driveManager.deleteFile(file.id);
    if (ok) {
      setStatusMessage({ text: `Deleted '${file.name}' from Google Drive.`, type: 'success' });
      await refreshDriveFiles();
    } else {
      setStatusMessage({ text: `Could not delete '${file.name}'.`, type: 'error' });
    }
  };

  const handleSaveClientId = () => {
    setGoogleDriveClientId(customClientIdInput);
    setShowClientIdConfig(false);
    setStatusMessage({
      text: customClientIdInput ? 'Google Client ID updated successfully!' : 'Google Client ID reset to default.',
      type: 'success',
    });
  };

  // Firebase legacy handlers
  const handleFbSignIn = async () => {
    setStatusMessage({ text: 'Signing in to Firebase...', type: 'info' });
    const res = await fbManager.signInWithGoogle();
    if (res.success) {
      setStatusMessage({ text: res.message, type: 'success' });
      setIsLoadingFbSessions(true);
      const list = await fbManager.listCloudSessions();
      setFbSessions(list);
      setIsLoadingFbSessions(false);
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  if (!forceOpen && !isGoogleAuthModalOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      data-lenis-prevent
      onClick={() => setIsGoogleAuthModalOpen(false)}
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-white/10 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Google Drive &amp; Cloud Auto-Sync</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Zero Setup Ready</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatic cloud backup &amp; cross-computer sync without complex setups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Folder / Drive 1-Click (Primary) vs Cloud API vs Firebase */}
        <div className="flex items-center space-x-1.5 border-b border-slate-200/60 dark:border-white/10 pb-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('folder')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'folder'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Drive &amp; Folder Sync</span>
            {folderSyncStatus.isConnected && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'drive'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive API</span>
            {googleDriveSyncStatus.isSignedIn && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'firebase'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firebase DB</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: 1-Click Drive & Folder Sync (ZERO SETUP) */}
          {activeTab === 'folder' && (
            <>
              {!folderSyncStatus.isSupported ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>File System Access Not Supported in this Browser</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Direct 1-click folder syncing requires modern File System Access support. Please open this app in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Opera</strong>, or use the Google Drive API tab.
                  </p>
                </div>
              ) : folderSyncStatus.isConnected ? (
                /* Connected State Card */
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-sky-50/60 to-transparent dark:from-emerald-950/40 dark:via-sky-950/30 dark:to-transparent border border-emerald-300 dark:border-emerald-800/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span className="truncate max-w-[200px] sm:max-w-xs">{folderSyncStatus.folderName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Auto-Sync Active
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Saves automatically in background ~2.5s after every change
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleFolderSyncNow}
                        disabled={isFolderSyncingNow || folderSyncStatus.isSyncing}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-slate-700 font-semibold inline-flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                        title="Force write current state now"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isFolderSyncingNow || folderSyncStatus.isSyncing ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Sync Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleConnectFolder}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                        title="Select a different folder on your computer or Google Drive"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectFolder}
                        className="px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                        title="Disconnect this folder"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Saved as <strong>Exam_Schedule_Main.json</strong> in connected folder</span>
                    </div>
                    {folderSyncStatus.lastSyncedTime && (
                      <span>Last saved: <strong>{folderSyncStatus.lastSyncedTime}</strong></span>
                    )}
                  </div>
                </div>
              ) : (
                /* Disconnected 1-Click Zero Setup Hero Card */
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-sky-50/60 to-indigo-50/50 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-indigo-950/30 border border-emerald-300 dark:border-emerald-800/40 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-800 shadow-md mx-auto flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <FolderOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      1-Click Google Drive &amp; Folder Auto-Sync
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto mt-1 leading-relaxed">
                      Zero setup, no Google Cloud Console project, no Client ID, no origin errors!
                      Select your local <strong>Google Drive</strong> folder or any folder on your computer. Your schedule will automatically save to that folder on every change.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleConnectFolder}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold shadow-lg hover:shadow-xl inline-flex items-center space-x-3 transition active:scale-98 cursor-pointer text-sm"
                    >
                      <FolderOpen className="w-5 h-5" />
                      <span>Connect Google Drive / Sync Folder</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white block">True 1-Click Zero Setup</span>
                        <span className="text-slate-500 dark:text-slate-400">Works directly in single HTML file and offline.</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 flex items-start space-x-2">
                      <HardDrive className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <div className="text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white block">Google Drive Desktop Sync</span>
                        <span className="text-slate-500 dark:text-slate-400">Select Google Drive folder &amp; it syncs to cloud automatically.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Named Snapshot to Folder */}
              {folderSyncStatus.isConnected && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Save Named Backup Snapshot
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Creates a permanent timestamped copy in folder
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={folderSnapshotName}
                      onChange={(e) => setFolderSnapshotName(e.target.value)}
                      placeholder="e.g. Exam_Autumn_2026_Final_v1"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveFolderSnapshot}
                      disabled={isSavingFolderSnapshot || !folderSnapshotName.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5 shrink-0"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isSavingFolderSnapshot ? 'Saving...' : 'Save Snapshot'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Schedules in Folder List */}
              {folderSyncStatus.isConnected && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-2">
                      <span>Schedules in '{folderSyncStatus.folderName}'</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {folderFiles.length}
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={refreshFolderFiles}
                      disabled={isLoadingFolderFiles}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isLoadingFolderFiles ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh List</span>
                    </button>
                  </div>

                  {isLoadingFolderFiles ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                      <p>Scanning folder for schedules...</p>
                    </div>
                  ) : folderFiles.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 space-y-1">
                      <FileJson className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                      <p className="font-medium">No saved schedule JSON files found in this folder yet.</p>
                      <p className="text-[11px]">
                        Click "Sync Now" above to write the primary schedule file.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {folderFiles.map((file) => (
                        <div
                          key={file.name}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {file.name}
                              </span>
                              {file.name === 'Exam_Schedule_Main.json' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                                  Primary Auto-Sync
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                              <span>
                                Modified: {new Date(file.modifiedTime).toLocaleDateString()} at{' '}
                                {new Date(file.modifiedTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {file.facultyCount > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.facultyCount} Faculty</span>
                                </>
                              )}
                              {file.assignmentsCount > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.assignmentsCount} Duties</span>
                                </>
                              )}
                              {file.size && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.size}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreFromFolder(file)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                              title="Load this schedule into the workspace"
                            >
                              <DownloadCloud className="w-3.5 h-3.5" />
                              <span>Load</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFolderFile(file)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                              title="Delete permanently from folder"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: Google Drive API (OAuth) */}
          {activeTab === 'drive' && (
            <>
              {/* Google Drive Status & User Profile Card */}
              {googleDriveSyncStatus.isSignedIn && googleDriveSyncStatus.user ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 via-emerald-50/60 to-transparent dark:from-sky-950/40 dark:via-emerald-950/30 dark:to-transparent border border-sky-200/80 dark:border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {googleDriveSyncStatus.user.photoURL ? (
                        <img
                          src={googleDriveSyncStatus.user.photoURL}
                          alt={googleDriveSyncStatus.user.displayName || 'Google Profile'}
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 shadow-xs object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {googleDriveSyncStatus.user.displayName?.[0] || 'G'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{googleDriveSyncStatus.user.displayName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Connected
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {googleDriveSyncStatus.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={isSyncingNow || googleDriveSyncStatus.isSyncing}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold inline-flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                        title="Force upload current project state to Google Drive"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isSyncingNow || googleDriveSyncStatus.isSyncing ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Sync Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDriveSignOut}
                        className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Folder Link & Sync Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px]">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      <span>
                        Folder: <strong>'Exam Scheduler'</strong> in your Google Drive root
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {googleDriveSyncStatus.lastSyncedTimestamp && (
                        <span className="text-slate-500 dark:text-slate-400">
                          Last auto-synced: <strong>{googleDriveSyncStatus.lastSyncedTimestamp}</strong>
                        </span>
                      )}

                      {googleDriveSyncStatus.folderWebViewLink && (
                        <a
                          href={googleDriveSyncStatus.folderWebViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sky-700 dark:text-sky-300 hover:underline inline-flex items-center space-x-1"
                        >
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Google Sign In Hero Card */
                <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50 dark:from-slate-800/80 dark:via-slate-900/80 dark:to-indigo-950/40 border border-sky-200 dark:border-white/10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-white dark:bg-slate-800 shadow-md mx-auto flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
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
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Google Drive Cloud API (OAuth)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-1">
                      Direct cloud OAuth sync for web servers with an http/https domain. For standalone files or offline use, switch to the <strong>1-Click Drive &amp; Folder Sync</strong> tab above.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleDriveSignIn}
                      className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-white/20 hover:border-sky-500 font-bold shadow-md hover:shadow-lg inline-flex items-center space-x-3 transition active:scale-98 cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                      <span className="text-sm">Sign in with Google OAuth</span>
                    </button>
                  </div>

                  {/* 1-Time Setup Wizard if Client ID is missing */}
                  {!googleDriveSyncStatus.clientId && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-left space-y-3">
                      <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold">
                        <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Google OAuth Client ID Required</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Google requires a registered Web Client ID. Note: Google rejects origins with <code className="text-rose-600">file://</code>. If you are opening an offline HTML bundle, please use the <strong>1-Click Drive &amp; Folder Sync</strong> tab instead.
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <li>
                          Open{' '}
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sky-600 dark:text-sky-400 underline inline-flex items-center space-x-0.5"
                          >
                            <span>Google Cloud Console Credentials</span>
                            <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        </li>
                        <li>
                          Create <strong>OAuth client ID</strong> &rarr; Application type: <strong>Web application</strong>.
                        </li>
                        <li>
                          Under <strong>Authorized JavaScript origins</strong>:
                          <div className="mt-1 flex items-center space-x-2">
                            <code className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-slate-800 dark:text-slate-200">
                              {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyOrigin}
                              className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-200 font-bold text-[10px] inline-flex items-center space-x-1 cursor-pointer"
                            >
                              {copiedOrigin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedOrigin ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                        </li>
                      </ol>
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Paste your generated Client ID:
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={customClientIdInput}
                            onChange={(e) => setCustomClientIdInput(e.target.value)}
                            placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleSaveClientIdAndConnect}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs inline-flex items-center space-x-1.5 shrink-0 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Save &amp; Sign In</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Named Snapshot Section */}
              {googleDriveSyncStatus.isSignedIn && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Save Named Cloud Snapshot
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Creates an immutable version in Drive
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      placeholder="e.g. Exam_Autumn_2026_Final_v1"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDriveSnapshot}
                      disabled={isSavingSnapshot || !snapshotName.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5 shrink-0"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isSavingSnapshot ? 'Saving...' : 'Save Snapshot'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Cloud Files List */}
              {googleDriveSyncStatus.isSignedIn && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-2">
                      <span>Saved Schedules in Google Drive</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {driveFiles.length}
                      </span>
                    </h4>

                    <button
                      type="button"
                      onClick={refreshDriveFiles}
                      disabled={isLoadingDriveFiles}
                      className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`}
                      />
                      <span>Refresh List</span>
                    </button>
                  </div>

                  {isLoadingDriveFiles ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                      <p>Scanning 'Exam Scheduler' folder in Google Drive...</p>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 space-y-1">
                      <FileJson className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                      <p className="font-medium">No saved schedules found in Google Drive yet.</p>
                      <p className="text-[11px]">
                        Click "Sync Now" above to save your first project to Google Drive.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500/50 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {file.name}
                              </span>
                              {file.name === 'Exam_Schedule_Main.json' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
                                  Primary Auto-Sync
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                              <span>
                                Saved: {new Date(file.modifiedTime).toLocaleDateString()} at{' '}
                                {new Date(file.modifiedTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {file.facultyCount > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.facultyCount} Faculty</span>
                                </>
                              )}
                              {file.assignmentsCount > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.assignmentsCount} Duties</span>
                                </>
                              )}
                              {file.size && (
                                <>
                                  <span>&bull;</span>
                                  <span>{file.size}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreFromDrive(file)}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                              title="Load this schedule into the workspace"
                            >
                              <DownloadCloud className="w-3.5 h-3.5" />
                              <span>Load</span>
                            </button>

                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                                title="Open file directly in Google Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteDriveFile(file)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                              title="Delete from Google Drive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Settings Accordion (Custom Google OAuth Client ID) */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowClientIdConfig(!showClientIdConfig)}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure Custom OAuth Client ID</span>
                </button>

                {showClientIdConfig && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Google Cloud OAuth 2.0 Client ID
                      </label>
                      <input
                        type="text"
                        value={customClientIdInput}
                        onChange={(e) => setCustomClientIdInput(e.target.value)}
                        placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Create an OAuth 2.0 Web Client ID in{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 dark:text-sky-400 underline"
                        >
                          Google Cloud Console
                        </a>{' '}
                        and add your website URL to <strong>Authorized JavaScript origins</strong>.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomClientIdInput('');
                          setGoogleDriveClientId('');
                          setShowClientIdConfig(false);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Reset to Default
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveClientId}
                        className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                      >
                        Save Client ID
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 3: Firebase Team Database */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center space-x-1.5 mb-1">
                  <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Institutional Firebase Real-Time Database</span>
                </div>
                <p className="text-xs">
                  Connect a shared Firebase project to collaborate with co-administrators on the same institutional database in real-time.
                </p>
              </div>

              {fbIsConfiguring ? (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Paste Firebase Config Object
                    </label>
                    <textarea
                      rows={5}
                      value={fbConfigJson}
                      onChange={(e) => setFbConfigJson(e.target.value)}
                      placeholder='const firebaseConfig = { apiKey: "...", projectId: "..." };'
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(fbConfigJson.trim());
                        fbManager.saveConfig(parsed);
                        setFbIsConfiguring(false);
                      } catch {
                        setStatusMessage({ text: 'Please paste a valid JSON object.', type: 'error' });
                      }
                    }}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
                  >
                    Save &amp; Connect Firebase
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Firebase Configured</span>
                    <button
                      type="button"
                      onClick={handleFbSignIn}
                      className="px-3 py-1.5 bg-sky-600 text-white rounded-lg font-bold"
                    >
                      Sign In with Google
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 shrink-0 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {folderSyncStatus.isConnected ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Folder Synced: {folderSyncStatus.folderName}</span>
              </span>
            ) : googleDriveSyncStatus.isSignedIn ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Google Drive Connected ({googleDriveSyncStatus.user?.displayName})</span>
              </span>
            ) : (
              <span>No folder or cloud storage connected</span>
            )}
          </span>

          <button
            type="button"
            onClick={() => setIsGoogleAuthModalOpen(false)}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
