import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  ShieldAlert,
  Award,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { CustomRoleDefinition, DEFAULT_CUSTOM_ROLES } from '../types';

export const RoleSegregationModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isRoleSegregationModalOpen,
    setIsRoleSegregationModalOpen,
    updateFacultyRole,
    bulkSegregateRoles,
    updateCustomRoles,
  } = useScheduler();

  const [activeSubTab, setActiveSubTab] = useState<'assign' | 'manage_roles'>('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);
  const [targetRoleToApply, setTargetRoleToApply] = useState<string>('assistant_prof');

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

  if (!forceOpen && !isRoleSegregationModalOpen) return null;

  // Filtered faculty for assignment
  const filteredFaculty = project.faculty.filter((f) => {
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

  // Handle select all filtered
  const handleSelectAll = () => {
    if (selectedSrNos.length === filteredFaculty.length) {
      setSelectedSrNos([]);
    } else {
      setSelectedSrNos(filteredFaculty.map((f) => f.srNo));
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
    setSelectedSrNos([]);
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

    const updated = [
      ...rolesList,
      {
        id: newId,
        name: newRoleName.trim(),
        defaultTarget: newRoleTarget,
        defaultMax: newRoleMax,
        concessionDelta: newRoleConcession,
        schedulingPriority: newRolePriority,
        color: newRoleConcession < 0 ? 'purple' : newRoleConcession > 0 ? 'amber' : 'emerald',
      },
    ];
    updateCustomRoles(updated);
    setNewRoleName('');
  };

  // Delete custom role
  const handleDeleteRole = (roleId: string) => {
    if (roleId === 'hod' || roleId === 'regular') {
      alert('Default HOD and Regular roles cannot be deleted.');
      return;
    }
    const updated = rolesList.filter((r) => r.id !== roleId);
    updateCustomRoles(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden my-auto animate-modal-spring">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty Role Segregation &amp; Workload Concessions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Segregate faculty into custom roles (Professors, Assistants, Lecturers, Visiting) with differentiated duty caps and scheduling concessions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRoleSegregationModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="px-5 sm:px-6 pt-3 flex items-center space-x-2 border-b border-slate-200/60 dark:border-white/10">
          <button
            onClick={() => setActiveSubTab('assign')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeSubTab === 'assign'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Assign Roles to Faculty ({project.faculty.length})
          </button>
          <button
            onClick={() => setActiveSubTab('manage_roles')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeSubTab === 'manage_roles'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Manage Role Definitions &amp; Concessions ({rolesList.length})
          </button>
        </div>

        {/* Content Body */}
        {activeSubTab === 'assign' ? (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* Bulk Action Bar */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSrNos.length} of {filteredFaculty.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  {selectedSrNos.length === filteredFaculty.length ? 'Deselect All' : 'Select All Filtered'}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Set Role:</span>
                <select
                  value={targetRoleToApply}
                  onChange={(e) => setTargetRoleToApply(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Cap: {r.defaultMax}{r.concessionDelta !== 0 ? `, Concession: ${r.concessionDelta > 0 ? '+' : ''}${r.concessionDelta}` : ''})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyRole}
                  disabled={selectedSrNos.length === 0}
                  className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-xs"
                >
                  Apply Role
                </button>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty name or Sr No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="text-xs bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="all">All Roles</option>
                  <option value="hod">HODs</option>
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Faculty Table with Selection */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSrNos.length > 0 && selectedSrNos.length === filteredFaculty.length}
                        onChange={handleSelectAll}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Sr. No.</th>
                    <th className="py-2.5 px-3">Faculty Name</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3 text-center">Target Cap</th>
                    <th className="py-2.5 px-3 text-center">Concession / Additional</th>
                    <th className="py-2.5 px-3 text-right">Quick Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredFaculty.map((f) => {
                    const isSelected = selectedSrNos.includes(f.srNo);
                    const currentRole = f.role || (f.isHod ? 'HOD' : 'Regular Faculty');
                    const concession = f.concessionOrAdditionalDuties || 0;

                    return (
                      <tr
                        key={f.srNo}
                        className={`transition ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50/50 dark:hover:bg-white/5'}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSrNos([...selectedSrNos, f.srNo]);
                              } else {
                                setSelectedSrNos(selectedSrNos.filter((id) => id !== f.srNo));
                              }
                            }}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{f.srNo}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{f.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                            {currentRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {f.maxSupervisions}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {concession !== 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${concession < 0 ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                              {concession > 0 ? `+${concession} Extra` : `${concession} Concession`}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <select
                            value={rolesList.find((r) => r.name.toLowerCase() === currentRole.toLowerCase())?.id || (f.isHod ? 'hod' : 'regular')}
                            onChange={(e) => {
                              const rDef = rolesList.find((r) => r.id === e.target.value);
                              if (rDef) {
                                updateFacultyRole(f.srNo, rDef.name, rDef.concessionDelta, rDef.defaultTarget, rDef.defaultMax);
                              }
                            }}
                            className="px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300"
                          >
                            {rolesList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Manage Roles Tab */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Create Role Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create New Custom Role Tier</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Associate Professor, Guest Lecturer"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Target / Max Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newRoleMax}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 6;
                      setNewRoleMax(v);
                      setNewRoleTarget(v);
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Duty Concession Delta
                  </label>
                  <select
                    value={newRoleConcession}
                    onChange={(e) => {
                      const c = parseInt(e.target.value, 10);
                      setNewRoleConcession(c);
                      setNewRolePriority(c < 0 ? 'concession_last' : c > 0 ? 'priority_first' : 'standard');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="-3">-3 (High Senior Concession)</option>
                    <option value="-2">-2 (HOD / Senior Concession)</option>
                    <option value="-1">-1 (Minor Concession)</option>
                    <option value="0">0 (Standard Load)</option>
                    <option value="1">+1 (Additional Load)</option>
                    <option value="2">+2 (High Additional Load)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCreateRole}
                  className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Add Custom Role
                </button>
              </div>
            </div>

            {/* List of Configured Roles */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white">Active Role Tiers ({rolesList.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rolesList.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{r.name}</span>
                        {r.concessionDelta < 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            Concession ({r.concessionDelta})
                          </span>
                        )}
                        {r.concessionDelta > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            +{r.concessionDelta} Additional
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Target Duties: <strong className="text-slate-700 dark:text-slate-200">{r.defaultMax}</strong> &bull; Priority: {r.schedulingPriority.replace('_', ' ')}
                      </div>
                    </div>

                    {r.id !== 'hod' && r.id !== 'regular' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(r.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                        title="Delete Role Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex justify-end bg-slate-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setIsRoleSegregationModalOpen(false)}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
