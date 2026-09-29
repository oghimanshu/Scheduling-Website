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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Generated Schedule Alternatives ({project.alternatives.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Every alternative satisfies all hard constraints (eligibility, availability, capacity, limits).
              Compare metrics and select the ideal distribution.
            </p>
          </div>

          <button
            onClick={() => setIsAlternativesModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.alternatives.map((alt, idx) => {
              const isActive = project.activeScheduleId === alt.id;

              return (
                <div
                  key={alt.id}
                  className={`rounded-xl p-5 border transition flex flex-col justify-between ${
                    isActive
                      ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {alt.name}
                      </span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                          Active Selection
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">
                          Seed: {alt.seed}
                        </span>
                      )}
                    </div>

                    {/* Metrics List */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Positions Filled:</span>
                        <strong className="text-slate-900">
                          {alt.metrics.filledPositions} / {alt.metrics.totalPositions}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Hard Conflicts:</span>
                        <strong
                          className={
                            alt.metrics.hardConflicts === 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }
                        >
                          {alt.metrics.hardConflicts}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Double Duties:</span>
                        <strong className="text-slate-900 font-mono">
                          {alt.metrics.doubleAssignmentsCount}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Workload Variance:</span>
                        <strong className="text-slate-900 font-mono">
                          {alt.metrics.workloadVariance}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Quality Score:</span>
                        <strong className="text-sky-600 font-bold">
                          {alt.metrics.qualityScore} / 100
                        </strong>
                      </div>
                    </div>

                    {/* Explanation points */}
                    {alt.explanation && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
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
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        isActive
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-700">Reproducible Random Seed:</span>
            <input
              type="number"
              placeholder="e.g. 505"
              value={customSeedInput}
              onChange={(e) => setCustomSeedInput(e.target.value)}
              className="w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const s = customSeedInput ? parseInt(customSeedInput, 10) : undefined;
                generateAnotherAlternative(s);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold text-xs bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>GENERATE ANOTHER</span>
            </button>

            <button
              onClick={() => setIsAlternativesModalOpen(false)}
              className="px-4 py-2 rounded-lg font-semibold text-xs bg-slate-800 text-white hover:bg-slate-900 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
