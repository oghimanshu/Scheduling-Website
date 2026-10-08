import React, { useState, useMemo } from 'react';
import {
  Building,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Sparkles,
  Users,
  Layers,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Filter,
  Copy,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { ExamRoom } from '../types';
import { parseRoomsCSV, downloadRoomsTemplateCSV } from '../services/roomParser';
import { FileDropZone } from './FileDropZone';
import { useContextMenu } from '../hooks/useContextMenu';
import {
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuDivider,
  ContextMenuHeader,
} from './ContextMenuPopup';

export const RoomManager: React.FC = () => {
  const {
    project,
    addRoom,
    updateRoom,
    deleteRoom,
    toggleRoomActive,
    updateRoomsList,
    assignRoomsSeparately,
    setIsRoomChartModalOpen,
  } = useScheduler();

  const roomContextMenu = useContextMenu<ExamRoom>();

  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form state for adding/editing room
  const [formData, setFormData] = useState<Partial<ExamRoom>>({
    name: '',
    block: '',
    floor: '',
    capacity: 30,
    invigilatorsRequired: 1,
    isActive: true,
  });

  const rooms = project.rooms || [];

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter((r) => r.isActive !== false);
    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const activeCapacity = activeRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const totalInvigilatorsRequired = activeRooms.reduce((sum, r) => sum + (r.invigilatorsRequired || 1), 0);
    const distinctBlocks = Array.from(new Set(rooms.map((r) => r.block || 'Main Campus')));

    return {
      totalRooms,
      activeRoomsCount: activeRooms.length,
      totalCapacity,
      activeCapacity,
      totalInvigilatorsRequired,
      distinctBlocks,
    };
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.block || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.floor && room.floor.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesBlock = blockFilter === 'All' || room.block === blockFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && room.isActive !== false) ||
        (statusFilter === 'Inactive' && room.isActive === false);

      return matchesSearch && matchesBlock && matchesStatus;
    });
  }, [rooms, searchTerm, blockFilter, statusFilter]);

  // Open modal to add a new room
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      block: 'Academic Block A',
      floor: '1st Floor',
      capacity: 32,
      invigilatorsRequired: 1,
      isActive: true,
    });
    setEditingRoom(null);
    setIsAddModalOpen(true);
  };

  // Open modal to edit an existing room
  const handleOpenEditModal = (room: ExamRoom) => {
    setEditingRoom(room);
    setFormData({ ...room });
    setIsAddModalOpen(true);
  };

  // Save room (add or update)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (editingRoom) {
      updateRoom({
        ...editingRoom,
        name: formData.name.trim(),
        block: formData.block?.trim() || 'Academic Block',
        floor: formData.floor?.trim() || undefined,
        capacity: Number(formData.capacity) || 30,
        invigilatorsRequired: Number(formData.invigilatorsRequired) || 1,
        isActive: formData.isActive !== false,
      });
      setNotification({ message: `Updated hall "${formData.name.trim()}".`, type: 'success' });
    } else {
      const newRoom: ExamRoom = {
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: formData.name.trim(),
        block: formData.block?.trim() || 'Academic Block',
        floor: formData.floor?.trim() || undefined,
        capacity: Number(formData.capacity) || 30,
        invigilatorsRequired: Number(formData.invigilatorsRequired) || 1,
        isActive: formData.isActive !== false,
      };
      addRoom(newRoom);
      setNotification({ message: `Added hall "${newRoom.name}".`, type: 'success' });
    }

    setIsAddModalOpen(false);
    setEditingRoom(null);
  };

  // Duplicate an existing room
  const handleDuplicateRoom = (sourceRoom: ExamRoom) => {
    const newRoom: ExamRoom = {
      ...sourceRoom,
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${sourceRoom.name} (Copy)`,
    };
    addRoom(newRoom);
    setNotification({ message: `Duplicated hall "${newRoom.name}".`, type: 'success' });
  };

  // Handle CSV text upload
  const handleCSVUpload = (text: string) => {
    if (!text) return;
    const res = parseRoomsCSV(text);
    if (res.success && res.rooms.length > 0) {
      updateRoomsList(res.rooms);
      setNotification({
        message: `Successfully imported ${res.rooms.length} examination halls from CSV.`,
        type: 'success',
      });
    } else {
      setNotification({
        message: res.errors.join(' | ') || 'Failed to parse room CSV.',
        type: 'error',
      });
    }
  };

  const handleAutoAssign = () => {
    assignRoomsSeparately();
    setNotification({
      message: 'Active rooms have been allocated across all scheduled duty sessions.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Rooms & Examination Halls</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configure examination blocks, seating capacities, and invigilator requirements for room allocation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={downloadRoomsTemplateCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-xs"
            title="Download CSV roster format for rooms"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Template
          </button>

          <button
            onClick={handleAutoAssign}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-xs"
            title="Distribute active rooms across existing duty schedule without altering faculty pairs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Auto-Assign Rooms
          </button>

          <button
            onClick={() => setIsRoomChartModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-xs"
            title="Open printable Noticeboard Room-wise Invigilation Chart"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Noticeboard Chart
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Room / Hall
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Exam Halls</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.totalRooms}</span>
            <span className="text-xs text-slate-500">halls</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Configured in roster</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Seating</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.activeCapacity}</span>
            <span className="text-xs text-slate-500">/ {metrics.totalCapacity} seats</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{metrics.activeRoomsCount} active examination halls</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Staff Demand / Session</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">{metrics.totalInvigilatorsRequired}</span>
            <span className="text-xs text-slate-500">invigilators</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Sum of hall requirements</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Campus Blocks</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{metrics.distinctBlocks.length}</span>
            <span className="text-xs text-slate-500">buildings</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{metrics.distinctBlocks.slice(0, 2).join(', ')}{metrics.distinctBlocks.length > 2 ? '...' : ''}</p>
        </div>
      </div>

      {/* Drag & Drop CSV Import Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Import Rooms & Halls via CSV
        </h2>
        <FileDropZone
          onFileLoaded={(text) => handleCSVUpload(text)}
          accept=".csv"
          title="Drag & Drop Exam Halls CSV Here"
          description="or click to browse from your device"
          supportedFormatsText="Expected columns: Room Number/Name, Building/Block, Floor, Seating Capacity, Invigilators Required, Active."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by hall name, block, or floor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Block Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Blocks ({rooms.length})</option>
              {metrics.distinctBlocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {(['All', 'Active', 'Inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Room / Hall</th>
                <th className="py-3.5 px-4 font-semibold">Building & Floor</th>
                <th className="py-3.5 px-4 font-semibold text-center">Seating Capacity</th>
                <th className="py-3.5 px-4 font-semibold text-center">Invigilators Required</th>
                <th className="py-3.5 px-4 font-semibold text-center">Active Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">No exam halls match the selected filter.</p>
                    <p className="text-xs mt-1">Try resetting your search query or add a new exam hall.</p>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const isActive = room.isActive !== false;
                  return (
                    <tr
                      key={room.id}
                      {...roomContextMenu.bindItem(room)}
                      onDoubleClick={() => handleOpenEditModal(room)}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        !isActive ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/30' : ''
                      }`}
                      title="Double-click to edit, or right-click for options"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg font-bold text-xs ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            <Building className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">{room.name}</span>
                            <span className="text-[11px] text-slate-400">ID: {room.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">{room.block}</span>
                        <span className="text-[11px] text-slate-400">{room.floor || 'Standard Floor'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          {room.capacity} seats
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          {room.invigilatorsRequired || 1} staff
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleRoomActive(room.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(room)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Edit Exam Hall"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRoom(room.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Exam Hall"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {editingRoom ? 'Edit Examination Hall' : 'Add Examination Hall'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hall Name / Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hall 101 or Lecture Theatre 1"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Building / Block
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Academic Block A"
                    value={formData.block || ''}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Floor Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor"
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Candidate Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity || 30}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Invigilators Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.invigilatorsRequired || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, invigilatorsRequired: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  Mark as Active Examination Hall for Scheduling
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingRoom ? 'Save Changes' : 'Add Hall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Context Menu */}
      <ContextMenuPopup
        isOpen={roomContextMenu.isOpen}
        position={roomContextMenu.position}
        onClose={roomContextMenu.closeMenu}
      >
        {roomContextMenu.data && (
          <>
            <ContextMenuHeader
              title={roomContextMenu.data.name}
              subtitle={`${roomContextMenu.data.block} • ${roomContextMenu.data.capacity} seats`}
            />
            <ContextMenuItem
              icon={<Edit2 className="w-3.5 h-3.5 text-sky-500" />}
              label="Edit Hall Details"
              shortcut="Double-click"
              onClick={() => {
                if (roomContextMenu.data) {
                  handleOpenEditModal(roomContextMenu.data);
                }
              }}
            />
            <ContextMenuItem
              icon={
                roomContextMenu.data.isActive !== false ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )
              }
              label={
                roomContextMenu.data.isActive !== false
                  ? 'Mark as Inactive'
                  : 'Mark as Active Hall'
              }
              onClick={() => {
                if (roomContextMenu.data) {
                  toggleRoomActive(roomContextMenu.data.id);
                }
              }}
            />
            <ContextMenuItem
              icon={<Copy className="w-3.5 h-3.5 text-purple-500" />}
              label="Duplicate Hall"
              onClick={() => {
                if (roomContextMenu.data) {
                  handleDuplicateRoom(roomContextMenu.data);
                }
              }}
            />
            <ContextMenuDivider />
            <ContextMenuItem
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              label="Delete Exam Hall"
              variant="danger"
              onClick={() => {
                if (roomContextMenu.data) {
                  if (confirm(`Are you sure you want to delete room "${roomContextMenu.data.name}"?`)) {
                    deleteRoom(roomContextMenu.data.id);
                    setNotification({ message: `Deleted hall "${roomContextMenu.data.name}".`, type: 'info' });
                  }
                }
              }}
            />
          </>
        )}
      </ContextMenuPopup>
    </div>
  );
};
