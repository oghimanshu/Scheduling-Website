import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Copy,
  CheckCheck,
  Ban,
  Calendar,
  Users,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ArrivalCategory } from '../types';

export const AvailabilityManager: React.FC = () => {
  const {
    project,
    setAvailability,
    bulkSetAvailability,
    copyAvailabilityDateToDate,
    updateFacultyExcludedDates,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Regular' | 'HOD'>('All');
  const [arrivalFilter, setArrivalFilter] = useState<'All' | ArrivalCategory>('All');
  const [copyFromDate, setCopyFromDate] = useState<string>('');
  const [copyToDate, setCopyToDate] = useState<string>('');

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  // Filtered faculty
  const filteredFaculty = useMemo(() => {
    return project.faculty.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.srNo.toString().includes(searchTerm);
      const matchRole =
        roleFilter === 'All' ? true : roleFilter === 'HOD' ? f.isHod : !f.isHod;
      const matchArrival =
        arrivalFilter === 'All' ? true : f.arrival === arrivalFilter;
      return matchSearch && matchRole && matchArrival;
    });
  }, [project.faculty, searchTerm, roleFilter, arrivalFilter]);

  // Bulk actions on current filtered faculty
  const handleMarkAllAvailable = () => {
    const srNos = filteredFaculty.map((f) => f.srNo);
    const dateStrs = activeDates.map((d) => d.date);
    bulkSetAvailability(srNos, dateStrs, true);
  };

  const handleMarkAllUnavailable = () => {
    if (
      confirm(
        `Are you sure you want to mark all ${filteredFaculty.length} visible faculty unavailable on all active dates?`
      )
    ) {
      const srNos = filteredFaculty.map((f) => f.srNo);
      const dateStrs = activeDates.map((d) => d.date);
      bulkSetAvailability(srNos, dateStrs, false);
    }
  };

  const handleCopyDate = () => {
    if (!copyFromDate || !copyToDate) {
      alert('Please select both source and target dates.');
      return;
    }
    if (copyFromDate === copyToDate) {
      alert('Source and target dates must be different.');
      return;
    }
    copyAvailabilityDateToDate(copyFromDate, copyToDate);
    alert(`Copied availability from ${copyFromDate} to ${copyToDate}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Bulk Controls */}
      <div className="apple-glass-card p-5 space-y-4">
        <div className="apple-specular-rim" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Faculty Availability Matrix</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                Interactive Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click individual cells to toggle availability. Unavailable faculty are strictly excluded from duty on that date.
            </p>
          </div>

          {/* Bulk Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMarkAllAvailable}
              className="btn-spring inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40 rounded-lg cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Available</span>
            </button>

            <button
              onClick={handleMarkAllUnavailable}
              className="btn-spring inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40 rounded-lg cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Mark Filtered Unavailable</span>
            </button>
          </div>
        </div>

        {/* Copy Availability Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Copy Availability:</span>
            <span className="text-slate-500 dark:text-slate-400">From</span>
            <select
              value={copyFromDate}
              onChange={(e) => setCopyFromDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
            >
              <option value="">Select Date...</option>
              {activeDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.displayDate}
                </option>
              ))}
            </select>
            <span className="text-slate-500 dark:text-slate-400">To</span>
            <select
              value={copyToDate}
              onChange={(e) => setCopyToDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
            >
              <option value="">Select Date...</option>
              {activeDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.displayDate}
                </option>
              ))}
            </select>
            <button
              onClick={handleCopyDate}
              className="btn-spring px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg cursor-pointer"
            >
              Apply Copy
            </button>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
              <span>Available</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm"></span>
              <span>Unavailable</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="apple-glass-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search faculty name or Sr. No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Faculty</option>
            <option value="Regular">Regular Faculty</option>
            <option value="HOD">HODs</option>
          </select>

          <select
            value={arrivalFilter}
            onChange={(e) => setArrivalFilter(e.target.value as any)}
            className="text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Arrivals</option>
            <option value="Morning">Morning</option>
            <option value="Mid">Mid</option>
            <option value="Afternoon">Afternoon</option>
          </select>
        </div>
      </div>

      {/* Availability Matrix Grid */}
      <div className="apple-glass-card overflow-hidden">
        <div className="apple-specular-rim" />

        {/* Quick Date Jumper for Mobile Screens */}
        {activeDates.length > 0 && (
          <div className="sm:hidden flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-2 px-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50" data-lenis-prevent>
            <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Date Jump:</span>
            {activeDates.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`avail-date-th-${d.date}`);
                  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className="btn-spring px-2 py-1 rounded-lg text-[10px] font-bold bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shrink-0 tabular-nums cursor-pointer"
              >
                {d.displayDate.split(' ')[0]} {d.displayDate.split(' ')[1]}
              </button>
            ))}
          </div>
        )}

        <div className="table-fade-indicator overflow-x-auto touch-scroll" data-lenis-prevent>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="py-3 px-3 sm:px-4 w-12 sm:w-16 sticky left-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs">Sr.</th>
                <th className="py-3 px-3 sm:px-4 min-w-[150px] sm:min-w-[200px] sticky left-12 sm:left-16 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">Faculty Name</th>
                <th className="py-3 px-3 w-20">Role</th>
                <th className="py-3 px-3 w-24">Arrival</th>
                {activeDates.map((d) => (
                  <th key={d.date} id={`avail-date-th-${d.date}`} className="py-3 px-3 text-center min-w-[110px]">
                    <div className="font-bold text-slate-900 dark:text-white tabular-nums">{d.displayDate}</div>
                    <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{d.dayOfWeek}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredFaculty.map((f) => (
                <tr key={f.srNo} className="group hover:bg-sky-50/30 dark:hover:bg-white/5 transition">
                  <td className="py-2.5 px-3 sm:px-4 font-mono tabular-nums font-medium text-slate-400 dark:text-slate-500 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                    {f.srNo}
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-900 dark:text-white sticky left-12 sm:left-16 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    <span className="truncate max-w-[120px] sm:max-w-none block">{f.name}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        f.isHod
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/40'
                      }`}
                    >
                      {f.isHod ? 'HOD' : 'Regular'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                    {f.arrival}
                  </td>

                  {/* Date Availability Toggles */}
                  {activeDates.map((d) => {
                    const availKey = `${f.srNo}_${d.date}`;
                    const isDateExcludedByList = Array.isArray(f.excludedDates) && f.excludedDates.includes(d.date);
                    const isAvailable = ((project.availability || {})[availKey] !== false) && !isDateExcludedByList;

                    return (
                      <td key={d.date} className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !isAvailable;
                            setAvailability(f.srNo, d.date, nextVal);
                            const currentExcluded = f.excludedDates || [];
                            const updated = nextVal
                              ? currentExcluded.filter((dt) => dt !== d.date)
                              : [...currentExcluded, d.date];
                            updateFacultyExcludedDates(f.srNo, updated);
                          }}
                          className={`w-full py-1 px-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-1 transition cursor-pointer active:scale-95 ${
                            isAvailable
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                              : 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Available</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>Leave</span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
