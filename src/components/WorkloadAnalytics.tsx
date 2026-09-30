import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const WorkloadAnalytics: React.FC = () => {
  const { project } = useScheduler();

  const analytics = useMemo(() => {
    const faculty = project.faculty.filter((f) => !f.isExcluded);
    if (faculty.length === 0) {
      return {
        totalFaculty: 0,
        totalDuties: 0,
        avgDuties: 0,
        stdDev: 0,
        minDuties: 0,
        maxDuties: 0,
        fairnessScore: 100,
        distribution: [0, 0, 0, 0],
        roleStats: [],
      };
    }

    const dutyCounts = faculty.map((f) => {
      const assigned = project.assignments.filter((a) => a.facultySrNo === f.srNo).length;
      return assigned + (f.previousSupervisions || 0);
    });

    const totalDuties = dutyCounts.reduce((a, b) => a + b, 0);
    const avgDuties = totalDuties / faculty.length;

    // Standard deviation
    const variance =
      dutyCounts.reduce((acc, val) => acc + Math.pow(val - avgDuties, 2), 0) / faculty.length;
    const stdDev = Math.sqrt(variance);

    const minDuties = Math.min(...dutyCounts);
    const maxDuties = Math.max(...dutyCounts);

    // Fairness score (100 - (stdDev / max(avg, 1)) * 30) clamped to [0, 100]
    const fairnessScore = Math.max(
      0,
      Math.min(100, Math.round(100 - (stdDev / Math.max(avgDuties, 1)) * 35))
    );

    // Distribution brackets: [0 duties, 1-3, 4-5, 6+]
    const dist = [0, 0, 0, 0];
    dutyCounts.forEach((c) => {
      if (c === 0) dist[0]++;
      else if (c <= 3) dist[1]++;
      else if (c <= 5) dist[2]++;
      else dist[3]++;
    });

    // Breakdown by role
    const roleGroups = new Map<string, { count: number; totalDuties: number }>();
    faculty.forEach((f) => {
      const role = f.role || 'regular';
      const assigned = project.assignments.filter((a) => a.facultySrNo === f.srNo).length;
      const total = assigned + (f.previousSupervisions || 0);
      const existing = roleGroups.get(role) || { count: 0, totalDuties: 0 };
      roleGroups.set(role, {
        count: existing.count + 1,
        totalDuties: existing.totalDuties + total,
      });
    });

    const roleStats = Array.from(roleGroups.entries()).map(([role, stats]) => ({
      role: role.toUpperCase(),
      count: stats.count,
      avg: (stats.totalDuties / stats.count).toFixed(1),
    }));

    return {
      totalFaculty: faculty.length,
      totalDuties,
      avgDuties: Number(avgDuties.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
      minDuties,
      maxDuties,
      fairnessScore,
      distribution: dist,
      roleStats,
    };
  }, [project.faculty, project.assignments]);

  return (
    <div className="apple-glass-card p-5 space-y-4 rounded-3xl border border-sky-200/70 dark:border-white/10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Workload Fairness &amp; Equity Analytics</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {analytics.fairnessScore}% Balanced
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time statistical evaluation of duty distribution balance across all faculty.
            </p>
          </div>
        </div>

        {/* Quick Summary Chips */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Duties</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {analytics.avgDuties}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Std Dev</span>
            <span className="text-xs font-black text-sky-600 dark:text-sky-400">
              ±{analytics.stdDev}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Range</span>
            <span className="text-xs font-black text-purple-600 dark:text-purple-400">
              {analytics.minDuties} - {analytics.maxDuties}
            </span>
          </div>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>0 Duties</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {analytics.distribution[0]}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${analytics.totalFaculty > 0 ? (analytics.distribution[0] / analytics.totalFaculty) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>1 - 3 Duties</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {analytics.distribution[1]}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${analytics.totalFaculty > 0 ? (analytics.distribution[1] / analytics.totalFaculty) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>4 - 5 Duties</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {analytics.distribution[2]}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${analytics.totalFaculty > 0 ? (analytics.distribution[2] / analytics.totalFaculty) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>6+ Duties</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {analytics.distribution[3]}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${analytics.totalFaculty > 0 ? (analytics.distribution[3] / analytics.totalFaculty) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Role Breakdown Pills */}
      {analytics.roleStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-[11px]">
          <span className="text-slate-400 font-semibold">Tier Averages:</span>
          {analytics.roleStats.map((r) => (
            <span
              key={r.role}
              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            >
              <strong>{r.role}:</strong>
              <span className="font-mono text-sky-600 dark:text-sky-400">{r.avg} avg</span>
              <span className="text-[10px] text-slate-400">({r.count} staff)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
