import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const AlternativesModal: React.FC = () => {
  const {
    project,
    isAlternativesModalOpen,
    setIsAlternativesModalOpen,
    selectAlternative,
    generateAnotherAlternative,
  } = useScheduler();

  const [customSeedInput, setCustomSeedInput] = useState<string>('');

  if (!isAlternativesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-t-3xl sm:rounded-2xl max-w-5xl w-full max-h-[92dvh] sm:my-auto flex flex-col shadow-2xl border border-slate-200/80 dark:border-white/10 animate-sheet-up sm:animate-modal-spring">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Generated Schedule Alternatives ({project.alternatives.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Every alternative satisfies all hard constraints (eligibility, availability, capacity, limits).
              Compare metrics and select the ideal distribution.
            </p>
          </div>

          <button
            onClick={() => setIsAlternativesModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.alternatives.map((alt) => {
              const isActive = project.activeScheduleId === alt.id;

              return (
                <div
                  key={alt.id}
                  className={`rounded-xl p-5 border transition flex flex-col justify-between backdrop-blur-md ${
                    isActive
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-2 ring-sky-500/30'
                      : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        {alt.name}
                      </span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/60">
                          Active Selection
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          Seed: {alt.seed}
                        </span>
                      )}
                    </div>

                    {/* Metrics List */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Positions Filled:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {alt.metrics.filledPositions} / {alt.metrics.totalPositions}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Hard Conflicts:</span>
                        <strong
                          className={
                            alt.metrics.hardConflicts === 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {alt.metrics.hardConflicts}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Double Duties:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {alt.metrics.doubleAssignmentsCount}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Workload Variance:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {alt.metrics.workloadVariance}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Quality Score:</span>
                        <strong className="text-sky-600 dark:text-sky-400 font-bold">
                          {alt.metrics.qualityScore} / 100
                        </strong>
                      </div>
                    </div>

                    {/* Explanation points */}
                    {alt.explanation && (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        {alt.explanation.slice(0, 2).map((exp, eIdx) => (
                          <p key={eIdx}>• {exp}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2">
                    <button
                      onClick={() => selectAlternative(alt.id)}
                      disabled={isActive}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                          : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs hover:shadow'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Currently Selected</span>
                        </>
                      ) : (
                        <>
                          <span>USE THIS SCHEDULE</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Generate Another with Seed */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="font-medium text-slate-700 dark:text-slate-300">Reproducible Random Seed:</span>
            <input
              type="number"
              placeholder="e.g. 505"
              value={customSeedInput}
              onChange={(e) => setCustomSeedInput(e.target.value)}
              className="w-24 px-2.5 py-1 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const s = customSeedInput ? parseInt(customSeedInput, 10) : undefined;
                generateAnotherAlternative(s);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl font-semibold text-xs bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>GENERATE ANOTHER</span>
            </button>

            <button
              onClick={() => setIsAlternativesModalOpen(false)}
              className="px-4 py-2 rounded-xl font-semibold text-xs bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
