import React, { useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  FileCode,
  FileText,
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
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              Export Schedule & Project Backup
            </h3>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Excel Export */}
          <div
            onClick={() => exportScheduleToExcel(project)}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Excel Workbook (.xlsx)</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Formatted workbook containing Faculty View, Daily Session Rosters, and Workload Analysis sheets.
              </p>
            </div>
            <button className="text-emerald-700 font-semibold text-[11px] flex items-center space-x-1">
              <span>Download Excel</span>
              <span>→</span>
            </button>
          </div>

          {/* CSV Export */}
          <div
            onClick={() => exportScheduleToCsv(project)}
            className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 transition cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">CSV Duty Schedule</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Standard comma-separated table compatible with Excel, Google Sheets, and college notice systems.
              </p>
            </div>
            <button className="text-sky-700 font-semibold text-[11px] flex items-center space-x-1">
              <span>Download CSV</span>
              <span>→</span>
            </button>
          </div>

          {/* Complete JSON Project Backup */}
          <div
            onClick={() => exportProjectToJson(project)}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Full Project JSON</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Preserves everything: faculty, dates, exclusions, availability, locks, overrides, and schedule alternatives.
              </p>
            </div>
            <button className="text-indigo-700 font-semibold text-[11px] flex items-center space-x-1">
              <span>Save Project Backup</span>
              <span>→</span>
            </button>
          </div>

          {/* Print Layout */}
          <div
            onClick={handlePrint}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Print-Friendly Format</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Optimized high-contrast layout formatted for physical printing or saving as clean PDF.
              </p>
            </div>
            <button className="text-slate-700 font-semibold text-[11px] flex items-center space-x-1">
              <span>Open Print Dialog</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Restore from JSON Project File */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-800">Restore Existing Project File</div>
            <div className="text-slate-500 text-[11px]">
              Load a previously exported .json project snapshot to restore full state.
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700 rounded-lg shadow-2xs transition shrink-0 flex items-center space-x-1.5"
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
