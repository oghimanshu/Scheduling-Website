import React, { useState } from 'react';
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
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ExamDateConfig, ExclusionReason, SessionType } from '../types';

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

  // Calculate total positions dynamically across all configured sessions
  const activeDates = project.examPeriod.dates.filter((d) => !d.isExcluded);
  const totalPeriodPositions = activeDates.reduce((sum, d) => {
    const daySum = (project.sessions || []).reduce(
      (sSum, s) => sSum + (d.sessionRequirements[s.id] || 0),
      0
    );
    return sum + daySum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Period Setup Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Examination Period Setup</h2>
          <p className="text-xs text-slate-500 mt-1">
            Specify the exam date boundaries and generate active dates. Dates can be individually marked as holidays or non-examination days.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Examination Period Name
            </label>
            <input
              type="text"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              START DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              END DATE
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Current configuration: <strong className="text-slate-800">{activeDates.length}</strong> active exam dates,{' '}
            <strong className="text-slate-800">{totalPeriodPositions}</strong> total positions required.
          </div>
          <button
            onClick={handleGenerateDates}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
          >
            GENERATE DATES
          </button>
        </div>
      </div>

      {/* Global Staffing Template & Apply All */}
      <div className="bg-sky-50/70 p-5 rounded-xl border border-sky-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
              Daily Staffing Requirements
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-200 text-sky-800">
              {(project.sessions || []).length} Sessions Configured
            </span>
          </div>
          <p className="text-xs text-sky-700 mt-0.5">
            Default: JRS 1 = 17, JRS 2 = 25, JRS 3 = 15. Set values below and click to apply universally to all active dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(project.sessions || []).map((s) => (
            <div
              key={s.id}
              className="flex items-center space-x-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-sky-200 shadow-2xs"
            >
              <span className="font-semibold text-slate-700">{s.name}:</span>
              <input
                type="number"
                min="0"
                value={getTemplateReq(s.id, s.defaultRequirement)}
                onChange={(e) => setTemplateReq(s.id, parseInt(e.target.value, 10) || 0)}
                className="w-14 text-center font-bold text-slate-900 border-b border-sky-300 focus:outline-none"
              />
            </div>
          ))}

          <button
            onClick={handleApplyToAllActiveDates}
            className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition"
          >
            Apply to all dates
          </button>

          {/* Manage Sessions & Timings Modal Trigger */}
          <button
            onClick={() => setIsSessionManagerModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg shadow-2xs transition"
            title="Add additional JRS sessions (e.g. JRS 4) or edit timings"
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span>MANAGE SESSIONS (JRS)</span>
          </button>
        </div>
      </div>

      {/* Date-by-Date Configuration Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Individual Date Roster & Exclusions ({project.examPeriod.dates.length} Dates)
            </h3>
            <span className="text-xs text-slate-500">
              Excluded dates require zero supervisors and cannot receive assignments.
            </span>
          </div>

          <button
            onClick={() => setIsSessionManagerModalOpen(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Add / Edit JRS Sessions & Timings &rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Exclusion Reason</th>
                {(project.sessions || []).map((s) => (
                  <th key={s.id} className="py-3 px-3 text-center">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {s.defaultTiming.start}-{s.defaultTiming.end}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center">Total Staffing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.examPeriod.dates.map((d) => {
                const dayTotal = (project.sessions || []).reduce(
                  (acc, s) => acc + (d.sessionRequirements[s.id] || 0),
                  0
                );

                return (
                  <tr
                    key={d.date}
                    className={`transition ${
                      d.isExcluded ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    {/* Checkbox toggle */}
                    <td className="py-3 px-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!d.isExcluded}
                          onChange={() => handleToggleExclusion(d.date)}
                          className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                        />
                        <span className="text-[11px] font-medium">
                          {!d.isExcluded ? (
                            <span className="text-emerald-700 font-bold">Active</span>
                          ) : (
                            <span className="text-slate-400">Excluded</span>
                          )}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-4 font-semibold">{d.displayDate}</td>
                    <td className="py-3 px-4">{d.dayOfWeek}</td>

                    {/* Exclusion Reason selector */}
                    <td className="py-3 px-4">
                      {d.isExcluded ? (
                        <select
                          value={d.exclusionReason || 'No Examination'}
                          onChange={(e) =>
                            handleChangeExclusionReason(d.date, e.target.value as ExclusionReason)
                          }
                          className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium"
                        >
                          <option value="Holiday">HOLIDAY</option>
                          <option value="No Examination">NO EXAMINATION</option>
                          <option value="Other">OTHER</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Examination Active</span>
                      )}
                    </td>

                    {/* Dynamic Session Columns */}
                    {(project.sessions || []).map((s) => (
                      <td key={s.id} className="py-3 px-3 text-center">
                        <input
                          type="number"
                          disabled={d.isExcluded}
                          min="0"
                          value={d.sessionRequirements[s.id] ?? 0}
                          onChange={(e) =>
                            handleUpdateRequirement(d.date, s.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 text-center font-bold px-1.5 py-1 border border-slate-200 rounded disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                    ))}

                    {/* Total */}
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {d.isExcluded ? (
                        <span className="text-slate-400">0</span>
                      ) : (
                        <span className="text-sky-700">{dayTotal}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
