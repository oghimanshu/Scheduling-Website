import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Users,
  Check,
  AlertTriangle,
  RotateCcw,
  Copy,
  Calendar,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ExamDateConfig, ArrivalCategory, SessionType, SessionTiming } from '../types';
import { checkSessionTimingsOverlap, isFacultyEligibleForSession } from '../services/validation/validator';

interface DateSessionModalProps {
  dateConfig: ExamDateConfig | null;
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
}

export const DateSessionModal: React.FC<DateSessionModalProps> = ({
  dateConfig,
  isOpen,
  onClose,
  forceOpen,
}) => {
  const { project, updateExamDates } = useScheduler();

  // If dateConfig is not provided (e.g. test or closed), fallback to first date or null
  const activeDateCfg = dateConfig || project.examPeriod.dates[0] || null;

  const [timings, setTimings] = useState<Record<SessionType, SessionTiming>>({});
  const [arrivals, setArrivals] = useState<Record<SessionType, ArrivalCategory[]>>({});
  const [requirements, setRequirements] = useState<Record<SessionType, number>>({});
  const [notification, setNotification] = useState<string | null>(null);

  // Sync state whenever active date changes
  useEffect(() => {
    if (!activeDateCfg) return;

    // Timings
    const currentTimings: Record<SessionType, SessionTiming> = {};
    (project.sessions || []).forEach((s) => {
      currentTimings[s.id] = activeDateCfg.sessionTimings?.[s.id] || { ...s.defaultTiming };
    });
    setTimings(currentTimings);

    // Arrivals
    const currentArrivals: Record<SessionType, ArrivalCategory[]> = {};
    (project.sessions || []).forEach((s) => {
      if (activeDateCfg.sessionArrivals?.[s.id]) {
        currentArrivals[s.id] = [...activeDateCfg.sessionArrivals[s.id]];
      } else {
        currentArrivals[s.id] = [...s.eligibleArrivals];
      }
    });
    setArrivals(currentArrivals);

    // Requirements
    setRequirements({ ...(activeDateCfg.sessionRequirements || {}) });
  }, [activeDateCfg?.date, isOpen]);

  if (!isOpen && !forceOpen) return null;
  if (!activeDateCfg) return null;

  // Real-time timing overlap & turnaround check
  const timingWarnings = checkSessionTimingsOverlap(timings);

  // Toggle arrival category for a session
  const toggleArrival = (session: SessionType, cat: ArrivalCategory) => {
    setArrivals((prev) => {
      const currentList = prev[session] || [];
      const hasCat = currentList.includes(cat);
      let updated: ArrivalCategory[];
      if (hasCat) {
        // Prevent deselecting all
        if (currentList.length <= 1) {
          alert('At least one arrival category must remain eligible for each session.');
          return prev;
        }
        updated = currentList.filter((c) => c !== cat);
      } else {
        updated = [...currentList, cat];
      }
      return { ...prev, [session]: updated };
    });
  };

  // Update timing start / end
  const handleTimingChange = (session: SessionType, field: 'start' | 'end', val: string) => {
    setTimings((prev) => ({
      ...prev,
      [session]: {
        ...(prev[session] || { start: '08:00', end: '10:00' }),
        [field]: val,
      },
    }));
  };

  // Save changes to current date
  const handleSaveCurrentDate = () => {
    const updatedDates = project.examPeriod.dates.map((d) => {
      if (d.date !== activeDateCfg.date) return d;
      return {
        ...d,
        sessionTimings: timings,
        sessionArrivals: arrivals,
        sessionRequirements: requirements,
      };
    });
    updateExamDates(updatedDates);
    onClose();
  };

  // Reset to global defaults
  const handleResetToDefaults = () => {
    const defaultTimings: Record<SessionType, SessionTiming> = {};
    const defaultArrivals: Record<SessionType, ArrivalCategory[]> = {};
    (project.sessions || []).forEach((s) => {
      defaultTimings[s.id] = { ...s.defaultTiming };
      defaultArrivals[s.id] = [...s.eligibleArrivals];
    });

    setTimings(defaultTimings);
    setArrivals(defaultArrivals);
    setNotification('Reset timings and arrival eligibility to global defaults.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Apply this date's configuration to all active exam dates
  const handleApplyToAllActiveDates = () => {
    const updatedDates = project.examPeriod.dates.map((d) => {
      if (d.isExcluded) return d;
      return {
        ...d,
        sessionTimings: timings,
        sessionArrivals: arrivals,
      };
    });
    updateExamDates(updatedDates);
    setNotification(`Applied ${activeDateCfg.displayDate} timings & arrival rules to all active dates!`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Calculate available eligible faculty count for a session
  const getCapacityDetails = (session: SessionType) => {
    const eligibleArrivals = arrivals[session] || [];
    const required = requirements[session] || 0;

    const availableFaculty = project.faculty.filter((f) => {
      if (f.isExcluded) return false;
      if (f.excludedDates && f.excludedDates.includes(activeDateCfg.date)) return false;
      const isAvail = project.availability?.[`${f.srNo}_${activeDateCfg.date}`] !== false;
      return isAvail && eligibleArrivals.includes(f.arrival);
    });

    const eligibleCount = availableFaculty.length;
    const surplus = eligibleCount - required;
    const isDeficit = surplus < 0;

    return { eligibleCount, required, surplus, isDeficit };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Date Session Customizer</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300/40">
                  {activeDateCfg.displayDate} ({activeDateCfg.dayOfWeek})
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize JRS start/end timings and arrival categories (Morning, Mid, Afternoon) for this specific exam date.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Timing Overlap / Turnaround Warnings */}
        {timingWarnings.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Timing Alert Detected</span>
            </div>
            {timingWarnings.map((w, idx) => (
              <p key={idx} className="text-[11px] text-amber-800 dark:text-amber-300 pl-5">
                • {w.message}
              </p>
            ))}
          </div>
        )}

        {/* Sessions Customization List */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {(project.sessions || []).map((session) => {
            const currentTiming = timings[session.id] || { start: '08:00', end: '10:00' };
            const currentArrivalsList = arrivals[session.id] || [];
            const capacity = getCapacityDetails(session.id);

            return (
              <div
                key={session.id}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3"
              >
                {/* Session Header & Capacity Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {session.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {session.id}
                    </span>
                  </div>

                  {/* Real-time Feasibility & Capacity Badge */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 ${
                        capacity.isDeficit
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                          : capacity.surplus < 5
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                      }`}
                      title={`${capacity.eligibleCount} available faculty match the arrival filter for ${capacity.required} required duties`}
                    >
                      <span>
                        Capacity: {capacity.eligibleCount} eligible / {capacity.required} required
                      </span>
                      {capacity.isDeficit ? (
                        <span className="font-black text-rose-600">({capacity.surplus} Shortage!)</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          (+{capacity.surplus} buffer)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start & End Timings */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Session Timing (Start - End)</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={currentTiming.start}
                        onChange={(e) => handleTimingChange(session.id, 'start', e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-400 font-bold">to</span>
                      <input
                        type="time"
                        value={currentTiming.end}
                        onChange={(e) => handleTimingChange(session.id, 'end', e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Eligible Arrival Categories Toggle Chips */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Eligible Faculty Arrivals for {session.id}</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['Morning', 'Mid', 'Afternoon'] as ArrivalCategory[]).map((cat) => {
                        const isSelected = currentArrivalsList.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleArrival(session.id, cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center space-x-1.5 ${
                              isSelected
                                ? cat === 'Morning'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs'
                                  : cat === 'Mid'
                                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 shadow-2xs'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                : 'bg-white/60 dark:bg-slate-900/60 text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 opacity-60'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected
                                  ? cat === 'Morning'
                                    ? 'bg-amber-500'
                                    : cat === 'Mid'
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>{cat}</span>
                            {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Batch Actions & Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition cursor-pointer font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToAllActiveDates}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/40 transition cursor-pointer font-bold"
              title="Copy this timing and arrival setup to all active examination dates"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy to All Dates</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentDate}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-500/25 transition cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
