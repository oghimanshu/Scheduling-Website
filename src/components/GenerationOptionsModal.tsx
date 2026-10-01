import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  Users,
  Sliders,
  Check,
  Layers,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { HodAssignmentPriority } from '../types';

export const GenerationOptionsModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isGenerationOptionsModalOpen,
    setIsGenerationOptionsModalOpen,
    updateSettings,
    executeGenerateAlternatives,
    isGenerating,
  } = useScheduler();

  const [hodPriority, setHodPriority] = useState<HodAssignmentPriority>(
    project.settings.hodAssignmentPriority || 'regular_first_hod_last'
  );
  const [avoidConsecutiveDays, setAvoidConsecutiveDays] = useState(
    project.settings.avoidConsecutiveDays ?? true
  );
  const [minimizeDoubleDuties, setMinimizeDoubleDuties] = useState(
    project.settings.minimizeDoubleDuties ?? true
  );
  const [balanceSeniority, setBalanceSeniority] = useState(
    project.settings.balanceSeniorityPerSession ?? true
  );
  const [strictEqualization, setStrictEqualization] = useState(
    project.settings.strictWorkloadEqualization ?? true
  );
  const [reserveSupervisorsPerSession, setReserveSupervisorsPerSession] = useState<number>(
    project.settings.reserveSupervisorsPerSession ?? 0
  );
  const [reserveCountTowardsFinalCount, setReserveCountTowardsFinalCount] = useState<boolean>(
    !(project.settings.reserveCanExceedCap ?? false)
  );
  const [allowBestEffort, setAllowBestEffort] = useState<boolean>(
    project.settings.allowBestEffort ?? true
  );
  const [relaxArrivalConstraints, setRelaxArrivalConstraints] = useState<boolean>(
    project.settings.relaxArrivalConstraints ?? false
  );
  const [rememberPreferences, setRememberPreferences] = useState(
    !project.settings.promptGenerationOptions
  );

  if (!forceOpen && !isGenerationOptionsModalOpen) return null;

  const handleConfirmGenerate = () => {
    const reserveCanExceedCap = !reserveCountTowardsFinalCount;

    // Save updated preferences to settings
    updateSettings({
      hodAssignmentPriority: hodPriority,
      avoidConsecutiveDays,
      minimizeDoubleDuties,
      balanceSeniorityPerSession: balanceSeniority,
      strictWorkloadEqualization: strictEqualization,
      reserveSupervisorsPerSession,
      reserveCanExceedCap,
      allowBestEffort,
      relaxArrivalConstraints,
      promptGenerationOptions: !rememberPreferences,
    });

    setIsGenerationOptionsModalOpen(false);

    // Trigger solver with these exact settings
    executeGenerateAlternatives(
      {
        hodAssignmentPriority: hodPriority,
        avoidConsecutiveDays,
        minimizeDoubleDuties,
        balanceSeniorityPerSession: balanceSeniority,
        strictWorkloadEqualization: strictEqualization,
        reserveSupervisorsPerSession,
        reserveCanExceedCap,
        allowBestEffort,
        relaxArrivalConstraints,
      },
      {
        allowBestEffort,
        relaxArrivalConstraints,
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" data-lenis-prevent>
      <div className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-sky-300/80 dark:border-sky-900/50 space-y-5 animate-sheet-up sm:animate-modal-spring sm:my-auto max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty Selection &amp; Generation Rules
              </h3>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                Mathematical Solver Preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGenerationOptionsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Customize how the mathematical optimization engine selects and distributes duties before generating 5 valid alternative schedules:
        </p>

        {/* 1. HOD Priority Strategy */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>1. HOD Duty Allocation Priority</span>
          </label>
          <div className="space-y-1.5 text-xs">
            <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
              <input
                type="radio"
                name="modalHodPriority"
                value="regular_first_hod_last"
                checked={hodPriority === 'regular_first_hod_last'}
                onChange={() => setHodPriority('regular_first_hod_last')}
                className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Regular Faculty First, HODs Last (Default Concession)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  Fulfills duties with regular faculty first; HODs only receive duties if remaining capacity is needed.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
              <input
                type="radio"
                name="modalHodPriority"
                value="hod_first"
                checked={hodPriority === 'hod_first'}
                onChange={() => setHodPriority('hod_first')}
                className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  HODs First (Priority Allocation)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  Assigns HODs first until their quota is satisfied, then regular faculty fill remaining duties.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-sky-500/50 transition">
              <input
                type="radio"
                name="modalHodPriority"
                value="proportional_equal"
                checked={hodPriority === 'proportional_equal'}
                onChange={() => setHodPriority('proportional_equal')}
                className="mt-0.5 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Proportional / Equal Balance
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  Assigns HODs and regular faculty concurrently, balancing workloads proportionally to their caps.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* 2-5: Toggle Rules */}
        <div className="space-y-2 text-xs">
          {/* 2. Consecutive Days */}
          <label className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={avoidConsecutiveDays}
              onChange={(e) => setAvoidConsecutiveDays(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                2. Consecutive Days Rest Rule
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Avoid assigning duties on back-to-back days, ensuring faculty receive rest intervals between exam supervision days.
              </span>
            </div>
          </label>

          {/* 3. Double Duties */}
          <label className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={minimizeDoubleDuties}
              onChange={(e) => setMinimizeDoubleDuties(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                3. Double Duty Policy (Same-Day Load)
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                {minimizeDoubleDuties
                  ? 'Strictly minimize double duties (maximum 1 duty per day whenever possible).'
                  : 'Allow double duties (JRS 1+2 or JRS 2+3) to compress faculty duty days.'}
              </span>
            </div>
          </label>

          {/* 4. Seniority Balance */}
          <label className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={balanceSeniority}
              onChange={(e) => setBalanceSeniority(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                4. Seniority &amp; Experience Balance per Session
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Distribute experienced senior faculty (HOD/Professors) evenly alongside junior faculty across all exam rooms and sessions.
              </span>
            </div>
          </label>

          {/* 5. Workload Equalization */}
          <label className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              checked={strictEqualization}
              onChange={(e) => setStrictEqualization(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                5. Strict Workload Equalization
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Enforce identical duty counts among faculty members within the same role tier with minimal variance.
              </span>
            </div>
          </label>
        </div>

        {/* 6. Reserve / Standby Supervisors Policy */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>6. Standby Reserve Supervisors</span>
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Per Session:</span>
              <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl p-0.5 shadow-2xs">
                {[0, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReserveSupervisorsPerSession(num)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      reserveSupervisorsPerSession === num
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {num === 0 ? 'None' : num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {reserveSupervisorsPerSession > 0
              ? `Allocates ${reserveSupervisorsPerSession} standby reserve supervisor(s) for each active examination session to handle emergency absences.`
              : 'No reserve supervisors will be designated. All assigned faculty will be primary invigilators.'}
          </p>

          {reserveSupervisorsPerSession > 0 && (
            <label className="flex items-start space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-amber-500/50 transition animate-in fade-in duration-150">
              <input
                type="checkbox"
                checked={reserveCountTowardsFinalCount}
                onChange={(e) => setReserveCountTowardsFinalCount(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Count reserve supervisions towards final duty count
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  {reserveCountTowardsFinalCount
                    ? '✓ Reserve duties are counted as part of the faculty member’s official final duty count and cannot exceed their maximum workload cap.'
                    : '⚡ Reserve duties do NOT count towards the final workload count. Standby duties are auxiliary and can exceed the faculty member’s normal cap.'}
                </span>
              </div>
            </label>
          )}
        </div>

        {/* 7. Conflict Resilience & Mitigation Fallbacks */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>7. Conflict Resilience &amp; Shortage Fallbacks</span>
          </label>
          <div className="space-y-2 text-xs">
            <label className="flex items-start space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-purple-400/50 transition">
              <input
                type="checkbox"
                checked={allowBestEffort}
                onChange={(e) => setAllowBestEffort(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Generate Best-Effort Schedule if Constraints are Infeasible
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Fills 95%+ of positions and highlights bottleneck shortages instead of aborting with an error.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:border-amber-400/50 transition">
              <input
                type="checkbox"
                checked={relaxArrivalConstraints}
                onChange={(e) => setRelaxArrivalConstraints(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Relax Arrival Shift Rules if Short on Eligible Faculty
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Allows available Mid/Afternoon faculty to cover Morning/JRS 1 when strictly eligible faculty run out.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Remember Preferences */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rememberPreferences}
              onChange={(e) => setRememberPreferences(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <span>Remember preferences (skip this prompt on future 1-click runs)</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => setIsGenerationOptionsModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmGenerate}
            disabled={isGenerating}
            className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-98 rounded-xl shadow-md shadow-sky-500/25 transition cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Optimizing...' : 'Generate 5 Alternatives Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
