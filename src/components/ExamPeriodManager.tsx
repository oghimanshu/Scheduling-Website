import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  Users,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ExamDateConfig, ExclusionReason, SessionType, ArrivalCategory, SessionTiming } from '../types';
import { DateSessionModal } from './DateSessionModal';
import { checkSessionTimingsOverlap } from '../services/validation/validator';

export const ExamPeriodManager: React.FC = () => {
  const {
    project,
    updateExamDates,
    updateExamPeriodInfo,
    updateSettings,
    setIsSessionManagerModalOpen,
  } = useScheduler();

  const [periodName, setPeriodName] = useState(project.examPeriod.name);
  const [startDate, setStartDate] = useState(project.examPeriod.startDate);
  const [endDate, setEndDate] = useState(project.examPeriod.endDate);

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [customizingDate, setCustomizingDate] = useState<ExamDateConfig | null>(null);
  const [isDateSessionModalOpen, setIsDateSessionModalOpen] = useState(false);

  // Template session requirements for "Apply to all dates"
  const [templateReqs, setTemplateReqs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = { 'JRS 1': 17, 'JRS 2': 25, 'JRS 3': 15 };
    (project.sessions || []).forEach((s) => {
      if (initial[s.id] === undefined) {
        initial[s.id] = s.defaultRequirement;
      }
    });
    return initial;
  });

  const getTemplateReq = (sessionId: string, fallback: number) => {
    return templateReqs[sessionId] ?? fallback;
  };

  const setTemplateReq = (sessionId: string, val: number) => {
    setTemplateReqs((prev) => ({
      ...prev,
      [sessionId]: Math.max(0, val),
    }));
  };

  // Generate date range
  const handleGenerateDates = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      alert('Start date must be before or equal to End date.');
      return;
    }

    const newDates: ExamDateConfig[] = [];
    const current = new Date(start);

    while (current <= end) {
      const iso = current.toISOString().slice(0, 10);
      const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
      const displayDate = current.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Default: Sunday is excluded as Holiday
      const isSunday = current.getDay() === 0;

      // Preserve existing configuration if date already existed
      const existing = project.examPeriod.dates.find((d) => d.date === iso);

      const sessionReqs: Record<string, number> = {};
      (project.sessions || []).forEach((s) => {
        sessionReqs[s.id] = isSunday ? 0 : getTemplateReq(s.id, s.defaultRequirement);
      });

      newDates.push(
        existing || {
          date: iso,
          displayDate,
          dayOfWeek,
          isExcluded: isSunday,
          exclusionReason: isSunday ? 'Holiday' : undefined,
          sessionRequirements: sessionReqs,
          sessionTimings: project.settings.defaultSessionTimings,
        }
      );

      current.setDate(current.getDate() + 1);
    }

    updateExamPeriodInfo(periodName, startDate, endDate);
    updateExamDates(newDates);
  };

  // Toggle exclusion of a single date
  const handleToggleExclusion = (dateStr: string) => {
    const updated = project.examPeriod.dates.map((d) => {
      if (d.date !== dateStr) return d;
      const willExclude = !d.isExcluded;
      const sessionReqs: Record<string, number> = {};
      (project.sessions || []).forEach((s) => {
        sessionReqs[s.id] = willExclude ? 0 : getTemplateReq(s.id, s.defaultRequirement);
      });

      return {
        ...d,
        isExcluded: willExclude,
        exclusionReason: willExclude ? ('No Examination' as ExclusionReason) : undefined,
        sessionRequirements: sessionReqs,
      };
    });
    updateExamDates(updated);
  };

  // Change exclusion reason
  const handleChangeExclusionReason = (dateStr: string, reason: ExclusionReason) => {
    const updated = project.examPeriod.dates.map((d) =>
      d.date === dateStr ? { ...d, exclusionReason: reason } : d
    );
    updateExamDates(updated);
  };

  // Edit required supervisors for a session on a specific date
  const handleUpdateRequirement = (
    dateStr: string,
    session: SessionType,
    value: number
  ) => {
    const updated = project.examPeriod.dates.map((d) => {
      if (d.date !== dateStr) return d;
      return {
        ...d,
        sessionRequirements: {
          ...d.sessionRequirements,
          [session]: Math.max(0, value),
        },
      };
    });
    updateExamDates(updated);
  };

  // Apply template requirements to all active dates
  const handleApplyToAllActiveDates = () => {
    const updated = project.examPeriod.dates.map((d) => {
      if (d.isExcluded) return d;
      const sessionReqs: Record<string, number> = { ...d.sessionRequirements };
      (project.sessions || []).forEach((s) => {
        sessionReqs[s.id] = getTemplateReq(s.id, s.defaultRequirement);
      });
      return {
        ...d,
        sessionRequirements: sessionReqs,
      };
    });
    updateExamDates(updated);
    alert('Applied template requirements to all active dates!');
  };

  // Inline update for a session timing on a specific date
  const handleUpdateDateTiming = (
    dateStr: string,
    sessionId: string,
    field: 'start' | 'end',
    val: string
  ) => {
    const updated = project.examPeriod.dates.map((d) => {
      if (d.date !== dateStr) return d;
      const currentTimings = { ...(d.sessionTimings || {}) };
      currentTimings[sessionId] = {
        ...(currentTimings[sessionId] || { start: '08:00', end: '10:00' }),
        [field]: val,
      };
      return { ...d, sessionTimings: currentTimings };
    });
    updateExamDates(updated);
  };

  // Inline toggle for arrival eligibility on a specific date and session
  const handleToggleDateArrival = (
    dateStr: string,
    sessionId: string,
    arrival: ArrivalCategory
  ) => {
    const updated = project.examPeriod.dates.map((d) => {
      if (d.date !== dateStr) return d;
      const currentArrivals = { ...(d.sessionArrivals || {}) };
      const sessionDef = project.sessions?.find((s) => s.id === sessionId);
      const list = currentArrivals[sessionId]
        ? [...currentArrivals[sessionId]]
        : [...(sessionDef?.eligibleArrivals || ['Morning', 'Mid', 'Afternoon'])];

      let newList: ArrivalCategory[];
      if (list.includes(arrival)) {
        if (list.length <= 1) return d; // Keep at least one category
        newList = list.filter((a) => a !== arrival);
      } else {
        newList = [...list, arrival];
      }
      currentArrivals[sessionId] = newList;
      return { ...d, sessionArrivals: currentArrivals };
    });
    updateExamDates(updated);
  };

  // Calculate live capacity details for a date session
  const getDateCapacity = (d: ExamDateConfig, sessionId: string) => {
    const sessionDef = project.sessions?.find((s) => s.id === sessionId);
    const eligibleArrivals = d.sessionArrivals?.[sessionId] || sessionDef?.eligibleArrivals || ['Morning', 'Mid'];
    const required = d.sessionRequirements?.[sessionId] || 0;

    const availableCount = project.faculty.filter((f) => {
      if (f.isExcluded) return false;
      if (f.excludedDates && f.excludedDates.includes(d.date)) return false;
      const isAvail = project.availability?.[`${f.srNo}_${d.date}`] !== false;
      return isAvail && eligibleArrivals.includes(f.arrival);
    }).length;

    const surplus = availableCount - required;
    return { availableCount, required, surplus, isDeficit: surplus < 0 };
  };

  // Calculate total positions dynamically across all configured sessions
  const activeDates = project.examPeriod.dates.filter((d) => !d.isExcluded);
  const totalPeriodPositions = activeDates.reduce((sum, d) => {
    const daySum = (project.sessions || []).reduce(
      (sSum, s) => sSum + (d.sessionRequirements?.[s.id] || 0),
      0
    );
    return sum + daySum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Period Setup Card */}
      <div className="apple-glass-card p-6 space-y-4">
        <div className="apple-specular-rim" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Examination Period Setup</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify the exam date boundaries and generate active dates. Dates can be individually marked as holidays or non-examination days.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Examination Period Name
            </label>
            <input
              type="text"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              START DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 transition tabular-nums"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              END DATE
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 transition tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Current configuration: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{activeDates.length}</strong> active exam dates,{' '}
            <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{totalPeriodPositions}</strong> total positions required.
          </div>
          <button
            onClick={handleGenerateDates}
            className="btn-spring px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm hover:shadow cursor-pointer"
          >
            GENERATE DATES
          </button>
        </div>
      </div>

      {/* Global Staffing Template & Apply All */}
      <div className="apple-glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-sky-200/50 dark:border-sky-500/20 bg-sky-50/40 dark:bg-sky-950/20">
        <div className="apple-specular-rim" />
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
              Daily Staffing Requirements
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 tabular-nums font-mono">
              {(project.sessions || []).length} Sessions Configured
            </span>
          </div>
          <p className="text-xs text-sky-700 dark:text-sky-400/80 mt-0.5">
            Default: JRS 1 = 17, JRS 2 = 25, JRS 3 = 15. Set values below and click to apply universally to all active dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(project.sessions || []).map((s) => (
            <div
              key={s.id}
              className="flex items-center space-x-1.5 text-xs bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-sky-200/70 dark:border-white/10 shadow-2xs backdrop-blur-sm"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-300">{s.name}:</span>
              <input
                type="number"
                min="0"
                value={getTemplateReq(s.id, s.defaultRequirement)}
                onChange={(e) => setTemplateReq(s.id, parseInt(e.target.value, 10) || 0)}
                className="w-14 text-center font-bold text-slate-900 dark:text-white bg-transparent border-b border-sky-300 dark:border-sky-600 focus:outline-none tabular-nums font-mono"
              />
            </div>
          ))}

          <button
            onClick={handleApplyToAllActiveDates}
            className="btn-spring px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm hover:shadow cursor-pointer"
          >
            Apply to all dates
          </button>

          {/* Manage Sessions & Timings Modal Trigger */}
          <button
            onClick={() => setIsSessionManagerModalOpen(true)}
            className="btn-spring inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/50 border border-purple-300/80 dark:border-purple-800/40 rounded-lg shadow-2xs cursor-pointer"
            title="Add additional JRS sessions (e.g. JRS 4) or edit timings"
          >
            <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>MANAGE SESSIONS (JRS)</span>
          </button>
        </div>
      </div>

      {/* Date-by-Date Configuration Table */}
      <div className="apple-glass-card overflow-hidden">
        <div className="apple-specular-rim" />
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Individual Date Roster & Exclusions ({project.examPeriod.dates.length} Dates)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Excluded dates require zero supervisors and cannot receive assignments.
            </span>
          </div>

          <button
            onClick={() => setIsSessionManagerModalOpen(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Add / Edit JRS Sessions & Timings &rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px]">
              <tr>
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Day</th>
                <th className="py-3 px-4">Exclusion Reason</th>
                {(project.sessions || []).map((s) => (
                  <th key={s.id} className="py-3 px-3 text-center">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {s.defaultTiming.start}-{s.defaultTiming.end}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center">Staffing</th>
                <th className="py-3 px-3 text-center">Custom JRS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {project.examPeriod.dates.map((d) => {
                const isExpanded = expandedDate === d.date;
                const timingWarnings = checkSessionTimingsOverlap(d.sessionTimings);
                const hasCustomTimings = Boolean(d.sessionTimings);
                const hasCustomArrivals = Boolean(d.sessionArrivals && Object.keys(d.sessionArrivals).length > 0);

                const dayTotal = (project.sessions || []).reduce(
                  (acc, s) => acc + (d.sessionRequirements?.[s.id] || 0),
                  0
                );

                return (
                  <React.Fragment key={d.date}>
                    <tr
                      className={`transition ${
                        d.isExcluded
                          ? 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500'
                          : 'hover:bg-sky-50/30 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {/* Expand / Collapse Accordion Chevron */}
                      <td className="py-3 px-2 text-center">
                        {!d.isExcluded ? (
                          <button
                            type="button"
                            onClick={() => setExpandedDate(isExpanded ? null : d.date)}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title={isExpanded ? 'Collapse inline session controls' : 'Expand inline timings & arrivals'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
                              }`}
                            />
                          </button>
                        ) : null}
                      </td>

                      {/* Checkbox toggle */}
                      <td className="py-3 px-3">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!d.isExcluded}
                            onChange={() => handleToggleExclusion(d.date)}
                            className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <span className="text-[11px] font-medium">
                            {!d.isExcluded ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">Excluded</span>
                            )}
                          </span>
                        </label>
                      </td>

                      {/* Date with quick modal launcher */}
                      <td className="py-3 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            if (!d.isExcluded) {
                              setCustomizingDate(d);
                              setIsDateSessionModalOpen(true);
                            }
                          }}
                          disabled={d.isExcluded}
                          className="inline-flex items-center space-x-1 hover:text-sky-600 dark:hover:text-sky-400 text-left transition disabled:cursor-not-allowed group cursor-pointer"
                          title="Open Date Session Customizer dialog"
                        >
                          <span>{d.displayDate}</span>
                          {!d.isExcluded && (
                            <Sliders className="w-3 h-3 text-slate-400 group-hover:text-sky-500 opacity-60 group-hover:opacity-100 transition" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{d.dayOfWeek}</td>

                      {/* Exclusion Reason selector */}
                      <td className="py-3 px-4">
                        {d.isExcluded ? (
                          <select
                            value={d.exclusionReason || 'No Examination'}
                            onChange={(e) =>
                              handleChangeExclusionReason(d.date, e.target.value as ExclusionReason)
                            }
                            className="text-xs bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            <option value="Holiday">HOLIDAY</option>
                            <option value="No Examination">NO EXAMINATION</option>
                            <option value="Other">OTHER</option>
                          </select>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Examination Active</span>
                            {(hasCustomTimings || hasCustomArrivals) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-300/40">
                                Customized
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dynamic Session Columns with Quota Inputs */}
                      {(project.sessions || []).map((s) => {
                        const timing = d.sessionTimings?.[s.id] || s.defaultTiming;
                        return (
                          <td key={s.id} className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center space-y-1">
                              <input
                                type="number"
                                disabled={d.isExcluded}
                                min="0"
                                value={d.sessionRequirements?.[s.id] ?? 0}
                                onChange={(e) =>
                                  handleUpdateRequirement(d.date, s.id, parseInt(e.target.value, 10) || 0)
                                }
                                className="w-14 text-center font-bold px-1.5 py-1 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded text-slate-900 dark:text-white disabled:bg-slate-100/50 dark:disabled:bg-slate-950/40 disabled:text-slate-400 dark:disabled:text-slate-600"
                              />
                              {!d.isExcluded && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {timing.start}-{timing.end}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {d.isExcluded ? (
                          <span className="text-slate-400 dark:text-slate-600">0</span>
                        ) : (
                          <span className="text-sky-600 dark:text-sky-400">{dayTotal}</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-center">
                        {!d.isExcluded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomizingDate(d);
                              setIsDateSessionModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border border-sky-200 dark:border-sky-800/40 transition cursor-pointer"
                            title="Edit JRS timings and arrivals for this date"
                          >
                            <Sliders className="w-3 h-3 text-sky-600" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Inline Expandable Accordion Sub-Row */}
                    {isExpanded && !d.isExcluded && (
                      <tr className="bg-sky-50/40 dark:bg-sky-950/20 border-y border-sky-200/80 dark:border-sky-800/40 animate-in fade-in duration-150">
                        <td colSpan={100} className="p-4">
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/60 dark:border-sky-800/30 pb-2">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span className="font-bold text-xs text-sky-900 dark:text-sky-200">
                                  Inline JRS Timings &amp; Arrival Eligibility for {d.displayDate}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setCustomizingDate(d);
                                  setIsDateSessionModalOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Open Full Dialog &amp; Copy to Other Dates &rarr;</span>
                              </button>
                            </div>

                            {/* Timing Warnings if any */}
                            {timingWarnings.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300/80 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                                <div className="font-bold flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Timing Alert:</span>
                                </div>
                                {timingWarnings.map((w, idx) => (
                                  <p key={idx} className="text-[11px] pl-5">• {w.message}</p>
                                ))}
                              </div>
                            )}

                            {/* Session Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {(project.sessions || []).map((s) => {
                                const currentTiming = d.sessionTimings?.[s.id] || s.defaultTiming;
                                const currentArrivalsList =
                                  d.sessionArrivals?.[s.id] || s.eligibleArrivals || ['Morning', 'Mid'];
                                const capacity = getDateCapacity(d, s.id);

                                return (
                                  <div
                                    key={s.id}
                                    className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-sky-200/80 dark:border-white/10 shadow-2xs space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        {s.name}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          capacity.isDeficit
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        }`}
                                        title={`${capacity.availableCount} eligible faculty available for ${capacity.required} duties`}
                                      >
                                        {capacity.availableCount} Avail / {capacity.required} Req
                                      </span>
                                    </div>

                                    {/* Timings */}
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                                        Session Timings
                                      </span>
                                      <div className="flex items-center space-x-1.5 text-xs">
                                        <input
                                          type="time"
                                          value={currentTiming.start}
                                          onChange={(e) =>
                                            handleUpdateDateTiming(d.date, s.id, 'start', e.target.value)
                                          }
                                          className="px-2 py-1 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                                        />
                                        <span className="text-slate-400 font-bold">to</span>
                                        <input
                                          type="time"
                                          value={currentTiming.end}
                                          onChange={(e) =>
                                            handleUpdateDateTiming(d.date, s.id, 'end', e.target.value)
                                          }
                                          className="px-2 py-1 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                                        />
                                      </div>
                                    </div>

                                    {/* Arrival Category Chips */}
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                                        Eligible Arrivals
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {(['Morning', 'Mid', 'Afternoon'] as ArrivalCategory[]).map((cat) => {
                                          const isSelected = currentArrivalsList.includes(cat);
                                          return (
                                            <button
                                              key={cat}
                                              type="button"
                                              onClick={() => handleToggleDateArrival(d.date, s.id, cat)}
                                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                                isSelected
                                                  ? 'bg-sky-600 text-white border-sky-600'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/10'
                                              }`}
                                            >
                                              {cat}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date Session Customizer Modal */}
      <DateSessionModal
        dateConfig={customizingDate}
        isOpen={isDateSessionModalOpen}
        onClose={() => setIsDateSessionModalOpen(false)}
      />
    </div>
  );
};
