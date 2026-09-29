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
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Regular' | 'HOD'>('All');
  const [arrivalFilter, setArrivalFilter] = useState<'All' | ArrivalCategory>('All');
  const [inclusionFilter, setInclusionFilter] = useState<'All' | 'Active' | 'Excluded'>('All');
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [initialCountMode, setInitialCountMode] = useState<'zero' | 'uniform' | 'individual' | 'from_csv'>('zero');
  const [uniformValue, setUniformValue] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

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
      const content = evt.target?.result as string;
      setCsvRawText(content);
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

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Faculty Master Data</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
              {project.faculty.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Master roster loaded from CSV. Preserves original Sr. No., arrival categories, HOD designations, and workloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reassign HODs Button */}
          <button
            onClick={() => setIsReassignHodsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
            title="Reassign Department HODs and customize workloads"
          >
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>REASSIGN HODS</span>
          </button>

          {/* Download Sample */}
          <button
            onClick={() => handleDownloadSample(false)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Download clean CSV template with mandatory headers"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Sample CSV</span>
          </button>

          {/* Import CSV */}
          <label className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm cursor-pointer transition">
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

      {/* Filter and Stats Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-slate-500 font-medium">Breakdown:</span>
            <span className="font-semibold text-slate-700">
              Regular: <span className="text-sky-600">{facultyStats.regularCount}</span>
            </span>
            <span className="font-semibold text-slate-700">
              HODs: <span className="text-indigo-600">{facultyStats.hodCount}</span>
            </span>
            {facultyStats.excludedCount > 0 && (
              <span className="font-semibold text-amber-700">
                Excluded: <span className="text-amber-600">{facultyStats.excludedCount}</span>
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Morning: {facultyStats.morningCount}</span>
            <span className="text-slate-600">Mid: {facultyStats.midCount}</span>
            <span className="text-slate-600">Afternoon: {facultyStats.afternoonCount}</span>
          </div>

          <div className="text-[11px] text-slate-400">
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
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {/* Inclusion Filter */}
            <select
              value={inclusionFilter}
              onChange={(e) => setInclusionFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="All">All Duty Statuses</option>
              <option value="Active">Included / Active Only</option>
              <option value="Excluded">Excluded from Duties Only</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Roles</option>
              <option value="Regular">Regular Faculty</option>
              <option value="HOD">HODs Only</option>
            </select>

            {/* Arrival Filter */}
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
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
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
            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.map((f) => {
                const assignedCount = project.assignments.filter(
                  (a) => a.facultySrNo === f.srNo
                ).length;
                const total = f.previousSupervisions + assignedCount;
                const remaining = Math.max(0, f.maxSupervisions - total);
                const isAtTarget = total === f.targetSupervisions;
                const isOverMax = total > f.maxSupervisions;

                return (
                  <tr
                    key={f.srNo}
                    className={`transition ${
                      f.isExcluded ? 'bg-amber-50/20 text-slate-400' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      {f.srNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span>{f.name}</span>
                        {f.isExcluded && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800"
                            title={`Reason: ${f.exclusionReason || 'Excluded'}`}
                          >
                            Excluded
                          </span>
                        )}
                      </div>
                      {f.notes && (
                        <span className="block text-[10px] text-slate-400 font-normal italic">
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
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.isHod ? 'HOD' : 'Regular'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {f.isExcluded ? (
                        <button
                          type="button"
                          onClick={() => toggleFacultyExclusion(f.srNo)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition cursor-pointer"
                          title={`Excluded from duties (${f.exclusionReason || 'On Leave'}). Click to include.`}
                        >
                          Excluded
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt(
                              `Exclude ${f.name} from scheduling duties? Enter reason (e.g. Sabbatical, Medical Leave, Exam Committee):`,
                              'Medical Leave'
                            );
                            if (reason !== null) {
                              toggleFacultyExclusion(f.srNo, reason);
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                          title="Currently active & included in scheduling. Click to exclude."
                        >
                          Active
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          f.arrival === 'Morning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : f.arrival === 'Mid'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}
                      >
                        {f.arrival}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {f.previousSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                      {f.targetSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                      {f.maxSupervisions}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-sky-600">
                      {assignedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span
                        className={
                          isOverMax
                            ? 'text-rose-600'
                            : isAtTarget
                            ? 'text-emerald-600'
                            : 'text-slate-800'
                        }
                      >
                        {total}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {remaining}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isOverMax ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Over Max
                        </span>
                      ) : isAtTarget ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          Target Met
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
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
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                          title="Edit Faculty Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(f.srNo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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

      {/* CSV Import Modal with Initial Supervision Selector (Section 1 & 2) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Configure Imported Faculty Master Data
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                CSV validated. Choose how to initialize previous supervision counts for this scheduling period.
              </p>
            </div>

            {/* Error alerts */}
            {importErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>CSV Validation Errors:</span>
                </div>
                {importErrors.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            {/* Setup selector for Initial / Previous Supervisions (Requirement 2) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                INITIAL / PREVIOUS SUPERVISION COUNT
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer">
                  <input
                    type="radio"
                    name="initialCount"
                    checked={initialCountMode === 'zero'}
                    onChange={() => setInitialCountMode('zero')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Start everyone at 0</span>
                    <span className="block text-slate-500 text-[11px]">
                      Recommended for fresh scheduling periods.
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer">
                  <input
                    type="radio"
                    name="initialCount"
                    checked={initialCountMode === 'uniform'}
                    onChange={() => setInitialCountMode('uniform')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800">Set the same number for everyone</span>
                    {initialCountMode === 'uniform' && (
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={uniformValue}
                        onChange={(e) => setUniformValue(parseInt(e.target.value, 10) || 0)}
                        className="mt-1 block w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer">
                  <input
                    type="radio"
                    name="initialCount"
                    checked={initialCountMode === 'from_csv'}
                    onChange={() => setInitialCountMode('from_csv')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Import from optional CSV column ("No. of Supervision")
                    </span>
                    <span className="block text-slate-500 text-[11px]">
                      Loads individual counts directly if the column exists in your CSV.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
              >
                Confirm & Import Faculty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Individual Edit Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Faculty: {editingFaculty.name} (Sr. #{editingFaculty.srNo})
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Faculty Name</label>
                <input
                  type="text"
                  value={editingFaculty.name}
                  onChange={(e) =>
                    setEditingFaculty({ ...editingFaculty, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">HOD Designation</label>
                  <select
                    value={editingFaculty.isHod ? 'Yes' : 'No'}
                    onChange={(e) => {
                      const isHod = e.target.value === 'Yes';
                      setEditingFaculty({
                        ...editingFaculty,
                        isHod,
                        // Update default targets if not customized
                        targetSupervisions: isHod ? 4 : 6,
                        maxSupervisions: isHod ? 4 : 6,
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="No">No (Regular Faculty)</option>
                    <option value="Yes">Yes (HOD)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Arrival Category</label>
                  <select
                    value={editingFaculty.arrival}
                    onChange={(e) =>
                      setEditingFaculty({
                        ...editingFaculty,
                        arrival: e.target.value as ArrivalCategory,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Morning">Morning (JRS 1, JRS 2)</option>
                    <option value="Mid">Mid (JRS 1, JRS 2, JRS 3)</option>
                    <option value="Afternoon">Afternoon (JRS 2, JRS 3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Previous Supervisions</label>
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Target Workload</label>
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Maximum Allowed
                    {editingFaculty.isHod && (
                      <span className="block text-[10px] text-indigo-600 font-normal">
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
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Inclusion / Exclusion Setting */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2">
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
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-amber-900">
                    Exclude from Duty Allocation (Temporary Inactive)
                  </span>
                </label>
                <p className="text-[11px] text-amber-700 ml-6">
                  Excluded faculty are retained in master data but exempt from scheduling solver duties.
                </p>

                {editingFaculty.isExcluded && (
                  <div className="ml-6 pt-1">
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">
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
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={editingFaculty.notes || ''}
                  onChange={(e) =>
                    setEditingFaculty({ ...editingFaculty, notes: e.target.value })
                  }
                  placeholder="Optional notes or scheduling preferences..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
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
