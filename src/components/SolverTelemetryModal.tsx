import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const SolverTelemetryModal: React.FC = () => {
  const { isGenerating } = useScheduler();
  const [phaseIndex, setPhaseIndex] = useState(0);

  const phases = [
    { label: 'Constructing Bipartite Graph & Eligibility Matrix...', icon: Layers },
    { label: 'Priority Matching & Workload Capacity Reservation...', icon: Cpu },
    { label: 'Augmenting Chain Workload Equalization...', icon: Sparkles },
    { label: 'Multi-Criteria Mathematical Constraint Audit...', icon: ShieldCheck },
  ];

  useEffect(() => {
    if (!isGenerating) {
      setPhaseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, phases.length - 1));
    }, 120);

    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  const currentPhase = phases[phaseIndex];
  const Icon = currentPhase.icon;
  const progressPercent = ((phaseIndex + 1) / phases.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      data-lenis-prevent
      aria-live="polite"
      role="status"
    >
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-sky-400/40 dark:border-sky-500/30 text-center space-y-5 animate-modal-spring relative overflow-hidden">
        <div className="apple-specular-rim" />

        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-500/25 blur-2xl pointer-events-none rounded-full" />

        {/* Animated Icon Orb */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
          <Icon className="w-8 h-8 animate-pulse drop-shadow" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500" />
          </span>
        </div>

        {/* Title & Phase Label */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Algorithmic Solver Engine
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Optimizing Mathematical Roster
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium h-8 flex items-center justify-center transition-all duration-200">
            {currentPhase.label}
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/10">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
            <span>Phase {phaseIndex + 1} of {phases.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Enforcing faculty eligibility, workload fairness, and date constraints...
        </p>
      </div>
    </div>
  );
};
