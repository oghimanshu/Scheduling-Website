import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';


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
  Pencil,
  X,
  GripVertical,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { CustomRoleDefinition, DEFAULT_CUSTOM_ROLES } from '../types';
import { useScrollIsolation } from '../hooks/useScrollIsolation';

export const RoleManagerView: React.FC = () => {
  const { project, bulkSegregateRoles, updateCustomRoles, updateFacultyList } = useScheduler();

  // Scroll isolation for the faculty table (pointer-aware Lenis bypass)
  const tableScrollRef = useRef<HTMLDivElement>(null);
  useScrollIsolation(tableScrollRef);

  const [activeSubTab, setActiveSubTab] = useState<'assign' | 'manage_roles'>('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);
  const [targetRoleToApply, setTargetRoleToApply] = useState<string>('assistant_prof');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Drag-and-drop state for Role assignment
  const [draggedFacultySrNos, setDraggedFacultySrNos] = useState<number[] | null>(null);
  const [dragOverRoleId, setDragOverRoleId] = useState<string | null>(null);

  const handleDropOnRole = (roleId: string, roleName: string) => {
    if (!draggedFacultySrNos || draggedFacultySrNos.length === 0) return;
    bulkSegregateRoles(draggedFacultySrNos, roleId);
    setSuccessMessage(`Assigned ${draggedFacultySrNos.length} faculty member(s) to "${roleName}"!`);
    setDraggedFacultySrNos(null);
    setDragOverRoleId(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Edit existing role state
  const [editingRole, setEditingRole] = useState<CustomRoleDefinition | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleTarget, setEditRoleTarget] = useState(6);
  const [editRoleMax, setEditRoleMax] = useState(6);
  const [editRoleConcession, setEditRoleConcession] = useState(0);
  const [editRolePriority, setEditRolePriority] = useState<'concession_last' | 'standard' | 'priority_first'>('standard');
  const [editRoleColor, setEditRoleColor] = useState('sky');
  const [editSyncToFaculty, setEditSyncToFaculty] = useState(true);

  // Escape key listener to close edit modal
  useEffect(() => {
    if (!isEditModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEditModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen]);

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

  // Launch edit role dialog
  const handleStartEditRole = (role: CustomRoleDefinition) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleTarget(role.defaultTarget);
    setEditRoleMax(role.defaultMax);
    setEditRoleConcession(role.concessionDelta);
    setEditRolePriority(role.schedulingPriority);
    setEditRoleColor(role.color || 'sky');
    setEditSyncToFaculty(true);
    setIsEditModalOpen(true);
  };

  // Save edited role and cascade updates
  const handleSaveRoleEdit = () => {
    if (!editingRole) return;
    if (!editRoleName.trim()) {
      alert('Please enter a role name.');
      return;
    }

    const updatedRole: CustomRoleDefinition = {
      ...editingRole,
      name: editRoleName.trim(),
      defaultTarget: Math.max(1, editRoleTarget),
      defaultMax: Math.max(1, editRoleMax),
      concessionDelta: editRoleConcession,
      schedulingPriority: editRolePriority,
      color: editRoleColor,
    };

    // Update settings custom roles
    const updatedRolesList = rolesList.map((r) => (r.id === editingRole.id ? updatedRole : r));
    updateCustomRoles(updatedRolesList);

    // If requested, synchronize the updated quotas to all faculty holding this role
    if (editSyncToFaculty) {
      const updatedFaculty = project.faculty.map((f) => {
        const matchesRole =
          f.role === editingRole.id ||
          f.role === editingRole.name ||
          (editingRole.id === 'hod' && f.isHod) ||
          (editingRole.id === 'regular' && !f.isHod && (!f.role || f.role === 'regular'));

        if (matchesRole) {
          return {
            ...f,
            role: updatedRole.name,
            targetSupervisions: updatedRole.defaultTarget,
            maxSupervisions: updatedRole.defaultMax,
            concessionOrAdditionalDuties: updatedRole.concessionDelta,
          };
        }
        return f;
      });
      updateFacultyList(updatedFaculty);
    }

    setIsEditModalOpen(false);
    setEditingRole(null);
    setSuccessMessage(`Successfully updated role tier "${updatedRole.name}"!`);
    setTimeout(() => setSuccessMessage(null), 4000);
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
              <span className="text-base font-bold font-mono tabular-nums">{rolesList.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-semibold block uppercase tracking-wider">Total Faculty</span>
              <span className="text-base font-bold font-mono tabular-nums">{project.faculty.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-purple-200 font-semibold block uppercase tracking-wider">Concessions</span>
              <span className="text-base font-bold text-emerald-300 font-mono tabular-nums">{stats.withConcessions}</span>
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
          className={`btn-spring flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
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
          className={`btn-spring flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
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
            <div className="apple-specular-rim" />
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
                className="btn-spring px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm cursor-pointer"
              >
                Apply Role
              </button>
            </div>
          </div>

          {/* Drag & Drop Quick-Assign Role Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Drag &amp; Drop Role Target Bar:</span>
              </span>
              <span className="text-[11px]">
                {draggedFacultySrNos
                  ? `Dragging ${draggedFacultySrNos.length} member(s), drop on any role below!`
                  : 'Drag any table row or selected group and drop onto a role card to instantly assign'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {rolesList.map((r) => {
                const isDragOver = dragOverRoleId === r.id;
                const isTarget = targetRoleToApply === r.id;
                return (
                  <div
                    key={r.id}
                    onDragOver={(e) => {
                      if (draggedFacultySrNos) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        if (dragOverRoleId !== r.id) setDragOverRoleId(r.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverRoleId === r.id) setDragOverRoleId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnRole(r.id, r.name);
                    }}
                    onClick={() => {
                      if (selectedSrNos.length > 0) {
                        bulkSegregateRoles(selectedSrNos, r.id);
                        setSuccessMessage(`Assigned ${selectedSrNos.length} faculty member(s) to "${r.name}"!`);
                        setTimeout(() => setSuccessMessage(null), 4000);
                      } else {
                        setTargetRoleToApply(r.id);
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isDragOver
                        ? 'border-purple-500 ring-3 ring-purple-500/30 bg-purple-500/20 scale-[1.03] shadow-lg animate-pulse'
                        : isTarget
                        ? 'border-sky-400 dark:border-sky-500/50 bg-sky-50/80 dark:bg-sky-950/40 shadow-xs'
                        : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-purple-300 dark:hover:border-purple-500/40 hover:bg-purple-50/30'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate" title={r.name}>
                        {r.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Max: {r.defaultMax} &bull; {r.concessionDelta < 0 ? `${r.concessionDelta}` : r.concessionDelta > 0 ? `+${r.concessionDelta}` : '0'}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 pt-1 block">
                      {isDragOver ? 'Drop Here' : 'Drop or Click'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Faculty Table */}
          <div className="apple-glass-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm">
            <div ref={tableScrollRef} className="overflow-x-auto overflow-y-auto max-h-[60vh]">

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
                        draggable
                        onDragStart={(e) => {
                          const toDrag = selectedSrNos.includes(f.srNo) && selectedSrNos.length > 0 ? selectedSrNos : [f.srNo];
                          setDraggedFacultySrNos(toDrag);
                          e.dataTransfer.setData('text/plain', JSON.stringify(toDrag));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDragEnd={() => {
                          setDraggedFacultySrNos(null);
                          setDragOverRoleId(null);
                        }}
                        onClick={() => handleToggleSelectOne(f.srNo)}
                        className={`transition cursor-grab active:cursor-grabbing select-none ${
                          isSelected
                            ? 'bg-sky-500/10 dark:bg-sky-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        } ${
                          draggedFacultySrNos?.includes(f.srNo) ? 'opacity-40' : ''
                        }`}
                        title="Drag this faculty member to any role card above to assign"
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1">
                            <GripVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(f.srNo)}
                              className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
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
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold ${
                                concession < 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              {concession < 0 ? `${concession} Concession` : `+${concession} Extra`}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono tabular-nums text-[10px]">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
                          {f.targetSupervisions}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
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
                    onDragOver={(e) => {
                      if (draggedFacultySrNos) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        if (dragOverRoleId !== role.id) setDragOverRoleId(role.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverRoleId === role.id) setDragOverRoleId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnRole(role.id, role.name);
                    }}
                    className={`apple-glass-card p-4 rounded-2xl border transition-all ${
                      dragOverRoleId === role.id
                        ? 'border-purple-500 ring-4 ring-purple-500/30 bg-purple-500/20 scale-[1.02] shadow-lg'
                        : 'border-slate-200/80 dark:border-white/10'
                    } space-y-3 relative overflow-hidden`}
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

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditRole(role)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Edit Role Tier & Rules"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {role.id !== 'hod' && role.id !== 'regular' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

      {/* Edit Role Tier & Rules Modal */}
      {isEditModalOpen && editingRole && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent onClick={() => setIsEditModalOpen(false)}>
          <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring my-0 sm:my-auto" onClick={(e) => e.stopPropagation()}>

            <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-1 shrink-0" />
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Edit Role Tier &amp; Rules</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      {editingRole.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modify target quotas, maximum allowed supervision caps, and concession policies.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Role Title / Designation
                </label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Quota (Standard Load)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={editRoleTarget}
                    onChange={(e) => setEditRoleTarget(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Maximum Allowed Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={editRoleMax}
                    onChange={(e) => setEditRoleMax(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Concession Delta (- for fewer duties, + for extra duties)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    value={editRoleConcession}
                    onChange={(e) => setEditRoleConcession(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-500">
                    {editRoleConcession < 0
                      ? `${Math.abs(editRoleConcession)} duties concession (reduced duties)`
                      : editRoleConcession > 0
                      ? `+${editRoleConcession} additional duties (extra load)`
                      : 'Standard quota (0)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Solver Assignment Priority
                </label>
                <select
                  value={editRolePriority}
                  onChange={(e) => setEditRolePriority(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl font-medium"
                >
                  <option value="concession_last">Assigned Last (HOD / Senior Concession)</option>
                  <option value="standard">Standard Priority (Proportional Balance)</option>
                  <option value="priority_first">Assigned First (Visiting / High Load)</option>
                </select>
              </div>

              {/* Cascade sync option */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                <label className="flex items-start space-x-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={editSyncToFaculty}
                    onChange={(e) => setEditSyncToFaculty(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold block">
                      Sync updated quotas to all assigned faculty members ({stats.roleCounts[editingRole.name] || 0} Faculty)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Instantly updates target supervisions, max caps, and concessions for all faculty currently designated under this role tier.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoleEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-500/25 transition cursor-pointer"
              >
                Save Role Changes
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
