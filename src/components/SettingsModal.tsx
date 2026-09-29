import React, { useState } from 'react';
import {
  X,
  Settings,
  Cloud,
  Clock,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Trash2,
  Lock,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType } from '../types';
import { FirebaseManager } from '../services/storage/firebase';

export const SettingsModal: React.FC = () => {
  const {
    project,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    updateSettings,
    resetProject,
    clearAssignments,
  } = useScheduler();

  const [allowJrs1Jrs3, setAllowJrs1Jrs3] = useState(project.settings.allowJrs1Jrs3Double);
  const [randomSeed, setRandomSeed] = useState(project.settings.randomSeed || 42);

  // Timings
  const [timings, setTimings] = useState(project.settings.defaultSessionTimings);

  // Firebase Config State
  const fbManager = FirebaseManager.getInstance();
  const savedFbConfig = fbManager.getConfig() || {};
  const [apiKey, setApiKey] = useState(savedFbConfig.apiKey || '');
  const [projectId, setProjectId] = useState(savedFbConfig.projectId || '');
  const [cloudMsg, setCloudMsg] = useState('');

  if (!isSettingsModalOpen) return null;

  const handleSaveSettings = () => {
    updateSettings({
      allowJrs1Jrs3Double: allowJrs1Jrs3,
      randomSeed,
      defaultSessionTimings: timings,
    });

    if (apiKey && projectId) {
      fbManager.saveConfig({ apiKey, projectId });
    }

    setIsSettingsModalOpen(false);
  };

  const handleCloudSave = async () => {
    if (!apiKey || !projectId) {
      setCloudMsg('Please enter Firebase API Key and Project ID first.');
      return;
    }
    fbManager.saveConfig({ apiKey, projectId });
    const res = await fbManager.saveToCloud(project);
    setCloudMsg(res.message);
  };

  const handleCloudLoad = async () => {
    const res = await fbManager.loadFromCloud();
    setCloudMsg(res.message);
    if (res.success && res.state) {
      project.faculty = res.state.faculty;
      project.examPeriod = res.state.examPeriod;
      project.assignments = res.state.assignments;
      alert('Loaded cloud backup into project!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              System Settings & Firebase Cloud
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Optimization & Double Duty Rules */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
              Scheduling Algorithm Rules
            </h4>

            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60 transition">
              <input
                type="checkbox"
                checked={allowJrs1Jrs3}
                onChange={(e) => setAllowJrs1Jrs3(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800">
                  Allow JRS 1 + JRS 3 Double Duty Combinations
                </span>
                <span className="block text-slate-500 text-[11px] mt-0.5">
                  By default, JRS 1 + JRS 3 is prohibited to prevent large daytime duty gaps. Normal combinations are JRS 1+2 or JRS 2+3.
                </span>
              </div>
            </label>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Default Random Seed (Tie-Breaking Reproducibility)
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value, 10) || 42)}
                className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Section 2: Session Timings */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
              Default Session Timings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((session) => (
                <div key={session} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-800">{session}</div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={timings[session].start}
                      onChange={(e) =>
                        setTimings({
                          ...timings,
                          [session]: { ...timings[session], start: e.target.value },
                        })
                      }
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-300 rounded bg-white"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={timings[session].end}
                      onChange={(e) =>
                        setTimings({
                          ...timings,
                          [session]: { ...timings[session], end: e.target.value },
                        })
                      }
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Google Firebase Cloud Persistence (Section 28) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-sky-600" />
              <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                Google Firebase Cloud Sync (Optional)
              </h4>
            </div>
            <p className="text-slate-500 text-[11px]">
              Supply your Google Firebase credentials to enable online cloud storage and cross-device sync.
              The app remains 100% usable without Firebase via LocalStorage.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Firebase API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="exam-scheduler-demo"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCloudSave}
                className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 font-semibold transition"
              >
                Save to Cloud
              </button>
              <button
                type="button"
                onClick={handleCloudLoad}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition"
              >
                Load from Cloud
              </button>
            </div>

            {cloudMsg && (
              <div className="p-2 rounded bg-sky-50 text-sky-800 text-[11px]">
                {cloudMsg}
              </div>
            )}
          </div>

          {/* Section 4: Project Reset */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-rose-700 text-[11px]">
              Danger Zone
            </h4>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all schedule assignments? Faculty and dates will remain.')) {
                    clearAssignments();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition"
              >
                Clear Schedule Assignments Only
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset entire project to default baseline configuration?')) {
                    resetProject();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 font-medium transition"
              >
                Reset Everything to Default
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
