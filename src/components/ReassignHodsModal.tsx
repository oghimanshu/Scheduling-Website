import React, { useState, useMemo } from 'react';
import {
  X,
  Award,
  Search,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const ReassignHodsModal: React.FC = () => {
  const {
    project,
    isReassignHodsModalOpen,
    setIsReassignHodsModalOpen,
    toggleFacultyHod,
    updateFacultyList,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'HODs' | 'Regular'>('All');

  if (!isReassignHodsModalOpen) return null;

  const hods = project.faculty.filter((f) => f.isHod);
  const regular = project.faculty.filter((f) => !f.isHod && !f.isExcluded);

  const filtered = project.faculty.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.srNo.toString().includes(searchTerm);
    if (!matchSearch) return false;
    if (filterMode === 'HODs') return f.isHod;
    if (filterMode === 'Regular') return !f.isHod;
    return true;
  });

  const handleUpdateMax = (srNo: number, max: number) => {
    const updated = project.faculty.map((f) =>
      f.srNo === srNo ? { ...f, maxSupervisions: max, targetSupervisions: max } : f
    );
    updateFacultyList(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-indigo-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-200/60 px-2 py-0.5 rounded">
                Department Leadership Management
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Reassign Heads of Department (HODs)
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsReassignHodsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Capacity Balance Info */}
        <div className="px-6 pt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>
                Current HODs: <strong className="text-indigo-700 font-bold">{hods.length}</strong> (Default Target: 4)
              </span>
              <span>•</span>
              <span>
                Regular: <strong className="text-sky-700 font-bold">{regular.length}</strong> (Target: 6)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Capacity: {regular.length * 6 + hods.length * 4} / 342
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="px-6 pt-4 flex gap-3 items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty name or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterMode('All')}
              className={`px-2.5 py-1 rounded transition ${filterMode === 'All' ? 'bg-white shadow-xs font-bold text-indigo-700' : 'text-slate-600'}`}
            >
              All ({project.faculty.length})
            </button>
            <button
              onClick={() => setFilterMode('HODs')}
              className={`px-2.5 py-1 rounded transition ${filterMode === 'HODs' ? 'bg-white shadow-xs font-bold text-indigo-700' : 'text-slate-600'}`}
            >
              HODs ({hods.length})
            </button>
            <button
              onClick={() => setFilterMode('Regular')}
              className={`px-2.5 py-1 rounded transition ${filterMode === 'Regular' ? 'bg-white shadow-xs font-bold text-indigo-700' : 'text-slate-600'}`}
            >
              Regular ({regular.length})
            </button>
          </div>
        </div>

        {/* Faculty List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.map((f) => {
            return (
              <div
                key={f.srNo}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                  f.isHod
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-slate-400 font-semibold text-[11px] w-8">
                    #{f.srNo}
                  </span>
                  <div>
                    <div className="font-bold flex items-center space-x-1.5">
                      <span>{f.name}</span>
                      {f.isHod && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-800 text-[10px] font-extrabold uppercase tracking-wider">
                          HOD
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Arrival: {f.arrival} • Target/Max: {f.maxSupervisions} duties
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {f.isHod && (
                    <div className="flex items-center space-x-1">
                      <span className="text-[11px] text-slate-500">Cap:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={f.maxSupervisions}
                        onChange={(e) =>
                          handleUpdateMax(f.srNo, parseInt(e.target.value, 10) || 4)
                        }
                        className="w-12 text-center text-xs font-bold border border-indigo-300 rounded px-1 py-0.5 bg-white text-indigo-900"
                        title="Configurable individual HOD maximum"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => toggleFacultyHod(f.srNo)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      f.isHod
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                    }`}
                  >
                    {f.isHod ? 'Revoke HOD' : 'Designate HOD'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs">
          <span className="text-slate-500">
            HOD workloads default to 4 duties (configurable per individual).
          </span>
          <button
            onClick={() => setIsReassignHodsModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
