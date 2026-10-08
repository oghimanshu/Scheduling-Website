import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, Check, AlertCircle } from 'lucide-react';

export interface FileDropZoneProps {
  onFileLoaded: (text: string, file: File) => void;
  accept?: string;
  title?: string;
  description?: string;
  supportedFormatsText?: string;
  className?: string;
  compact?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileLoaded,
  accept = '.csv',
  title = 'Drag & Drop CSV File Here',
  description = 'or click to browse from your device',
  supportedFormatsText = 'Supports standard .csv with headers: Sr. No., Faculty Name, HOD, Arrival',
  className = '',
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    onFileLoaded(text, file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    onFileLoaded(text, file);
    // Reset input so same file can be picked again if desired
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none ${
        isDragOver
          ? 'border-sky-500 bg-sky-500/15 scale-[1.01] shadow-lg ring-4 ring-sky-500/20'
          : 'border-slate-300 dark:border-white/20 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-white/5 hover:bg-sky-50/40 dark:hover:bg-sky-950/20'
      } ${compact ? 'p-4 space-y-2' : 'p-6 sm:p-8 space-y-3'} ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        className={`rounded-2xl flex items-center justify-center transition-transform ${
          isDragOver
            ? 'scale-110 bg-sky-500 text-white shadow-md'
            : 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400'
        } ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}
      >
        <Upload className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
      </div>

      <div className="space-y-1">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center space-x-1.5">
          <span>{title}</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      {supportedFormatsText && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm">
          {supportedFormatsText}
        </span>
      )}
    </div>
  );
};
