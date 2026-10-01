import React, { useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  FileCode,
  FileText,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import {
  exportProjectToJson,
  importProjectFromJson,
  exportScheduleToExcel,
  exportScheduleToCsv,
} from '../services/export/exportManager';

export const ExportModal: React.FC = () => {
  const {
    project,
    isExportModalOpen,
    setIsExportModalOpen,
    importProjectData,
    setActiveTab,
    setIsDutySlipsModalOpen,
  } = useScheduler();

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isExportModalOpen) return null;

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = importProjectFromJson(text);
      if (res.success && res.state) {
        importProjectData(res.state);
        alert('Successfully restored project state from JSON backup file!');
        setIsExportModalOpen(false);
      } else {
        alert(res.error || 'Failed to restore project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    setIsExportModalOpen(false);
    setActiveTab('schedule');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="apple-glass-card bg-white/95 dark:bg-slate-900/95 rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92dvh] flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Export Schedule &amp; Project Backup
            </h3>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Excel Export */}
          <div
            onClick={() => exportScheduleToExcel(project)}
            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Excel Workbook (.xlsx)</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Formatted workbook containing Faculty View, Daily Session Rosters, and Workload Analysis sheets.
              </p>
            </div>
            <button className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
              <span>Download Excel</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* CSV Export */}
          <div
            onClick={() => exportScheduleToCsv(project)}
            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-sky-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">CSV Duty Schedule</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Standard comma-separated table compatible with Excel, Google Sheets, and college notice systems.
              </p>
            </div>
            <button className="text-sky-700 dark:text-sky-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
              <span>Download CSV</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Complete JSON Project Backup */}
          <div
            onClick={() => exportProjectToJson(project)}
            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Full Project JSON</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Preserves everything: faculty, dates, exclusions, availability, locks, overrides, and schedule alternatives.
              </p>
            </div>
            <button className="text-indigo-700 dark:text-indigo-400 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
              <span>Save Project Backup</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Print Layout */}
          <div
            onClick={handlePrint}
            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition cursor-pointer group space-y-2 backdrop-blur-xs"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Print-Friendly Format</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Optimized high-contrast layout formatted for physical printing or saving as clean PDF.
              </p>
            </div>
            <button className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
              <span>Open Print Dialog</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Individual Faculty Duty Slips */}
          <div
            onClick={() => {
              setIsExportModalOpen(false);
              setIsDutySlipsModalOpen(true);
            }}
            className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group space-y-2 backdrop-blur-xs sm:col-span-2"
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center group-hover:scale-105 transition shadow-2xs shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Individual Faculty Duty Slips &amp; Appointment Orders</h4>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Official Printable
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Print official invigilation orders per faculty member with reporting times, examination session details, and formal signature blocks.
                </p>
                <div className="pt-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                  <span>Open Slips &amp; Batch Print Assistant</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restore from JSON Project File */}
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Restore Existing Project File</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              Load a previously exported .json project snapshot to restore full state.
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 rounded-lg shadow-2xs transition shrink-0 flex items-center space-x-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select JSON File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleJsonUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
