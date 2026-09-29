import React, { useState, useMemo } from 'react';
import {
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  FileText,
  Sliders,
  Award,
  Calendar,
  CalendarX,
  X,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Faculty, ArrivalCategory } from '../types';
import {
  parseFacultyCSV,
  generateSampleFacultyCSV,
  InitialSupervisionOption,
} from '../services/csvParser';

export const FacultyManager: React.FC = () => {
  const {
    project,
    updateFacultyList,
    setIsReassignHodsModalOpen,
    toggleFacultyHod,
    toggleFacultyExclusion,
    updateFacultyExcludedDates,
    updateRoleWorkloadCap,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Regular' | 'HOD'>('All');
  const [arrivalFilter, setArrivalFilter] = useState<'All' | ArrivalCategory>('All');
  const [inclusionFilter, setInclusionFilter] = useState<'All' | 'Active' | 'Excluded'>('All');
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  // Date-Specific Faculty Exclusion Modal State
  const [dateExclusionFaculty, setDateExclusionFaculty] = useState<Faculty | null>(null);
  const [selectedExcludedDates, setSelectedExcludedDates] = useState<string[]>([]);

  // Bulk role-based caps state
  const [regularCapInput, setRegularCapInput] = useState<number>(6);
  const [hodCapInput, setHodCapInput] = useState<number>(4);
  const [roleCapMessage, setRoleCapMessage] = useState<string | null>(null);

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [initialCountMode, setInitialCountMode] = useState<'zero' | 'uniform' | 'individual' | 'from_csv'>('zero');
  const [uniformValue, setUniformValue] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Calculate dynamic stats
  const facultyStats = useMemo(() => {
    let regularCount = 0;
    let hodCount = 0;
    let morningCount = 0;
    let midCount = 0;
    let afternoonCount = 0;
    let excludedCount = 0;

    project.faculty.forEach((f) => {
      if (f.isExcluded) excludedCount++;
      if (f.isHod) hodCount++;
      else regularCount++;

      if (f.arrival === 'Morning') morningCount++;
      else if (f.arrival === 'Mid') midCount++;
      else if (f.arrival === 'Afternoon') afternoonCount++;
    });

    return { regularCount, hodCount, morningCount, midCount, afternoonCount, excludedCount };
  }, [project.faculty]);

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return project.faculty.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.srNo.toString().includes(searchTerm);
      const matchRole =
        roleFilter === 'All' ? true : roleFilter === 'HOD' ? f.isHod : !f.isHod;
      const matchArrival =
        arrivalFilter === 'All' ? true : f.arrival === arrivalFilter;
      const matchInclusion =
        inclusionFilter === 'All'
          ? true
          : inclusionFilter === 'Active'
          ? !f.isExcluded
          : f.isExcluded;

      return matchSearch && matchRole && matchArrival && matchInclusion;
    });
  }, [project.faculty, searchTerm, roleFilter, arrivalFilter, inclusionFilter]);

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = (evt.target?.result as string) || '';
      setCsvRawText(content);
      const prelim = parseFacultyCSV(content, { mode: 'zero' });
      setImportErrors(prelim.errors);
      setImportWarnings(prelim.warnings);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Perform CSV import with selected Initial Supervision Option
  const handleConfirmImport = () => {
    const option: InitialSupervisionOption =
      initialCountMode === 'uniform'
        ? { mode: 'uniform', value: uniformValue }
        : initialCountMode === 'from_csv'
        ? { mode: 'from_csv' }
        : { mode: 'zero' };

    const result = parseFacultyCSV(csvRawText, option);

    if (!result.success) {
      setImportErrors(result.errors);
      setImportWarnings(result.warnings);
      return;
    }

    updateFacultyList(result.faculty);
    setIsImportModalOpen(false);
    setCsvRawText('');
    setImportErrors([]);
    setImportWarnings([]);
    setImportSuccessMessage(`Successfully imported ${result.faculty.length} faculty members into this session!`);
    setTimeout(() => setImportSuccessMessage(null), 6000);
  };

  // Download Sample CSV
  const handleDownloadSample = (withSupervision = false) => {
    const sample = generateSampleFacultyCSV(withSupervision);
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = withSupervision ? 'faculty_sample_with_supervision.csv' : 'faculty_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save Faculty Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;

    const updated = project.faculty.map((f) =>
      f.srNo === editingFaculty.srNo ? editingFaculty : f
    );
    updateFacultyList(updated);
    setEditingFaculty(null);
  };

  // Delete Faculty
  const handleDeleteFaculty = (srNo: number) => {
    if (confirm(`Are you sure you want to remove faculty member #${srNo}?`)) {
      updateFacultyList(project.faculty.filter((f) => f.srNo !== srNo));
    }
  };

  // Bulk role-based cap apply handlers
  const handleApplyRegularCap = () => {
    if (regularCapInput < 1) {
      alert('Cap must be at least 1.');
      return;
    }
    updateRoleWorkloadCap('regular', regularCapInput);
    setRoleCapMessage(`Successfully updated all ${facultyStats.regularCount} Regular Faculty to maximum cap of ${regularCapInput}!`);
    setTimeout(() => setRoleCapMessage(null), 4000);
  };

  const handleApplyHodCap = () => {
    if (hodCapInput < 1) {
      alert('Cap must be at least 1.');
      return;
    }
    updateRoleWorkloadCap('hod', hodCapInput);
    setRoleCapMessage(`Successfully updated all ${facultyStats.hodCount} HODs to maximum cap of ${hodCapInput}!`);
    setTimeout(() => setRoleCapMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Import Success Banner */}
      {importSuccessMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            onClick={() => setImportSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Empty State / Session Upload Prompt */}
      {project.faculty.length === 0 && (
        <div className="bg-gradient-to-br from-sky-50 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 border-2 border-dashed border-sky-300 dark:border-sky-700/50 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-inner mb-3">
            <Upload className="w-7 h-7" />
          </div>
          <div className="max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Faculty Master CSV for This Session</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Every browser session starts clean. Please upload your college faculty CSV roster, or download the example format below to fill in your data.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-5">
            <button
              onClick={() => handleDownloadSample(false)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800/60 rounded-xl shadow-xs transition cursor-pointer"
              title="Download standard CSV format with mandatory headers: Sr. No., Faculty Name, HOD, Arrival"
            >
              <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>DOWNLOAD EXAMPLE FORMAT (.CSV)</span>
            </button>

            <label className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>IMPORT FACULTY CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Header & Actions */}
      <div className="apple-glass-card rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="apple-specular-rim" />
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Faculty Master Data</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-100/80 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-400/30">
              {project.faculty.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Master roster loaded from CSV. Preserves original Sr. No., arrival categories, HOD designations, and workloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reassign HODs Button */}
          <button
            onClick={() => setIsReassignHodsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition cursor-pointer"
            title="Reassign Department HODs and customize workloads"
          >
            <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>REASSIGN HODS</span>
          </button>

          {/* Download Example Format */}
          <button
            onClick={() => handleDownloadSample(false)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition cursor-pointer"
            title="Download clean example CSV template ready to be filled"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>DOWNLOAD EXAMPLE FORMAT</span>
          </button>

          {/* Import CSV */}
          <label className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-md shadow-sky-500/25 border border-white/20 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT FACULTY CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Role-Based Bulk Workload Cap Manager */}
      <div className="apple-glass-card rounded-2xl p-5 border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="apple-specular-rim" />
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Role-Based Workload Limits (Bulk Cap Manager)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Change maximum duty cap for all HODs or all Regular Faculty in one go instead of manual individual editing.
          </p>
          {roleCapMessage && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ✓ {roleCapMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Regular Faculty Bulk Cap */}
          <div className="flex items-center space-x-2 bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Regular Cap:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={regularCapInput}
              onChange={(e) => setRegularCapInput(parseInt(e.target.value, 10) || 1)}
              className="w-12 text-center text-xs font-bold border-b border-sky-400 focus:outline-none dark:bg-transparent dark:text-white"
            />
            <button
              onClick={handleApplyRegularCap}
              className="px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg border border-sky-500/30 transition cursor-pointer"
              title="Apply this cap to all regular faculty members"
            >
              Apply All Regular ({facultyStats.regularCount})
            </button>
          </div>

          {/* HOD Bulk Cap */}
          <div className="flex items-center space-x-2 bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">HOD Cap:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={hodCapInput}
              onChange={(e) => setHodCapInput(parseInt(e.target.value, 10) || 1)}
              className="w-12 text-center text-xs font-bold border-b border-indigo-400 focus:outline-none dark:bg-transparent dark:text-white"
            />
            <button
              onClick={handleApplyHodCap}
              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition cursor-pointer"
              title="Apply this cap to all department HODs"
            >
              Apply All HODs ({facultyStats.hodCount})
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="apple-glass-card rounded-2xl p-4 border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark relative overflow-hidden space-y-4">
        <div className="apple-specular-rim" />
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3 text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Breakdown:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Regular: <span className="text-sky-600 dark:text-sky-400">{facultyStats.regularCount}</span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              HODs: <span className="text-indigo-600 dark:text-indigo-400">{facultyStats.hodCount}</span>
            </span>
            {facultyStats.excludedCount > 0 && (
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Excluded: <span className="text-amber-600 dark:text-amber-400">{facultyStats.excludedCount}</span>
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-300">Morning: {facultyStats.morningCount}</span>
            <span className="text-slate-600 dark:text-slate-300">Mid: {facultyStats.midCount}</span>
            <span className="text-slate-600 dark:text-slate-300">Afternoon: {facultyStats.afternoonCount}</span>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Arrival eligibility: Morning (JRS 1+2), Mid (JRS 1+2+3), Afternoon (JRS 2+3)
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty name or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white transition"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {/* Inclusion Filter */}
            <select
              value={inclusionFilter}
              onChange={(e) => setInclusionFilter(e.target.value as any)}
              className="text-xs bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="All">All Duty Statuses</option>
              <option value="Active">Included / Active Only</option>
              <option value="Excluded">Excluded from Duties Only</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-xs bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Roles</option>
              <option value="Regular">Regular Faculty</option>
              <option value="HOD">HODs Only</option>
            </select>

            {/* Arrival Filter */}
            <select
              value={arrivalFilter}
              onChange={(e) => setArrivalFilter(e.target.value as any)}
              className="text-xs bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Arrivals</option>
              <option value="Morning">Morning</option>
              <option value="Mid">Mid</option>
              <option value="Afternoon">Afternoon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="apple-glass-card rounded-2xl border border-white/60 dark:border-white/10 shadow-glass dark:shadow-glass-dark relative overflow-hidden">
        <div className="apple-specular-rim" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/10 text-[11px]">
              <tr>
                <th className="py-3 px-4">Sr. No.</th>
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-center">Duties</th>
                <th className="py-3 px-3">Arrival</th>
                <th className="py-3 px-3 text-center">Previous</th>
                <th className="py-3 px-3 text-center">Target</th>
                <th className="py-3 px-3 text-center">Maximum</th>
                <th className="py-3 px-3 text-center">New</th>
                <th className="py-3 px-3 text-center">Total</th>
                <th className="py-3 px-3 text-center">Remaining</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredFaculty.map((f) => {
                const assignedCount = project.assignments.filter(
                  (a) => a.facultySrNo === f.srNo
                ).length;
                const total = f.previousSupervisions + assignedCount;
                const remaining = Math.max(0, f.maxSupervisions - total);
                const isAtTarget = total === f.targetSupervisions;
                const isOverMax = total > f.maxSupervisions;
                const dateExclusionsCount = f.excludedDates?.length || 0;

                return (
                  <tr
                    key={f.srNo}
                    className={`transition ${
                      f.isExcluded
                        ? 'bg-amber-50/30 dark:bg-amber-950/20 text-slate-400 dark:text-slate-500'
                        : 'hover:bg-slate-50/80 dark:hover:bg-white/5'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-500 dark:text-slate-400">
                      {f.srNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span>{f.name}</span>
                        {f.isExcluded && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50"
                            title={`Reason: ${f.exclusionReason || 'Excluded'}`}
                          >
                            Excluded
                          </span>
                        )}
                        {dateExclusionsCount > 0 && !f.isExcluded && (
                          <span
                            onClick={() => {
                              setDateExclusionFaculty(f);
                              setSelectedExcludedDates(f.excludedDates || []);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/60 transition"
                            title={`Excluded on ${dateExclusionsCount} specific exam dates. Click to view/edit.`}
                          >
                            {dateExclusionsCount} Date{dateExclusionsCount > 1 ? 's' : ''} Off
                          </span>
                        )}
                      </div>
                      {f.notes && (
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal italic">
                          {f.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleFacultyHod(f.srNo)}
                        title="Click to toggle between Regular and HOD designation"
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          f.isHod
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f.isHod ? 'HOD' : 'Regular'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {f.isExcluded ? (
                          <button
                            type="button"
                            onClick={() => toggleFacultyExclusion(f.srNo)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 hover:bg-amber-200 transition cursor-pointer"
                            title={`Excluded from entire period (${f.exclusionReason || 'On Leave'}). Click to include.`}
                          >
                            Full Exclusion
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt(
                                `Exclude ${f.name} completely from scheduling duties? Enter reason (e.g. Sabbatical, Medical Leave, Exam Committee):`,
                                'Medical Leave'
                              );
                              if (reason !== null) {
                                toggleFacultyExclusion(f.srNo, reason);
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/70 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-200 dark:hover:border-rose-800/50 transition cursor-pointer"
                            title="Currently active & included in scheduling. Click to exclude completely."
                          >
                            Active
                          </button>
                        )}

                        {/* Date-specific exclusion button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDateExclusionFaculty(f);
                            setSelectedExcludedDates(f.excludedDates || []);
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold flex items-center space-x-1 transition cursor-pointer ${
                            dateExclusionsCount > 0
                              ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60 hover:bg-orange-200'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                          }`}
                          title="Manage specific date exclusions for this faculty"
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          <span>
                            {dateExclusionsCount > 0
                              ? `${dateExclusionsCount} Dates Off`
                              : 'Exclude Dates'}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          f.arrival === 'Morning'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                            : f.arrival === 'Mid'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
                        }`}
                      >
                        {f.arrival}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {f.previousSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-200">
                      {f.targetSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {f.maxSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {assignedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span
                        className={
                          isOverMax
                            ? 'text-rose-600 dark:text-rose-400'
                            : isAtTarget
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }
                      >
                        {total}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                      {remaining}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isOverMax ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50">
                          Over Max
                        </span>
                      ) : isAtTarget ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                          Target Met
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                          {total < f.targetSupervisions
                            ? `${f.targetSupervisions - total} needed`
                            : 'Non-standard'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setEditingFaculty({ ...f })}
                          className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Edit Faculty Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(f.srNo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Delete Faculty Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date-Specific Faculty Exclusion Modal */}
      {dateExclusionFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-slate-200/60 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <CalendarX className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Date-Specific Duty Exclusions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {dateExclusionFaculty.name} (Sr. #{dateExclusionFaculty.srNo}) &bull; {dateExclusionFaculty.isHod ? 'HOD' : 'Regular Faculty'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDateExclusionFaculty(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Check specific exam dates to <strong>exclude</strong> this faculty member from duties (e.g. for personal leave or conference). On unchecked dates, they remain fully available for scheduling.
              </p>

              {/* Quick Bulk Selection */}
              <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {selectedExcludedDates.length} of {project.examPeriod.dates.filter(d => !d.isExcluded).length} active dates excluded
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const activeDateStrs = project.examPeriod.dates.filter(d => !d.isExcluded).map(d => d.date);
                      setSelectedExcludedDates(activeDateStrs);
                    }}
                    className="text-[11px] font-semibold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer"
                  >
                    Exclude All Dates
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedExcludedDates([])}
                    className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    Clear (Available All Dates)
                  </button>
                </div>
              </div>
            </div>

            {/* Dates List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
              {project.examPeriod.dates
                .filter((d) => !d.isExcluded)
                .map((d) => {
                  const isDateExcluded = selectedExcludedDates.includes(d.date);
                  return (
                    <label
                      key={d.date}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        isDateExcluded
                          ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700/60 text-orange-900 dark:text-orange-200'
                          : 'bg-white/70 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isDateExcluded}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExcludedDates([...selectedExcludedDates, d.date]);
                            } else {
                              setSelectedExcludedDates(selectedExcludedDates.filter(dt => dt !== d.date));
                            }
                          }}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                        />
                        <div>
                          <div className="font-semibold text-xs">
                            {d.displayDate} ({d.dayOfWeek})
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {Object.entries(d.sessionRequirements)
                              .map(([s, req]) => `${s}: ${req}`)
                              .join(' | ')}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDateExcluded
                            ? 'bg-orange-200 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {isDateExcluded ? 'Leave / Excluded' : 'Available'}
                      </span>
                    </label>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDateExclusionFaculty(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateFacultyExcludedDates(dateExclusionFaculty.srNo, selectedExcludedDates);
                  setDateExclusionFaculty(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl shadow-md transition cursor-pointer"
              >
                Save Date Exclusions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal with Initial Supervision Selector */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configure Imported Faculty Master Data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    CSV file loaded. Select duty initialization and confirm import.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrors([]);
                  setImportWarnings([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Error alerts */}
              {importErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200 space-y-2">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-800 dark:text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>CSV Validation Errors:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-rose-700 dark:text-rose-300">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
                    Please fix the CSV file and re-upload, or download the empty example format to check the required column headers.
                  </p>
                </div>
              )}

              {/* Warning alerts */}
              {importWarnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>CSV Notices:</span>
                  </div>
                  {importWarnings.map((warn, idx) => (
                    <p key={idx}>• {warn}</p>
                  ))}
                </div>
              )}

              {/* Setup selector for Initial / Previous Supervisions */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  INITIAL / PREVIOUS SUPERVISION COUNT
                </label>

                <div className="space-y-2.5">
                  <label className="flex items-start space-x-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-sky-500/50 dark:hover:border-sky-500/50 transition cursor-pointer">
                    <input
                      type="radio"
                      name="initialCount"
                      checked={initialCountMode === 'zero'}
                      onChange={() => setInitialCountMode('zero')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Start everyone at 0</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Recommended for fresh examination scheduling sessions.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-sky-500/50 dark:hover:border-sky-500/50 transition cursor-pointer">
                    <input
                      type="radio"
                      name="initialCount"
                      checked={initialCountMode === 'uniform'}
                      onChange={() => setInitialCountMode('uniform')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-white block">Set uniform previous count for everyone</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Applies the same number of prior duties to every imported faculty member.
                      </span>
                      {initialCountMode === 'uniform' && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Duties per member:</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={uniformValue}
                            onChange={(e) => setUniformValue(parseInt(e.target.value, 10) || 0)}
                            className="w-20 px-2.5 py-1 text-xs border border-slate-300 dark:border-white/15 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-sky-500/50 dark:hover:border-sky-500/50 transition cursor-pointer">
                    <input
                      type="radio"
                      name="initialCount"
                      checked={initialCountMode === 'from_csv'}
                      onChange={() => setInitialCountMode('from_csv')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Import from optional CSV column ("No. of Supervision")
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Loads individual carried forward counts directly from your CSV roster.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer with High-Contrast Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportErrors([]);
                    setImportWarnings([]);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel / Close
                </button>
                {importErrors.length > 0 && (
                  <label className="px-3.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-300 dark:border-sky-800/50 rounded-xl transition cursor-pointer inline-flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Different CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importErrors.length > 0}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 rounded-xl shadow-md shadow-sky-500/25 transition cursor-pointer"
              >
                {importErrors.length > 0 ? 'Cannot Import (Resolve Errors Above)' : 'Confirm & Import Faculty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Individual Edit Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Faculty: {editingFaculty.name} (Sr. #{editingFaculty.srNo})
              </h3>
              <button
                type="button"
                onClick={() => setEditingFaculty(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Faculty Name</label>
                <input
                  type="text"
                  value={editingFaculty.name}
                  onChange={(e) =>
                    setEditingFaculty({ ...editingFaculty, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">HOD Designation</label>
                  <select
                    value={editingFaculty.isHod ? 'Yes' : 'No'}
                    onChange={(e) => {
                      const isHod = e.target.value === 'Yes';
                      setEditingFaculty({
                        ...editingFaculty,
                        isHod,
                        targetSupervisions: isHod ? 4 : 6,
                        maxSupervisions: isHod ? 4 : 6,
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="No">No (Regular Faculty)</option>
                    <option value="Yes">Yes (HOD)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Arrival Category</label>
                  <select
                    value={editingFaculty.arrival}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        arrival: e.target.value as ArrivalCategory,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Morning">Morning (JRS 1, JRS 2)</option>
                    <option value="Mid">Mid (JRS 1, JRS 2, JRS 3)</option>
                    <option value="Afternoon">Afternoon (JRS 2, JRS 3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Previous Supervisions</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingFaculty.previousSupervisions}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        previousSupervisions: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Workload</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingFaculty.targetSupervisions}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        targetSupervisions: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Maximum Allowed
                    {editingFaculty.isHod && (
                      <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                        (Custom HOD Cap)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingFaculty.maxSupervisions}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        maxSupervisions: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Inclusion / Exclusion Setting */}
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-700/40 rounded-2xl space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFaculty.isExcluded ?? false}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        isExcluded: e.target.checked,
                        exclusionReason: e.target.checked
                          ? editingFaculty.exclusionReason || 'Medical / Personal / Sabbatical'
                          : undefined,
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Exclude from Period (Entire Scheduling Period)
                  </span>
                </label>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 ml-6">
                  Excluded faculty are retained in master data but exempt from all duty allocations.
                </p>

                {editingFaculty.isExcluded && (
                  <div className="ml-6 pt-1">
                    <label className="block text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1">
                      Reason for Exclusion:
                    </label>
                    <input
                      type="text"
                      value={editingFaculty.exclusionReason || ''}
                      onChange={(e) =>
                        setEditingFaculty({
                          ...editingFaculty,
                          exclusionReason: e.target.value,
                        })
                      }
                      placeholder="e.g., Medical leave, Research sabbatical, Maternity leave"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={editingFaculty.notes || ''}
                  onChange={(e) =>
                    setEditingFaculty({ ...editingFaculty, notes: e.target.value })
                  }
                  placeholder="Optional notes or scheduling preferences..."
                  className="w-full px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
