import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  UserCheck,
  ArrowLeftRight,
  ShieldAlert,
  Lock,
  Unlock,
  CalendarOff,
  PlusCircle,
  Clock,
  Printer,
  Edit3,
  UserX,
  Sparkles,
} from 'lucide-react';
import { Assignment, Faculty, SessionType } from '../types';

export interface ContextMenuTarget {
  x: number;
  y: number;
  type: 'duty' | 'empty_cell' | 'faculty_header';
  faculty: Faculty;
  date?: string;
  session?: SessionType;
  assignment?: Assignment;
  dayAssignments?: Assignment[];
}

interface ScheduleContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  onRemoveDuty?: (assignment: Assignment) => void;
  onSubstitute?: (assignment: Assignment) => void;
  onSwap?: (assignment: Assignment, faculty: Faculty) => void;
  onToggleReserve?: (assignment: Assignment) => void;
  onToggleLock?: (assignment: Assignment) => void;
  onToggleSlotUnavailable?: (facultySrNo: number, date: string, session?: SessionType) => void;
  onQuickAssign?: (facultySrNo: number, date: string, session: SessionType, isReserve?: boolean) => void;
  onPrintDutySlip?: (facultySrNo: number) => void;
  onEditFaculty?: (faculty: Faculty) => void;
}

export const ScheduleContextMenu: React.FC<ScheduleContextMenuProps> = ({
  target,
  onClose,
  onRemoveDuty,
  onSubstitute,
  onSwap,
  onToggleReserve,
  onToggleLock,
  onToggleSlotUnavailable,
  onQuickAssign,
  onPrintDutySlip,
  onEditFaculty,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('contextmenu', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [target, onClose]);

  if (!target) return null;

  // Viewport clamping
  const menuWidth = 240;
  const menuHeight = 320;
  const posX = Math.min(target.x, window.innerWidth - menuWidth - 16);
  const posY = Math.min(target.y, window.innerHeight - menuHeight - 16);

  const menuContent = (
    <div
      ref={menuRef}
      style={{ top: `${Math.max(12, posY)}px`, left: `${Math.max(12, posX)}px` }}
      className="fixed z-[9999] w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 text-xs text-slate-700 dark:text-slate-200 animate-modal-spring select-none ring-1 ring-black/5 dark:ring-white/5"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Context Target Header */}
      <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <span className="font-bold truncate text-slate-900 dark:text-white max-w-[150px]">
          {target.faculty.name}
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          #{target.faculty.srNo}
        </span>
      </div>

      {/* Target Type: Specific Duty Pill */}
      {target.type === 'duty' && target.assignment && (
        <div className="space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Duty: {target.assignment.session} {target.assignment.isReserve ? '(Reserve)' : ''}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSubstitute?.(target.assignment!);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 transition text-left cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-sky-500" />
            <span>Assign to Someone Else...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSwap?.(target.assignment!, target.faculty);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 transition text-left cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
            <span>Two-Way Swap with Faculty...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleReserve?.(target.assignment!);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 transition text-left cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>{target.assignment.isReserve ? 'Promote to Primary Duty' : 'Set as Standby Reserve'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleLock?.(target.assignment!);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition text-left cursor-pointer"
          >
            {target.assignment.isLocked ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-500" />
                <span>Unlock Assignment</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Lock Assignment</span>
              </>
            )}
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-white/5" />

          {target.date && (
            <button
              type="button"
              onClick={() => {
                onToggleSlotUnavailable?.(target.faculty.srNo, target.date!, target.assignment!.session);
                onClose();
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer"
            >
              <CalendarOff className="w-4 h-4" />
              <span>Mark Unavailable for {target.assignment.session}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onRemoveDuty?.(target.assignment!);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove This Duty</span>
          </button>
        </div>
      )}

      {/* Target Type: Empty Date Cell */}
      {target.type === 'empty_cell' && target.date && (
        <div className="space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Quick Assign on {target.date}</span>
          </div>

          {(['JRS 1', 'JRS 2', 'JRS 3'] as SessionType[]).map((sess) => (
            <button
              key={sess}
              type="button"
              onClick={() => {
                onQuickAssign?.(target.faculty.srNo, target.date!, sess, false);
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 transition text-left cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-sky-500" />
                <span>Assign {sess}</span>
              </div>
              <span className="text-[10px] text-slate-400">Regular</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              onQuickAssign?.(target.faculty.srNo, target.date!, 'JRS 1', true);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 transition text-left cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Assign as Standby Reserve</span>
            </div>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-white/5" />

          <button
            type="button"
            onClick={() => {
              onToggleSlotUnavailable?.(target.faculty.srNo, target.date!);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer"
          >
            <CalendarOff className="w-4 h-4" />
            <span>Mark Entire Day Unavailable</span>
          </button>
        </div>
      )}

      {/* Target Type: Faculty Header (Sr. No. or Name) */}
      {target.type === 'faculty_header' && (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onPrintDutySlip?.(target.faculty.srNo);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition text-left cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>Print Faculty Duty Slip</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onEditFaculty?.(target.faculty);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 transition text-left cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-sky-500" />
            <span>Edit Profile &amp; Allowed Sessions</span>
          </button>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(menuContent, document.body) : menuContent;
};
