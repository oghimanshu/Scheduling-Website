import React, { useState, useMemo, useEffect, useRef } from 'react';

import {
  FileSpreadsheet,
  Calendar,
  BarChart3,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Info,
  Sparkles,
  Users,
  Shield,
  ArrowRightLeft,
  Scale,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  CheckCircle2,
  Printer,
  Building2,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SessionType, Assignment, Faculty, ExamDateConfig } from '../types';
import { isFacultyEligibleForSession, isFacultyAvailableForSlot } from '../services/validation/validator';
import { setPrintOrientation, clearPrintOrientation } from '../utils/printHelper';
import { WorkloadAnalytics } from './WorkloadAnalytics';
import { DragDropCollisionModal } from './DragDropCollisionModal';
import { DragDropOverrideModal } from './DragDropOverrideModal';
import { ScheduleContextMenu, ContextMenuTarget } from './ScheduleContextMenu';
import { SwapFacultyModal } from './SwapFacultyModal';
import { useScrollIsolation } from '../hooks/useScrollIsolation';


export const ScheduleViewer: React.FC = () => {
  const {
    project,
    scheduleViewMode,
    setScheduleViewMode,
    toggleLockAssignment,
    setSelectedAssignmentForInspect,
    setManualEditSlot,
    validation,
    setSelectedForSubstitute,
    setIsSubstituteModalOpen,
    selectAlternative,
    setIsAlternativesModalOpen,
    atomicTransferOrSwapDuty,
    removeAssignment,
    addOrUpdateAssignment,
    setSlotAvailability,
    setIsDutySlipsModalOpen,
    setIsLetterheadModalOpen,
    setIsPrintScheduleModalOpen,
  } = useScheduler();

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'All' | SessionType>('All');
  const [onlyDoubleAssignments, setOnlyDoubleAssignments] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Drag & Drop State
  const [draggedDuty, setDraggedDuty] = useState<{ assignment: Assignment; faculty: Faculty } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ facultySrNo: number; date: string } | null>(null);

  // Mobile Tap-to-Transfer State
  const [mobileSelectedDuty, setMobileSelectedDuty] = useState<{ assignment: Assignment; faculty: Faculty } | null>(null);

  // Collision Modal State
  const [collisionModalData, setCollisionModalData] = useState<{
    sourceAssignment: Assignment;
    sourceFaculty: Faculty;
    targetFaculty: Faculty;
    targetAssignment: Assignment;
    dateDisplay: string;
  } | null>(null);

  // Override Modal State
  const [overrideModalData, setOverrideModalData] = useState<{
    sourceAssignment: Assignment;
    sourceFaculty: Faculty;
    targetFaculty: Faculty;
    conflictReasons: string[];
    dateDisplay: string;
    pendingAction: 'replace' | 'swap';
  } | null>(null);

  // Action Toast
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Right-Click Context Menu & Swap Modal State
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [swapModalData, setSwapModalData] = useState<{ assignment: Assignment; faculty: Faculty } | null>(null);

  const activeDates = useMemo(
    () => project.examPeriod.dates.filter((d) => !d.isExcluded),
    [project.examPeriod.dates]
  );

  const facultyMap = useMemo(
    () => new Map(project.faculty.map((f) => [f.srNo, f])),
    [project.faculty]
  );

  // Group assignments by faculty and date
  const assignmentsByFacultyDate = useMemo(() => {
    const map = new Map<number, Map<string, Assignment[]>>();
    project.faculty.forEach((f) => map.set(f.srNo, new Map()));

    project.assignments.forEach((a) => {
      const fMap = map.get(a.facultySrNo);
      if (fMap) {
        const list = fMap.get(a.date) || [];
        list.push(a);
        fMap.set(a.date, list);
      }
    });

    return map;
  }, [project.faculty, project.assignments]);

  // Filtered faculty for Faculty View & Workload View
  const filteredFaculty = useMemo(() => {
    return project.faculty.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.srNo.toString().includes(searchTerm);

      if (!matchSearch) return false;

      if (onlyDoubleAssignments) {
        const fMap = assignmentsByFacultyDate.get(f.srNo);
        let hasDouble = false;
        if (fMap) {
          fMap.forEach((assignments) => {
            if (assignments.length >= 2) hasDouble = true;
          });
        }
        if (!hasDouble) return false;
      }

      return true;
    });
  }, [project.faculty, searchTerm, onlyDoubleAssignments, assignmentsByFacultyDate]);

  // Active alternative index
  const currentAltIndex = useMemo(() => {
    if (!project.alternatives || project.alternatives.length === 0) return -1;
    const idx = project.alternatives.findIndex((a) => a.id === project.activeScheduleId);
    return idx !== -1 ? idx : 0;
  }, [project.alternatives, project.activeScheduleId]);

  // Check conflicts for drag-and-drop target
  const checkDropConflicts = (targetFaculty: Faculty, sourceAssignment: Assignment, dateConfig: ExamDateConfig) => {
    const reasons: string[] = [];

    // 1. Availability check (including date exclusion, slot micro-exclusions, and allowedSessions)
    const isAvail = isFacultyAvailableForSlot(
      targetFaculty,
      sourceAssignment.date,
      sourceAssignment.session,
      project.availability
    );
    if (!isAvail) {
      if (targetFaculty.allowedSessions && targetFaculty.allowedSessions.length > 0 && !targetFaculty.allowedSessions.includes(sourceAssignment.session)) {
        reasons.push(`Session restricted to ${targetFaculty.allowedSessions.join(', ')}`);
      } else {
        reasons.push(`Marked unavailable for ${sourceAssignment.session} on ${dateConfig.displayDate}`);
      }
    }

    // 2. Arrival policy check
    const isEligibleArrival = isFacultyEligibleForSession(
      targetFaculty.arrival,
      sourceAssignment.session,
      project.sessions,
      dateConfig
    );
    if (!isEligibleArrival) {
      reasons.push(`Ineligible arrival category (${targetFaculty.arrival}) for ${sourceAssignment.session}`);
    }

    // 3. Max supervision limit check
    const existingDutiesCount = project.assignments.filter(
      (a) => Number(a.facultySrNo) === Number(targetFaculty.srNo) && a.id !== sourceAssignment.id
    ).length;
    const totalProjected = existingDutiesCount + (targetFaculty.previousSupervisions || 0) + 1;
    if (totalProjected > targetFaculty.maxSupervisions) {
      reasons.push(`Exceeds maximum workload cap (${totalProjected}/${targetFaculty.maxSupervisions})`);
    }

    // 4. Daily duty limit check (more than 2 duties on same date)
    const dutiesOnDate = project.assignments.filter(
      (a) => Number(a.facultySrNo) === Number(targetFaculty.srNo) && a.date === sourceAssignment.date && a.id !== sourceAssignment.id
    );
    if (dutiesOnDate.length >= 2) {
      reasons.push('Already assigned to 2 duties on this date (daily limit reached)');
    }

    return reasons;
  };

  // Initiate duty transfer from source faculty to target faculty
  const initiateDutyTransfer = (
    sourceAssignment: Assignment,
    sourceFaculty: Faculty,
    targetFaculty: Faculty,
    targetDate: string
  ) => {
    if (sourceAssignment.date !== targetDate) {
      setActionToast('Transfers must be on the same date.');
      setTimeout(() => setActionToast(null), 2500);
      return;
    }

    if (sourceFaculty.srNo === targetFaculty.srNo) {
      return; // Same faculty, no-op
    }

    const dateConfig = project.examPeriod.dates.find((d) => d.date === targetDate);
    const dateDisplay = dateConfig?.displayDate || targetDate;

    // Check if target faculty already has an assignment in that same session
    const targetExistingDuty = project.assignments.find(
      (a) =>
        Number(a.facultySrNo) === Number(targetFaculty.srNo) &&
        a.date === targetDate &&
        a.session === sourceAssignment.session &&
        a.id !== sourceAssignment.id
    );

    if (targetExistingDuty) {
      // Collision detected -> Open collision modal
      setCollisionModalData({
        sourceAssignment,
        sourceFaculty,
        targetFaculty,
        targetAssignment: targetExistingDuty,
        dateDisplay,
      });
      return;
    }

    // Check for eligibility/availability/cap conflicts
    if (dateConfig) {
      const conflicts = checkDropConflicts(targetFaculty, sourceAssignment, dateConfig);
      if (conflicts.length > 0) {
        setOverrideModalData({
          sourceAssignment,
          sourceFaculty,
          targetFaculty,
          conflictReasons: conflicts,
          dateDisplay,
          pendingAction: 'replace',
        });
        return;
      }
    }

    // Clean transfer with no conflict or collision
    const res = atomicTransferOrSwapDuty(sourceAssignment.id, targetFaculty.srNo, 'replace');
    if (res.success) {
      setActionToast(`Transferred ${sourceAssignment.session} from ${sourceFaculty.name} to ${targetFaculty.name}`);
    } else {
      setActionToast(res.error || 'Duty transfer failed');
    }
    setTimeout(() => setActionToast(null), 3000);
  };

  // Resolve collision (swap vs replace)
  const handleCollisionResolve = (action: 'swap' | 'replace') => {
    if (!collisionModalData) return;
    const { sourceAssignment, sourceFaculty, targetFaculty, dateDisplay } = collisionModalData;
    setCollisionModalData(null);

    const dateConfig = project.examPeriod.dates.find((d) => d.date === sourceAssignment.date);
    if (dateConfig) {
      const conflicts = checkDropConflicts(targetFaculty, sourceAssignment, dateConfig);
      if (conflicts.length > 0) {
        setOverrideModalData({
          sourceAssignment,
          sourceFaculty,
          targetFaculty,
          conflictReasons: conflicts,
          dateDisplay,
          pendingAction: action,
        });
        return;
      }
    }

    const res = atomicTransferOrSwapDuty(sourceAssignment.id, targetFaculty.srNo, action);
    if (res.success) {
      const verb = action === 'swap' ? 'Swapped duties between' : 'Replaced duty from';
      setActionToast(`${verb} ${sourceFaculty.name} and ${targetFaculty.name}`);
    } else {
      setActionToast(res.error || 'Duty transfer failed');
    }
    setTimeout(() => setActionToast(null), 3000);
  };

  // Confirm administrator override
  const handleOverrideConfirm = (reason: string, lockAfter: boolean) => {
    if (!overrideModalData) return;
    const { sourceAssignment, sourceFaculty, targetFaculty, pendingAction } = overrideModalData;
    setOverrideModalData(null);

    const res = atomicTransferOrSwapDuty(
      sourceAssignment.id,
      targetFaculty.srNo,
      pendingAction,
      true,
      reason,
      lockAfter
    );

    if (res.success) {
      setActionToast(`Authorized override transfer of ${sourceAssignment.session} to ${targetFaculty.name}`);
    } else {
      setActionToast(res.error || 'Override transfer failed');
    }
    setTimeout(() => setActionToast(null), 3500);
  };

  // Intercept Ctrl+P / Cmd+P to open the Master Schedule Print Customizer
  useEffect(() => {
    const handlePrintShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPrintScheduleModalOpen(true);
      }
    };
    window.addEventListener('keydown', handlePrintShortcut);
    return () => window.removeEventListener('keydown', handlePrintShortcut);
  }, [setIsPrintScheduleModalOpen]);

  // Scroll isolation for main schedule table (pointer-aware Lenis bypass)
  const scheduleTableRef = useRef<HTMLDivElement>(null);
  useScrollIsolation(scheduleTableRef);

  return (

    <div className="space-y-6">
      {/* Print-only Institutional Header */}
      {(() => {
        const inst = project.institution;
        return (
          <div className="hidden print:block print:mb-4 text-center border-b-2 border-black pb-2">
            <div
              className={`flex items-center ${
                inst?.logoPlacement === 'center'
                  ? 'flex-col justify-center text-center'
                  : inst?.logoPlacement === 'left' && inst?.logoUrl
                  ? 'flex-row items-center justify-between text-left gap-3'
                  : 'flex-col justify-center text-center'
              }`}
            >
              {inst?.logoUrl && inst.logoPlacement !== 'none' && (
                <img
                  src={inst.logoUrl}
                  alt="Emblem"
                  className="w-12 h-12 object-contain shrink-0"
                />
              )}
              <div className="flex-1 text-center">
                {inst?.institutionName && (
                  <h1 className="text-base font-black uppercase tracking-wide text-black">
                    {inst.institutionName}
                  </h1>
                )}
                {inst?.subHeader && (
                  <p className="text-[11px] font-semibold text-gray-700">
                    {inst.subHeader}
                  </p>
                )}
                {inst?.address && (
                  <p className="text-[10px] text-gray-600">
                    {inst.address}
                  </p>
                )}
                {inst?.officeTitle && (
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-900 mt-0.5">
                    {inst.officeTitle}
                  </p>
                )}
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-black mt-1">
                  {project.projectName || 'Examination Supervision Master Duty Schedule'}
                </h2>
                <h3 className="text-xs font-bold text-gray-800">
                  {inst?.examTitle || project.examPeriod.name || 'End Semester Examinations'} &bull; Period: {project.examPeriod.startDate} to {project.examPeriod.endDate}
                </h3>
              </div>
              {inst?.logoPlacement === 'left' && inst?.logoUrl && (
                <div className="w-12 h-12 shrink-0" aria-hidden="true" />
              )}
            </div>

            <div className="text-[10px] text-gray-600 mt-1 flex justify-center space-x-4 border-t border-gray-300 pt-1">
              <span>Active Faculty: {project.faculty.length}</span>
              <span>Allocated Duties: {project.assignments.length}</span>
              <span>Generated on: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        );
      })()}

      {/* Top View Selector & Search Controls */}
      <div className="apple-glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        {/* View Mode Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 w-full sm:w-auto shadow-inner flex-wrap gap-1">
          <button
            onClick={() => setScheduleViewMode('faculty')}
            className={`btn-spring flex items-center justify-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex-1 sm:flex-initial ${
              scheduleViewMode === 'faculty'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="sm:hidden">Faculty</span>
            <span className="hidden sm:inline">A. Faculty View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('session')}
            className={`btn-spring flex items-center justify-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex-1 sm:flex-initial ${
              scheduleViewMode === 'session'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="sm:hidden">Sessions</span>
            <span className="hidden sm:inline">B. Date / Session View</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('workload')}
            className={`btn-spring flex items-center justify-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex-1 sm:flex-initial ${
              scheduleViewMode === 'workload'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="sm:hidden">Workload</span>
            <span className="hidden sm:inline">C. Workload View</span>
          </button>

          {/* Workload Fairness & Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`btn-spring flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border flex-1 sm:flex-initial ${
              showAnalytics
                ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800 shadow-2xs'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100'
            }`}
            title="Toggle Workload Equity & Distribution Analytics"
          >
            <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="sm:hidden">Equity</span>
            <span className="hidden sm:inline">Equity Analytics</span>
          </button>

          {/* Print Master Schedule Button - Opens Customizer */}
          <button
            type="button"
            onClick={() => setIsPrintScheduleModalOpen(true)}
            className="btn-spring flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-500/20 shadow-2xs flex-1 sm:flex-initial"
            title="Open Master Schedule Print & PDF Customizer (columns, layout, signatures, high contrast)"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="sm:hidden">Print</span>
            <span className="hidden sm:inline">Print Schedule</span>
          </button>

          {/* Letterhead & Signatures Button */}
          <button
            type="button"
            onClick={() => setIsLetterheadModalOpen(true)}
            className="btn-spring flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border bg-sky-500/10 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-500/20 shadow-2xs flex-1 sm:flex-initial"
            title="Configure institution name, emblem logo, and multiple controller signatures"
          >
            <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="sm:hidden">Header</span>
            <span className="hidden sm:inline">Letterhead</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search faculty or Sr. No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDoubleAssignments}
              onChange={(e) => setOnlyDoubleAssignments(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <span>Show Double Duties Only</span>
          </label>
        </div>
      </div>

      {/* Alternatives Navigation Bar with Previous / Next Arrows & Direct Selection */}
      {project.alternatives && project.alternatives.length > 0 && (
        <div className="apple-glass-card px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border border-sky-200/60 dark:border-sky-500/20 bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-transparent no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <span>Active Alternative:</span>
                <span className="text-sky-600 dark:text-sky-400 font-extrabold">
                  {project.alternatives[currentAltIndex]?.name || `Alternative ${currentAltIndex + 1}`}
                </span>
                {project.alternatives[currentAltIndex]?.metrics?.qualityScore !== undefined && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/60">
                    {project.alternatives[currentAltIndex].metrics.qualityScore}% Quality
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
                Use arrows or click buttons below to instantly switch schedule variations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Previous Alternative Arrow */}
            <button
              type="button"
              disabled={currentAltIndex <= 0}
              onClick={() => {
                if (currentAltIndex > 0) {
                  selectAlternative(project.alternatives[currentAltIndex - 1].id);
                }
              }}
              className="btn-spring p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs transition"
              title="Previous Alternative"
              aria-label="Previous Alternative"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Direct Alternative Pill Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {project.alternatives.map((alt, idx) => {
                const isActive =
                  alt.id === project.activeScheduleId ||
                  (!project.activeScheduleId && idx === 0);
                return (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => selectAlternative(alt.id)}
                    className={`btn-spring px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-400/50 scale-[1.03]'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10'
                    }`}
                    title={`${alt.name} (${alt.metrics?.qualityScore ?? 0}% quality)`}
                  >
                    <span>Alt {idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Next Alternative Arrow */}
            <button
              type="button"
              disabled={currentAltIndex >= project.alternatives.length - 1}
              onClick={() => {
                if (currentAltIndex < project.alternatives.length - 1) {
                  selectAlternative(project.alternatives[currentAltIndex + 1].id);
                }
              }}
              className="btn-spring p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs transition"
              title="Next Alternative"
              aria-label="Next Alternative"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Compare All Button */}
            <button
              type="button"
              onClick={() => setIsAlternativesModalOpen(true)}
              className="btn-spring ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 cursor-pointer shadow-xs"
              title="Open full comparison modal"
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {/* Real-time Workload Fairness & Analytics Panel */}
      {showAnalytics && <WorkloadAnalytics />}

      {/* VIEW A: FACULTY VIEW */}
      {scheduleViewMode === 'faculty' && (
        <div className="apple-glass-card overflow-hidden">
          <div className="apple-specular-rim" />

          {/* Quick Date Jumper for Mobile Screens */}
          {activeDates.length > 0 && (
            <div className="sm:hidden flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-2 px-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 no-print">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Date Jump:</span>
              {activeDates.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`faculty-date-th-${d.date}`);
                    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className="btn-spring px-2 py-1 rounded-lg text-[10px] font-bold bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shrink-0 tabular-nums cursor-pointer"
                >
                  {d.displayDate.split(' ')[0]} {d.displayDate.split(' ')[1]}
                </button>
              ))}
            </div>
          )}

          <div ref={scheduleTableRef} className="table-fade-indicator overflow-x-auto touch-scroll">

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px] sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-3 w-12 sm:w-14 sticky left-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs">Sr.</th>
                  <th className="py-3 px-3 min-w-[150px] sm:min-w-[180px] sticky left-12 sm:left-14 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">Faculty Member</th>
                  <th className="py-3 px-2 w-20">Arrival</th>
                  {activeDates.map((d) => {
                    const dateReq =
                      (d.sessionRequirements['JRS 1'] || 0) +
                      (d.sessionRequirements['JRS 2'] || 0) +
                      (d.sessionRequirements['JRS 3'] || 0);
                    const dateAssigned = project.assignments.filter(
                      (a) => a.date === d.date && !a.isReserve
                    ).length;
                    const isShort = dateAssigned < dateReq;

                    return (
                      <th
                        key={d.date}
                        id={`faculty-date-th-${d.date}`}
                        className="py-2.5 px-2 text-center min-w-[110px] border-l border-slate-200/60 dark:border-white/5"
                      >
                        <div className="font-bold text-slate-900 dark:text-white tabular-nums">{d.displayDate}</div>
                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{d.dayOfWeek}</div>
                        {isShort && (
                          <div
                            className="mt-0.5 inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/40"
                            title={`${dateAssigned}/${dateReq} positions staffed. Shortage: ${dateReq - dateAssigned}`}
                          >
                            <span>-{dateReq - dateAssigned} unfilled</span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 text-center w-16 border-l border-slate-200/60 dark:border-white/5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredFaculty.map((f) => {
                  const fDateMap = assignmentsByFacultyDate.get(f.srNo);
                  const totalAssigned = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  ).length;
                  const grandTotal = f.previousSupervisions + totalAssigned;
                  const isAtTarget = grandTotal === f.targetSupervisions;

                  return (
                    <tr key={f.srNo} className="group hover:bg-sky-50/30 dark:hover:bg-white/5 transition">
                      <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-400 dark:text-slate-500 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                        {f.srNo}
                      </td>
                      <td
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenuTarget({
                            x: e.clientX,
                            y: e.clientY,
                            type: 'faculty_header',
                            faculty: f,
                          });
                        }}
                        className="py-2 px-3 font-semibold text-slate-900 dark:text-white sticky left-12 sm:left-14 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] cursor-context-menu"
                        title="Right-click for faculty actions"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate max-w-[120px] sm:max-w-none">{f.name}</span>
                          {f.isHod && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                              HOD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {f.arrival}
                      </td>

                      {/* Date Cells */}
                      {activeDates.map((d) => {
                        const dayAssignments = fDateMap?.get(d.date) || [];
                        const isDouble = dayAssignments.length >= 2;
                        const isDragOver = dragOverCell?.facultySrNo === f.srNo && dragOverCell?.date === d.date;
                        const isMobileTarget = mobileSelectedDuty && mobileSelectedDuty.assignment.date === d.date && mobileSelectedDuty.faculty.srNo !== f.srNo;

                        return (
                          <td
                            key={d.date}
                            onContextMenu={(e) => {
                              if (dayAssignments.length === 0) {
                                e.preventDefault();
                                setContextMenuTarget({
                                  x: e.clientX,
                                  y: e.clientY,
                                  type: 'empty_cell',
                                  faculty: f,
                                  date: d.date,
                                });
                              }
                            }}
                            onDragOver={(e) => {
                              if (draggedDuty && draggedDuty.assignment.date === d.date && draggedDuty.faculty.srNo !== f.srNo) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverCell?.facultySrNo !== f.srNo || dragOverCell?.date !== d.date) {
                                  setDragOverCell({ facultySrNo: f.srNo, date: d.date });
                                }
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverCell?.facultySrNo === f.srNo && dragOverCell?.date === d.date) {
                                setDragOverCell(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverCell(null);
                              if (draggedDuty && draggedDuty.assignment.date === d.date && draggedDuty.faculty.srNo !== f.srNo) {
                                const srcAssignment = draggedDuty.assignment;
                                const srcFaculty = draggedDuty.faculty;
                                const tgtFaculty = f;
                                const tgtDate = d.date;
                                setDraggedDuty(null);
                                setTimeout(() => {
                                  initiateDutyTransfer(srcAssignment, srcFaculty, tgtFaculty, tgtDate);
                                }, 20);
                              } else {
                                setDraggedDuty(null);
                              }
                            }}
                            onClick={() => {
                              if (mobileSelectedDuty && mobileSelectedDuty.assignment.date === d.date && mobileSelectedDuty.faculty.srNo !== f.srNo) {
                                const srcAssignment = mobileSelectedDuty.assignment;
                                const srcFaculty = mobileSelectedDuty.faculty;
                                const tgtFaculty = f;
                                const tgtDate = d.date;
                                setMobileSelectedDuty(null);
                                setTimeout(() => {
                                  initiateDutyTransfer(srcAssignment, srcFaculty, tgtFaculty, tgtDate);
                                }, 20);
                              }
                            }}
                            className={`py-1.5 px-2 text-center border-l border-slate-100 dark:border-white/5 transition-all duration-150 ${
                              isDouble ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                            } ${
                              isDragOver
                                ? 'ring-2 ring-sky-500 bg-sky-100/70 dark:bg-sky-950/70 scale-[1.02] shadow-md z-10'
                                : isMobileTarget
                                ? 'ring-2 ring-dashed ring-sky-400 bg-sky-50/60 dark:bg-sky-950/40 cursor-pointer animate-pulse'
                                : ''
                            }`}
                          >
                            {dayAssignments.length > 0 ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {dayAssignments.map((a) => {
                                  const isCurrentDrag = draggedDuty?.assignment.id === a.id;
                                  const isMobileSelected = mobileSelectedDuty?.assignment.id === a.id;

                                  return (
                                    <div
                                      key={a.id}
                                      draggable={!a.isLocked}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContextMenuTarget({
                                          x: e.clientX,
                                          y: e.clientY,
                                          type: 'duty',
                                          faculty: f,
                                          date: d.date,
                                          session: a.session,
                                          assignment: a,
                                          dayAssignments,
                                        });
                                      }}
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData(
                                          'text/plain',
                                          JSON.stringify({
                                            assignmentId: a.id,
                                            facultySrNo: f.srNo,
                                            date: d.date,
                                            session: a.session,
                                          })
                                        );
                                        e.dataTransfer.effectAllowed = 'move';
                                        setDraggedDuty({ assignment: a, faculty: f });
                                      }}
                                      onDragEnd={() => {
                                        setDraggedDuty(null);
                                        setDragOverCell(null);
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (mobileSelectedDuty && mobileSelectedDuty.assignment.date === d.date && mobileSelectedDuty.faculty.srNo !== f.srNo) {
                                          initiateDutyTransfer(mobileSelectedDuty.assignment, mobileSelectedDuty.faculty, f, d.date);
                                          setMobileSelectedDuty(null);
                                          return;
                                        }
                                        setSelectedAssignmentForInspect(a);
                                      }}
                                      className={`w-full py-1 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between cursor-grab active:cursor-grabbing transition-all duration-200 shadow-2xs backdrop-blur-md ${
                                        isCurrentDrag ? 'opacity-30 scale-95' : ''
                                      } ${
                                        isMobileSelected ? 'ring-2 ring-sky-500 ring-offset-1 scale-[1.04] shadow-md animate-pulse' : ''
                                      } ${
                                        a.isReserve
                                          ? 'bg-amber-500/15 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 border border-amber-400/50 dark:border-amber-700/60 shadow-xs'
                                          : a.session === 'JRS 1'
                                          ? 'bg-sky-500/15 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 hover:bg-sky-500/25 border border-sky-400/50 dark:border-sky-800/50 shadow-xs'
                                          : a.session === 'JRS 2'
                                          ? 'bg-indigo-500/15 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-500/25 border border-indigo-400/50 dark:border-indigo-800/50 shadow-xs'
                                          : 'bg-emerald-500/15 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/25 border border-emerald-400/50 dark:border-emerald-800/50 shadow-xs'
                                      }`}
                                      title={`${a.isReserve ? 'Designated Standby / Reserve Duty' : 'Primary Supervision Duty'} — Drag or tap grip to transfer`}
                                    >
                                      <div className="flex items-center space-x-1 truncate">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (mobileSelectedDuty?.assignment.id === a.id) {
                                              setMobileSelectedDuty(null);
                                            } else {
                                              setMobileSelectedDuty({ assignment: a, faculty: f });
                                            }
                                          }}
                                          className={`p-0.5 rounded transition cursor-pointer shrink-0 ${
                                            isMobileSelected ? 'bg-sky-500 text-white' : 'opacity-40 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500'
                                          }`}
                                          title="Drag or tap to select for duty transfer"
                                        >
                                          <GripVertical className="w-2.5 h-2.5" />
                                        </button>
                                        {a.isReserve && <Shield className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                                        <span className="truncate">{a.session}{a.isReserve ? ' (R)' : ''}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 shrink-0 ml-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedForSubstitute(a);
                                            setIsSubstituteModalOpen(true);
                                          }}
                                          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                                          title="Find Substitute / Swap Colleague"
                                        >
                                          <ArrowRightLeft className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                                        </button>
                                        {a.isLocked ? (
                                          <span title="Locked Assignment">
                                            <Lock className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0" />
                                          </span>
                                        ) : a.isOverride ? (
                                          <span
                                            className="text-[8px] px-1 rounded bg-amber-500 text-white font-bold"
                                            title={`Override: ${a.overrideReason || ''}`}
                                          >
                                            OVR
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                                {isDouble && (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                                    DOUBLE
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  if (mobileSelectedDuty && mobileSelectedDuty.assignment.date === d.date && mobileSelectedDuty.faculty.srNo !== f.srNo) {
                                    e.stopPropagation();
                                    initiateDutyTransfer(mobileSelectedDuty.assignment, mobileSelectedDuty.faculty, f, d.date);
                                    setMobileSelectedDuty(null);
                                    return;
                                  }
                                  setManualEditSlot({
                                    facultySrNo: f.srNo,
                                    date: d.date,
                                    session: 'JRS 2',
                                  });
                                }}
                                className={`w-full h-8 rounded-lg border border-dashed transition-all duration-200 cursor-pointer flex items-center justify-center group ${
                                  isMobileTarget
                                    ? 'border-sky-500 bg-sky-100/50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold'
                                    : 'border-slate-200/80 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500 text-slate-300 dark:text-slate-600 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-xs font-bold'
                                }`}
                                title={isMobileTarget ? 'Click to transfer selected duty here' : 'Click to assign duty'}
                              >
                                {isMobileTarget ? (
                                  <span className="text-[11px]">Drop Here</span>
                                ) : (
                                  <span className="group-hover:scale-125 transition-transform">+</span>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2 px-3 text-center border-l border-slate-200/60 dark:border-white/5 font-mono tabular-nums font-bold">
                        <span
                          className={
                            grandTotal > f.maxSupervisions
                              ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                              : isAtTarget
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {grandTotal} / {f.targetSupervisions}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: DATE / SESSION VIEW */}
      {scheduleViewMode === 'session' && (
        <div className="space-y-6">
          {activeDates.map((d) => {
            return (
              <div
                key={d.date}
                className="apple-glass-card overflow-hidden"
              >
                <div className="apple-specular-rim" />
                <div className="bg-slate-50/70 dark:bg-slate-800/70 p-4 border-b border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {d.displayDate} ({d.dayOfWeek})
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    Total Daily Required: 57 Supervisors (JRS 1: {d.sessionRequirements?.['JRS 1'] ?? 17}, JRS 2: {d.sessionRequirements?.['JRS 2'] ?? 25}, JRS 3: {d.sessionRequirements?.['JRS 3'] ?? 15})
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((session) => {
                    const sessionAssignments = (project.assignments || []).filter(
                      (a) => a.date === d.date && a.session === session
                    );
                    const primaryAssignments = sessionAssignments.filter((a) => !a.isReserve);
                    const reserveAssignments = sessionAssignments.filter((a) => a.isReserve);
                    const required = d.sessionRequirements?.[session] ?? 0;
                    const isFilled = primaryAssignments.length >= required;

                    return (
                      <div key={session} className="p-4 flex flex-col md:flex-row gap-4 items-start">
                        {/* Session details */}
                        <div className="w-full md:w-56 shrink-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                                session === 'JRS 1'
                                  ? 'bg-sky-100/80 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40'
                                  : session === 'JRS 2'
                                  ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
                                  : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                              }`}
                            >
                              {session}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px]">
                              {d.sessionTimings?.[session]?.start ?? '08:00'} - {d.sessionTimings?.[session]?.end ?? '10:00'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 pt-1 tabular-nums">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Required: {required}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span
                              className={`font-bold ${
                                isFilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              Assigned: {primaryAssignments.length}
                            </span>
                          </div>
                          {reserveAssignments.length > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center space-x-1 pt-0.5 tabular-nums">
                              <Shield className="w-3 h-3" />
                              <span>{reserveAssignments.length} Standby Reserve{reserveAssignments.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Supervisor Badges */}
                        <div className="flex-1 space-y-2.5">
                          {/* Primary Supervisors */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1 tabular-nums">
                              Primary Supervisors ({primaryAssignments.length}/{required})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {primaryAssignments.map((a) => {
                                const fac = facultyMap.get(a.facultySrNo);
                                return (
                                  <div
                                    key={a.id}
                                    onClick={() => setSelectedAssignmentForInspect(a)}
                                    className="btn-spring px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-800 dark:text-slate-200 hover:text-sky-900 dark:hover:text-sky-300 border border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-800/40 font-medium cursor-pointer flex items-center space-x-1.5 shadow-2xs backdrop-blur-xs"
                                  >
                                    <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                                      #{a.facultySrNo}
                                    </span>
                                    <span>{fac?.name || `Sr ${a.facultySrNo}`}</span>
                                    {fac?.isHod && (
                                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">HOD</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedForSubstitute(a);
                                        setIsSubstituteModalOpen(true);
                                      }}
                                      className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                                      title="Find Substitute / Swap Colleague"
                                    >
                                      <ArrowRightLeft className="w-2.5 h-2.5 text-slate-400 hover:text-sky-600" />
                                    </button>
                                    {a.isLocked && (
                                      <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    )}
                                  </div>
                                );
                              })}

                              {primaryAssignments.length < required && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualEditSlot({
                                      date: d.date,
                                      session,
                                    })
                                  }
                                  className="btn-spring px-2.5 py-1 rounded-lg bg-rose-500/15 dark:bg-rose-950/60 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-dashed border-rose-400/60 dark:border-rose-700/60 font-bold cursor-pointer flex items-center space-x-1.5 shadow-2xs backdrop-blur-xs"
                                  title="Click to manually assign an available faculty member or substitute to this unfilled position"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                  <span>⚠️ Unfilled Slot (Short by {required - primaryAssignments.length})</span>
                                  <Plus className="w-3 h-3 ml-0.5" />
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  setManualEditSlot({
                                    date: d.date,
                                    session,
                                  })
                                }
                                className="btn-spring px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-medium cursor-pointer flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Supervisor</span>
                              </button>
                            </div>
                          </div>

                          {/* Reserve Supervisors (if any) */}
                          {reserveAssignments.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center space-x-1 mb-1 tabular-nums">
                                <Shield className="w-3 h-3" />
                                <span>Standby / Reserve Supervisors ({reserveAssignments.length})</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {reserveAssignments.map((a) => {
                                  const fac = facultyMap.get(a.facultySrNo);
                                  return (
                                    <div
                                      key={a.id}
                                      onClick={() => setSelectedAssignmentForInspect(a)}
                                      className="btn-spring px-2.5 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 font-medium cursor-pointer flex items-center space-x-1.5 shadow-2xs backdrop-blur-xs"
                                      title="Designated Standby / Reserve Duty"
                                    >
                                      <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span className="text-[10px] font-mono tabular-nums text-amber-600 dark:text-amber-400">
                                        #{a.facultySrNo}
                                      </span>
                                      <span>{fac?.name || `Sr ${a.facultySrNo}`}</span>
                                      <span className="text-[9px] font-bold px-1 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-300">
                                        Reserve
                                      </span>
                                      {fac?.isHod && (
                                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">HOD</span>
                                      )}
                                      {a.isLocked && (
                                        <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW C: WORKLOAD VIEW */}
      {scheduleViewMode === 'workload' && (
        <div className="apple-glass-card overflow-hidden">
          <div className="apple-specular-rim" />
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5 text-[11px] sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-3 w-12 sm:w-16 sticky left-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs">Sr.</th>
                  <th className="py-3 px-4 min-w-[150px] sm:min-w-[180px] sticky left-12 sm:left-16 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">Faculty Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Previous</th>
                  <th className="py-3 px-3 text-center">Target</th>
                  <th className="py-3 px-3 text-center">Maximum</th>
                  <th className="py-3 px-3 text-center">New Duties</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center">Remaining</th>
                  <th className="py-3 px-6 min-w-[200px]">Workload Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredFaculty.map((f) => {
                  const facAssignments = project.assignments.filter(
                    (a) => a.facultySrNo === f.srNo
                  );
                  const primaryCount = facAssignments.filter((a) => !a.isReserve).length;
                  const reserveCount = facAssignments.filter((a) => a.isReserve).length;
                  const countedNew = project.settings.reserveCanExceedCap
                    ? primaryCount
                    : primaryCount + reserveCount;
                  const total = f.previousSupervisions + countedNew;
                  const grandTotal = f.previousSupervisions + primaryCount + reserveCount;
                  const remaining = Math.max(0, f.maxSupervisions - total);
                  const pct = Math.min(100, Math.round((total / f.targetSupervisions) * 100));

                  return (
                    <tr key={f.srNo} className="group hover:bg-sky-50/30 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-mono tabular-nums font-medium text-slate-400 dark:text-slate-500 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                        {f.srNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white sticky left-12 sm:left-16 z-10 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200/80 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate max-w-[120px] sm:max-w-none">{f.name}</span>
                          {f.isExcluded && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
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
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {f.previousSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        {f.targetSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {f.maxSupervisions}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                        {primaryCount}
                        {reserveCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1 text-[11px]" title={`${reserveCount} reserve standby duties${project.settings.reserveCanExceedCap ? ' (can exceed cap)' : ''}`}>
                            (+{reserveCount}R)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold">
                        <span
                          className={
                            total > f.maxSupervisions
                              ? 'text-rose-600 dark:text-rose-400'
                              : total === f.targetSupervisions
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                          title={reserveCount > 0 && project.settings.reserveCanExceedCap ? `Official counted: ${total}, Grand total with reserves: ${grandTotal}` : undefined}
                        >
                          {total}
                          {project.settings.reserveCanExceedCap && reserveCount > 0 && (
                            <span className="text-[10px] text-amber-500 font-normal ml-0.5" title={`Includes ${reserveCount} auxiliary reserve duties (${grandTotal} total)`}>
                              ({grandTotal})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {remaining}
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                total > f.maxSupervisions
                                  ? 'bg-rose-500'
                                  : total === f.targetSupervisions
                                  ? 'bg-emerald-500'
                                  : 'bg-sky-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-[11px] font-medium text-slate-600 dark:text-slate-400 w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drag & Drop Collision Modal */}
      <DragDropCollisionModal
        isOpen={Boolean(collisionModalData)}
        onClose={() => setCollisionModalData(null)}
        sourceAssignment={collisionModalData?.sourceAssignment || null}
        sourceFaculty={collisionModalData?.sourceFaculty || null}
        targetFaculty={collisionModalData?.targetFaculty || null}
        targetAssignment={collisionModalData?.targetAssignment || null}
        dateDisplay={collisionModalData?.dateDisplay || ''}
        onResolve={handleCollisionResolve}
      />

      {/* Drag & Drop Conflict Override Modal */}
      <DragDropOverrideModal
        isOpen={Boolean(overrideModalData)}
        onClose={() => setOverrideModalData(null)}
        sourceAssignment={overrideModalData?.sourceAssignment || null}
        sourceFaculty={overrideModalData?.sourceFaculty || null}
        targetFaculty={overrideModalData?.targetFaculty || null}
        conflictReasons={overrideModalData?.conflictReasons || []}
        dateDisplay={overrideModalData?.dateDisplay || ''}
        onConfirmOverride={handleOverrideConfirm}
      />

      {/* Mobile Floating Action HUD for Tap-to-Transfer */}
      {mobileSelectedDuty && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[94%] bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-2xl shadow-2xl border border-sky-400/40 backdrop-blur-xl flex items-center justify-between gap-3 animate-sheet-up">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4 animate-pulse" />
            </div>
            <div className="truncate text-xs">
              <div className="font-bold text-sky-300 truncate">
                {mobileSelectedDuty.assignment.session} &bull; {mobileSelectedDuty.faculty.name}
              </div>
              <div className="text-[11px] text-slate-300">
                Tap destination faculty row on this date to transfer / replace
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSelectedDuty(null)}
            className="btn-spring px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 shrink-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action Toast */}
      {actionToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-sky-400/50 backdrop-blur-xl flex items-center space-x-2 text-xs font-semibold animate-modal-spring no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Desktop Right-Click Context Menu */}
      <ScheduleContextMenu
        target={contextMenuTarget}
        onClose={() => setContextMenuTarget(null)}
        onRemoveDuty={(assignment) => {
          removeAssignment(assignment.id);
          setActionToast(`Removed duty ${assignment.session}`);
          setTimeout(() => setActionToast(null), 3000);
        }}
        onSubstitute={(assignment) => {
          setSelectedForSubstitute(assignment);
          setIsSubstituteModalOpen(true);
        }}
        onSwap={(assignment, faculty) => {
          setSwapModalData({ assignment, faculty });
        }}
        onToggleReserve={(assignment) => {
          const res = addOrUpdateAssignment(
            assignment.facultySrNo,
            assignment.date,
            assignment.session,
            assignment.isOverride,
            assignment.overrideReason,
            !assignment.isReserve
          );
          if (res.success) {
            setActionToast(`Duty marked as ${!assignment.isReserve ? 'Standby Reserve' : 'Primary Duty'}`);
            setTimeout(() => setActionToast(null), 3000);
          }
        }}
        onToggleLock={(assignment) => {
          toggleLockAssignment(assignment.id);
          setActionToast(`Duty ${assignment.isLocked ? 'Unlocked' : 'Locked'}`);
          setTimeout(() => setActionToast(null), 3000);
        }}
        onToggleSlotUnavailable={(srNo, date, session) => {
          setSlotAvailability(srNo, date, session);
          setActionToast(`Updated availability for faculty #${srNo}`);
          setTimeout(() => setActionToast(null), 3000);
        }}
        onQuickAssign={(srNo, date, session, isReserve) => {
          const res = addOrUpdateAssignment(srNo, date, session, false, undefined, isReserve);
          if (res.success) {
            setActionToast(`Assigned ${session} to #${srNo}`);
          } else {
            setActionToast(res.error || 'Could not assign duty');
          }
          setTimeout(() => setActionToast(null), 3000);
        }}
        onPrintDutySlip={() => {
          setIsDutySlipsModalOpen(true);
        }}
        onEditFaculty={(faculty) => {
          setManualEditSlot({ facultySrNo: faculty.srNo, date: activeDates[0]?.date || '', session: 'JRS 1' });
        }}
      />

      {/* Two-Way Swap Faculty Picker Modal */}
      <SwapFacultyModal
        isOpen={Boolean(swapModalData)}
        onClose={() => setSwapModalData(null)}
        sourceAssignment={swapModalData?.assignment || null}
        sourceFaculty={swapModalData?.faculty || null}
        project={project}
        onConfirmSwap={(sourceAssignment, targetFacultySrNo) => {
          const res = atomicTransferOrSwapDuty(sourceAssignment.id, targetFacultySrNo, 'swap');
          if (res.success) {
            setActionToast(`Successfully exchanged duties`);
          } else {
            setActionToast(res.error || 'Duty exchange failed');
          }
          setTimeout(() => setActionToast(null), 3000);
        }}
      />
    </div>
  );
};
