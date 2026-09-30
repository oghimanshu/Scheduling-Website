import React, { useState, useMemo } from 'react';
import {
  Users,
  Award,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Sliders,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { CustomRoleDefinition, DEFAULT_CUSTOM_ROLES } from '../types';

export const RoleManagerView: React.FC = () => {
  const { project, bulkSegregateRoles, updateCustomRoles } = useScheduler();

  const [activeSubTab, setActiveSubTab] = useState<'assign' | 'manage_roles'>('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);
  const [targetRoleToApply, setTargetRoleToApply] = useState<string>('assistant_prof');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Custom roles management state
  const rolesList: CustomRoleDefinition[] = useMemo(() => {
    return project.settings.customRoles && project.settings.customRoles.length > 0
      ? project.settings.customRoles
      : DEFAULT_CUSTOM_ROLES;
  }, [project.settings.customRoles]);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleTarget, setNewRoleTarget] = useState(6);
  const [newRoleMax, setNewRoleMax] = useState(6);
  const [newRoleConcession, setNewRoleConcession] = useState(0);
  const [newRolePriority, setNewRolePriority] = useState<'concession_last' | 'standard' | 'priority_first'>('standard');
  const [newRoleColor, setNewRoleColor] = useState('sky');

  // Stats calculation
  const stats = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    let withConcessions = 0;
    project.faculty.forEach((f) => {
      const r = f.role || (f.isHod ? 'HOD' : 'Regular Faculty');
      roleCounts[r] = (roleCounts[r] || 0) + 1;
      if (f.concessionOrAdditionalDuties && f.concessionOrAdditionalDuties !== 0) {
        withConcessions++;
      }
    });
    return { roleCounts, withConcessions };
  }, [project.faculty]);

  // Filtered faculty for assignment
  const filteredFaculty = useMemo(() => {
    return project.faculty.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.srNo.toString().includes(searchTerm) ||
        (f.role && f.role.toLowerCase().includes(searchTerm.toLowerCase()));
      const currentRole = f.role || (f.isHod ? 'HOD' : 'Regular Faculty');
      const matchesRole =
        selectedRoleFilter === 'all'
          ? true
          : selectedRoleFilter === 'hod'
          ? f.isHod
          : currentRole.toLowerCase().includes(selectedRoleFilter.toLowerCase());
      return matchesSearch && matchesRole;
    });
  }, [project.faculty, searchTerm, selectedRoleFilter]);

  // Handle select all filtered
  const handleSelectAll = () => {
    if (selectedSrNos.length === filteredFaculty.length) {
      setSelectedSrNos([]);
    } else {
      setSelectedSrNos(filteredFaculty.map((f) => f.srNo));
    }
  };

  const handleToggleSelectOne = (srNo: number) => {
    if (selectedSrNos.includes(srNo)) {
      setSelectedSrNos(selectedSrNos.filter((id) => id !== srNo));
    } else {
      setSelectedSrNos([...selectedSrNos, srNo]);
    }
  };

  // Apply segregated role to selected faculty members
  const handleApplyRole = () => {
    if (selectedSrNos.length === 0) {
      alert('Please select at least one faculty member to apply this role to.');
      return;
    }
    const roleDef = rolesList.find((r) => r.id === targetRoleToApply || r.name === targetRoleToApply);
    if (!roleDef) return;

    bulkSegregateRoles(
      selectedSrNos,
      roleDef.name,
      roleDef.concessionDelta,
      roleDef.defaultTarget,
      roleDef.defaultMax
    );
    const count = selectedSrNos.length;
    setSelectedSrNos([]);
    setSuccessMessage(`Successfully updated ${count} faculty member(s) to "${roleDef.name}"!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Add new custom role
  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      alert('Please enter a role name.');
      return;
    }
    const newId = newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (rolesList.some((r) => r.id === newId || r.name.toLowerCase() === newRoleName.trim().toLowerCase())) {
      alert('A role with this name already exists.');
      return;
    }

    const created: CustomRoleDefinition = {
      id: newId,
      name: newRoleName.trim(),
      defaultTarget: newRoleTarget,
      defaultMax: newRoleMax,
      concessionDelta: newRoleConcession,
      schedulingPriority: newRolePriority,
      color: newRoleColor,
    };

    updateCustomRoles([...rolesList, created]);
    setNewRoleName('');
    setNewRoleTarget(6);
    setNewRoleMax(6);
    setNewRoleConcession(0);
    setNewRolePriority('standard');
    setSuccessMessage(`Created new role "${created.name}"!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Delete custom role
  const handleDeleteRole = (id: string) => {
    if (id === 'hod' || id === 'regular') {
      alert('Cannot delete fundamental base roles (HOD or Regular).');
      return;
    }
    if (confirm('Delete this role definition? Existing faculty assigned to this role will preserve their title until re-assigned.')) {
      updateCustomRoles(rolesList.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-purple-200 border border-white/20 backdrop-blur-xs">
              <Award className="w-3.5 h-3.5 text-purple-300" />
              <span>Hierarchical Designation &amp; Concessions Control</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-2">
              Faculty Role Manager &amp; Duty Quotas
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl mt-1">
              Segregate faculty into institutional tiers (Professors, HODs, Lecturers, Visiting), define customized duty caps, concessions (fewer duties), or additional loads.
            </p>
          </div>

          {/* Quick stats pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-semibold block uppercase tracking-wider">Defined Roles</span>
              <span className="text-base font-bold">{rolesList.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-semibold block uppercase tracking-wider">Total Faculty</span>
              <span className="text-base font-bold">{project.faculty.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-semibold block uppercase tracking-wider">Concessions</span>
              <span className="text-base font-bold text-emerald-300">{stats.withConcessions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in duration-200 shadow-sm">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveSubTab('assign')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'assign'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Batch Faculty Role Assignment ({project.faculty.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manage_roles')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'manage_roles'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Role Tiers &amp; Quota Definitions ({rolesList.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: BATCH ASSIGN FACULTY */}
      {activeSubTab === 'assign' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="apple-glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 border border-slate-200/80 dark:border-white/10">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty name or Sr. No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="hod">HODs Only</option>
                {rolesList.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Assign Controls */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {selectedSrNos.length} selected &bull; Assign to:
              </span>
              <select
                value={targetRoleToApply}
                onChange={(e) => setTargetRoleToApply(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white font-bold"
              >
                {rolesList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.defaultMax} Max &bull; {r.concessionDelta < 0 ? `${r.concessionDelta} Concession` : r.concessionDelta > 0 ? `+${r.concessionDelta} Extra` : 'Standard'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyRole}
                disabled={selectedSrNos.length === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm transition cursor-pointer"
              >
                Apply Role
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="apple-glass-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-10 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-500 hover:text-sky-600 cursor-pointer"
                        title={selectedSrNos.length === filteredFaculty.length ? 'Deselect All' : 'Select All'}
                      >
                        {selectedSrNos.length > 0 && selectedSrNos.length === filteredFaculty.length ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-16">Sr. #</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Current Assigned Role</th>
                    <th className="py-3 px-3 text-center">Concession / Delta</th>
                    <th className="py-3 px-3 text-center">Target Quota</th>
                    <th className="py-3 px-3 text-center">Max Cap</th>
                    <th className="py-3 px-3">Arrival</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredFaculty.map((f) => {
                    const isSelected = selectedSrNos.includes(f.srNo);
                    const currentRole = f.role || (f.isHod ? 'HOD' : 'Regular Faculty');
                    const isHod = f.isHod;
                    const concession = f.concessionOrAdditionalDuties ?? 0;

                    return (
                      <tr
                        key={f.srNo}
                        onClick={() => handleToggleSelectOne(f.srNo)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 dark:bg-sky-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(f.srNo)}
                            className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                          #{f.srNo}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {f.name}
                          {f.department && (
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              Dept: {f.department}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHod
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : currentRole !== 'Regular Faculty'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {currentRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {concession !== 0 ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                concession < 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              {concession < 0 ? `${concession} Concession` : `+${concession} Extra`}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {f.targetSupervisions}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {f.maxSupervisions}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {f.arrival}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ROLE TIERS & DEFINITIONS */}
      {activeSubTab === 'manage_roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Defined Roles Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Configured Role Tiers &amp; Rules</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {rolesList.map((role) => {
                const assignedCount = stats.roleCounts[role.name] || 0;
                return (
                  <div
                    key={role.id}
                    className="apple-glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {role.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {assignedCount} Faculty Assigned
                        </span>
                      </div>

                      {role.id !== 'hod' && role.id !== 'regular' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-center">
                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Target</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{role.defaultTarget}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Max Cap</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{role.defaultMax}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Concession</span>
                        <span
                          className={`font-mono font-bold ${
                            role.concessionDelta < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : role.concessionDelta > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {role.concessionDelta < 0
                            ? `${role.concessionDelta}`
                            : role.concessionDelta > 0
                            ? `+${role.concessionDelta}`
                            : '0'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                      <span>Priority:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {role.schedulingPriority === 'concession_last'
                          ? 'Assigned Last (Concession)'
                          : role.schedulingPriority === 'priority_first'
                          ? 'Assigned First (High Load)'
                          : 'Standard Balance'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Custom Role Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Create New Role Tier</span>
            </h3>

            <div className="apple-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Associate Professor, Guest Lecturer"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Quota
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newRoleTarget}
                    onChange={(e) => setNewRoleTarget(parseInt(e.target.value, 10) || 6)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Allowed Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newRoleMax}
                    onChange={(e) => setNewRoleMax(parseInt(e.target.value, 10) || 6)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Concession Delta (- for fewer duties, + for extra)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    value={newRoleConcession}
                    onChange={(e) => setNewRoleConcession(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-500">
                    {newRoleConcession < 0
                      ? 'Concession (fewer duties)'
                      : newRoleConcession > 0
                      ? 'Additional workload'
                      : 'Standard quota'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Solver Assignment Priority
                </label>
                <select
                  value={newRolePriority}
                  onChange={(e) => setNewRolePriority(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-medium"
                >
                  <option value="concession_last">Assigned Last (HOD / Senior Concession)</option>
                  <option value="standard">Standard Priority (Proportional Balance)</option>
                  <option value="priority_first">Assigned First (Visiting / High Load)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleCreateRole}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-sm transition cursor-pointer mt-2"
              >
                Create Role Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
