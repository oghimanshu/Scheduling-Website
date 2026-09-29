import React, { useState } from 'react';
import {
  X,
  Plus,
  Clock,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionDefinition, ArrivalCategory } from '../types';

export const SessionManagerModal: React.FC = () => {
  const {
    project,
    isSessionManagerModalOpen,
    setIsSessionManagerModalOpen,
    addSession,
    updateSession,
    removeSession,
  } = useScheduler();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newStartTime, setNewStartTime] = useState('16:30');
  const [newEndTime, setNewEndTime] = useState('18:30');
  const [newRequirement, setNewRequirement] = useState(15);
  const [newArrivals, setNewArrivals] = useState<ArrivalCategory[]>(['Mid', 'Afternoon']);

  if (!isSessionManagerModalOpen) return null;

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) {
      alert('Please enter a session name.');
      return;
    }

    const sessionId = newSessionName.trim();
    if ((project.sessions || []).some((s) => s.id === sessionId)) {
      alert('A session with this name already exists.');
      return;
    }

    const session: SessionDefinition = {
      id: sessionId,
      name: sessionId,
      defaultTiming: { start: newStartTime, end: newEndTime },
      defaultRequirement: newRequirement,
      eligibleArrivals: newArrivals.length > 0 ? newArrivals : ['Morning', 'Mid', 'Afternoon'],
    };

    addSession(session);
    setIsAddingNew(false);
    setNewSessionName('');
  };

  const toggleArrival = (arr: ArrivalCategory) => {
    if (newArrivals.includes(arr)) {
      setNewArrivals(newArrivals.filter((a) => a !== arr));
    } else {
      setNewArrivals([...newArrivals, arr]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-sky-200/80 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/10 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-900/60 px-2 py-0.5 rounded-md">
                Daily Duty Timetable Configuration
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Manage Examination Sessions (JRS) &amp; Timings
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsSessionManagerModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-slate-500 dark:text-slate-400">
              Configure session timings, default required supervisors, and arrival eligibility.
            </p>
            {!isAddingNew && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Additional JRS</span>
              </button>
            )}
          </div>

          {/* Form to Add New JRS */}
          {isAddingNew && (
            <form
              onSubmit={handleCreateSession}
              className="p-4 rounded-xl border border-sky-300 bg-sky-50/50 space-y-4 animate-in fade-in duration-150"
            >
              <div className="font-bold text-sky-950 flex items-center justify-between">
                <span>Add New Examination Session</span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Session Identifier / Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JRS 4 or Evening Session"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Default Required Supervisors
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Eligible Arrival Categories
                </label>
                <div className="flex items-center space-x-4">
                  {(['Morning', 'Mid', 'Afternoon'] as ArrivalCategory[]).map((arr) => (
                    <label key={arr} className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newArrivals.includes(arr)}
                        onChange={() => toggleArrival(arr)}
                        className="rounded text-sky-600 focus:ring-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{arr}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save New Session
                </button>
              </div>
            </form>
          )}

          {/* Existing Sessions List */}
          <div className="space-y-3">
            {(project.sessions || []).map((session) => {
              const isDefaultStandard = ['JRS 1', 'JRS 2', 'JRS 3'].includes(session.id);

              return (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-white/20 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{session.name}</span>
                      {isDefaultStandard && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          Standard
                        </span>
                      )}
                    </div>

                    {!isDefaultStandard && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove custom session "${session.name}"?`)) {
                            removeSession(session.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Timing & Requirements Editor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Session Timing</span>
                      <div className="flex items-center space-x-1">
                        <input
                          type="time"
                          value={session.defaultTiming.start}
                          onChange={(e) =>
                            updateSession({
                              ...session,
                              defaultTiming: { ...session.defaultTiming, start: e.target.value },
                            })
                          }
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-white/10 rounded bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white w-24"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={session.defaultTiming.end}
                          onChange={(e) =>
                            updateSession({
                              ...session,
                              defaultTiming: { ...session.defaultTiming, end: e.target.value },
                            })
                          }
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-white/10 rounded bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white w-24"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                        Default Required Staff
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={session.defaultRequirement}
                        onChange={(e) =>
                          updateSession({
                            ...session,
                            defaultRequirement: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 dark:border-white/10 rounded bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Eligible Arrivals</span>
                      <div className="flex flex-wrap gap-1">
                        {session.eligibleArrivals.map((arr) => (
                          <span
                            key={arr}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                          >
                            {arr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Timings and added sessions apply across the examination schedule.
          </span>
          <button
            onClick={() => setIsSessionManagerModalOpen(false)}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold rounded-lg transition cursor-pointer w-full sm:w-auto"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
