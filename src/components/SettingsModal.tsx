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
  Shield,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType, HodAssignmentPriority } from '../types';
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
  const [hodPriority, setHodPriority] = useState<HodAssignmentPriority>(
    project.settings.hodAssignmentPriority || 'regular_first_hod_last'
  );
  const [randomSeed, setRandomSeed] = useState(project.settings.randomSeed || 42);
  const [reservePerSession, setReservePerSession] = useState(project.settings.reserveSupervisorsPerSession || 0);
  const [reserveCanExceed, setReserveCanExceed] = useState(project.settings.reserveCanExceedCap || false);

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
      hodAssignmentPriority: hodPriority,
      randomSeed,
      reserveSupervisorsPerSession: reservePerSession,
      reserveCanExceedCap: reserveCanExceed,
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/10 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                System Settings & Algorithms
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure algorithm constraints, reserve duties, and cloud sync
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {/* Section 1: Optimization & Double Duty Rules */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
              Scheduling Algorithm Rules
            </h4>

            <label className="flex items-start space-x-3 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/90 transition">
              <input
                type="checkbox"
                checked={allowJrs1Jrs3}
                onChange={(e) => setAllowJrs1Jrs3(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Allow JRS 1 + JRS 3 Double Duty Combinations
                </span>
                <span className="block text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  By default, JRS 1 + JRS 3 is prohibited to prevent large daytime duty gaps. Normal combinations are JRS 1+2 or JRS 2+3.
                </span>
              </div>
            </label>

            {/* HOD Priority Strategy */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 space-y-2.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                HOD Duty Allocation Strategy
              </label>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Choose whether HODs receive concessions by being assigned last, or are assigned first, or proportionally alongside regular faculty:
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
                  <input
                    type="radio"
                    name="hodPriority"
                    value="regular_first_hod_last"
                    checked={hodPriority === 'regular_first_hod_last'}
                    onChange={() => setHodPriority('regular_first_hod_last')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Regular Faculty First, HODs Last (Default Concession)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                      Regular faculty fulfill duties first. HODs are scheduled last only if remaining slot demand cannot be met by regular faculty.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
                  <input
                    type="radio"
                    name="hodPriority"
                    value="hod_first"
                    checked={hodPriority === 'hod_first'}
                    onChange={() => setHodPriority('hod_first')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      HODs First (Priority Allocation)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                      Schedules HODs first until their target caps are satisfied, followed by regular faculty for remaining slots.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
                  <input
                    type="radio"
                    name="hodPriority"
                    value="proportional_equal"
                    checked={hodPriority === 'proportional_equal'}
                    onChange={() => setHodPriority('proportional_equal')}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Proportional / Equal Balance
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                      Assigns HODs and regular faculty concurrently, balancing workloads proportionally to their relative caps.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Default Random Seed (Tie-Breaking Reproducibility)
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value, 10) || 42)}
                className="w-32 px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl font-mono bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 2: Reserve Supervisors Configuration */}
          <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                Reserve / Standby Supervisors
              </h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Automatically designate standby supervisors for each examination session in case assigned faculty are absent or delayed.
            </p>

            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Reserve Supervisors per Session
                  </span>
                  <span className="block text-slate-500 dark:text-slate-400 text-[11px]">
                    0 to disable, or 1, 2 reserve supervisors per exam session.
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={reservePerSession}
                  onChange={(e) => setReservePerSession(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 text-center font-bold px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-start space-x-3 pt-2 border-t border-slate-200/60 dark:border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reserveCanExceed}
                  onChange={(e) => setReserveCanExceed(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Allow Reserve Duty to Exceed Maximum Workload Cap
                  </span>
                  <span className="block text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {reserveCanExceed
                      ? 'Enabled: Reserve standby duties do NOT consume normal workload limits and can exceed the faculty cap.'
                      : 'Disabled: Reserve duties strictly count against the faculty member’s maximum workload cap.'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Session Timings */}
          <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
              Default Session Timings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((session) => (
                <div key={session} className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-2xl space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{session}</div>
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
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-300 dark:border-white/10 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-400 dark:text-slate-500">to</span>
                    <input
                      type="time"
                      value={timings[session].end}
                      onChange={(e) =>
                        setTimings({
                          ...timings,
                          [session]: { ...timings[session], end: e.target.value },
                        })
                      }
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-300 dark:border-white/10 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Google Firebase Cloud Persistence */}
          <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                Google Firebase Cloud Sync (Optional)
              </h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Supply your Google Firebase credentials to enable online cloud storage and cross-device sync.
              The app remains 100% usable without Firebase via LocalStorage.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Firebase API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl text-xs bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="exam-scheduler-demo"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl text-xs bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCloudSave}
                className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 hover:bg-sky-100 font-semibold transition cursor-pointer"
              >
                Save to Cloud
              </button>
              <button
                type="button"
                onClick={handleCloudLoad}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold transition cursor-pointer"
              >
                Load from Cloud
              </button>
            </div>

            {cloudMsg && (
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 text-[11px]">
                {cloudMsg}
              </div>
            )}
          </div>

          {/* Section 5: Project Reset */}
          <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <h4 className="font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 text-[11px]">
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
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 font-medium transition cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-200 font-medium transition cursor-pointer"
              >
                Reset Everything to Default
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 rounded-b-3xl flex justify-end space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition cursor-pointer"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
