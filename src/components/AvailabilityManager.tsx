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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900">Faculty Availability Matrix</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                Interactive Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Click individual cells to toggle availability. Unavailable faculty are strictly excluded from duty on that date.
            </p>
          </div>

          {/* Bulk Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMarkAllAvailable}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Available</span>
            </button>

            <button
              onClick={handleMarkAllUnavailable}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Mark Filtered Unavailable</span>
            </button>
          </div>
        </div>

        {/* Copy Availability Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <Copy className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Copy Availability:</span>
            <span>From</span>
            <select
              value={copyFromDate}
              onChange={(e) => setCopyFromDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            >
              <option value="">Select Date...</option>
              {activeDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.displayDate}
                </option>
              ))}
            </select>
            <span>To</span>
            <select
              value={copyToDate}
              onChange={(e) => setCopyToDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
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
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded transition"
            >
              Apply Copy
            </button>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Available</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Unavailable</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty name or Sr. No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Faculty</option>
            <option value="Regular">Regular Faculty</option>
            <option value="HOD">HODs</option>
          </select>

          <select
            value={arrivalFilter}
            onChange={(e) => setArrivalFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Arrivals</option>
            <option value="Morning">Morning</option>
            <option value="Mid">Mid</option>
            <option value="Afternoon">Afternoon</option>
          </select>
        </div>
      </div>

      {/* Availability Matrix Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-16">Sr.</th>
                <th className="py-3 px-4 min-w-[200px]">Faculty Name</th>
                <th className="py-3 px-3 w-20">Role</th>
                <th className="py-3 px-3 w-24">Arrival</th>
                {activeDates.map((d) => (
                  <th key={d.date} className="py-3 px-3 text-center min-w-[110px]">
                    <div className="font-bold text-slate-900">{d.displayDate}</div>
                    <div className="text-[10px] font-normal text-slate-400">{d.dayOfWeek}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.map((f) => (
                <tr key={f.srNo} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-400">
                    {f.srNo}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    {f.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        f.isHod
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {f.isHod ? 'HOD' : 'Regular'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                    {f.arrival}
                  </td>

                  {/* Date Availability Toggles */}
                  {activeDates.map((d) => {
                    const availKey = `${f.srNo}_${d.date}`;
                    const isAvailable = project.availability[availKey] !== false; // Default true

                    return (
                      <td key={d.date} className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setAvailability(f.srNo, d.date, !isAvailable)}
                          className={`w-full py-1 px-2 rounded-lg font-medium text-xs flex items-center justify-center space-x-1 transition cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Available</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
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
