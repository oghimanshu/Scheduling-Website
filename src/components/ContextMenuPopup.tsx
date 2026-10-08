import React from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuPopupProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenuPopup: React.FC<ContextMenuPopupProps> = ({
  isOpen,
  position,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[10000] pointer-events-auto select-none"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed min-w-[210px] max-w-[280px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 z-[10001]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-specular-rim" />
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export const ContextMenuItem: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'accent' | 'warning';
  disabled?: boolean;
  shortcut?: string;
}> = ({ icon, label, onClick, variant = 'default', disabled = false, shortcut }) => {
  const variantStyles = {
    default:
      'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white',
    danger:
      'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300',
    accent:
      'text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-900 dark:hover:text-sky-100 font-semibold',
    warning:
      'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-900 dark:hover:text-amber-100',
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles}`}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span className="truncate flex-1 font-medium">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-auto">
          {shortcut}
        </span>
      )}
    </button>
  );
};

export const ContextMenuDivider: React.FC = () => (
  <div className="h-px bg-slate-200/80 dark:bg-white/10 my-1 mx-1" />
);

export const ContextMenuHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1">
    <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{title}</div>
    {subtitle && (
      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</div>
    )}
  </div>
);
