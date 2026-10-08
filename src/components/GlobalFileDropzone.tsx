import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useScheduler } from '../context/SchedulerContext';
import { parseFacultyCSV } from '../services/csvParser';
import { importProjectFromJson } from '../services/export/exportManager';

export const GlobalFileDropzone: React.FC = () => {
  const { updateFacultyList, importProjectData, setActiveTab, project } = useScheduler();
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      // Only respond to actual file drags from OS, ignore internal DOM dragging (like duties or faculty rows)
      if (!e.dataTransfer?.types?.includes('Files')) return;

      e.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setIsDraggingFiles(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFiles(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const text = await file.text();
      const fileNameLower = file.name.toLowerCase();

      // Case 1: JSON Project Backup
      if (fileNameLower.endsWith('.json') || text.trim().startsWith('{')) {
        const res = importProjectFromJson(text);
        if (res.success && res.state) {
          importProjectData(res.state);
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          setFeedback({
            type: 'success',
            message: `Project restored successfully from "${file.name}"! (${res.state.faculty.length} faculty, ${res.state.assignments.length} duties)`,
          });
          setTimeout(() => setFeedback(null), 5000);
        } else {
          setFeedback({
            type: 'error',
            message: `Failed to restore project from "${file.name}": ${res.error || 'Invalid file format'}`,
          });
          setTimeout(() => setFeedback(null), 6000);
        }
        return;
      }

      // Case 2: CSV Faculty Roster
      const parseResult = parseFacultyCSV(text, { mode: 'from_csv' });
      if (parseResult.success && parseResult.faculty.length > 0) {
        updateFacultyList(parseResult.faculty);
        confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
        setFeedback({
          type: 'success',
          message: `Successfully imported ${parseResult.faculty.length} faculty members from "${file.name}"!`,
        });
        setActiveTab('faculty');
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const errorMsg =
          parseResult.errors.length > 0
            ? parseResult.errors.join('; ')
            : 'No valid faculty records found. Ensure headers include: Sr. No., Faculty Name, HOD, Arrival';
        setFeedback({
          type: 'error',
          message: `CSV Import error: ${errorMsg}`,
        });
        setTimeout(() => setFeedback(null), 7000);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importProjectData, updateFacultyList, setActiveTab, project.settings]);

  return (
    <>
      {/* Floating Action Feedback Banner */}
      {feedback && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center space-x-3 text-xs sm:text-sm font-bold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20'
              : 'bg-rose-600/95 text-white border-rose-400 shadow-rose-600/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Global Full-Screen Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-150 select-none">
          <div className="max-w-md w-full border-3 border-dashed border-sky-400/90 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center space-y-4 shadow-[0_0_80px_rgba(56,189,248,0.25)] bg-sky-500/10 backdrop-blur-md">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl animate-bounce">
              <Upload className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
                <span>Drop File to Import</span>
                <Sparkles className="w-5 h-5 text-amber-300" />
              </h2>
              <p className="text-xs sm:text-sm text-sky-200">
                Plug &amp; play auto-detection for <strong>Faculty Roster (.CSV)</strong> or{' '}
                <strong>Project State (.JSON)</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>.CSV Faculty List</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>.JSON State Backup</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
