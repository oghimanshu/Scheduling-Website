import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Stamp,
  Upload,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { SigningAuthority } from '../types';

export const LetterheadCustomizerModal: React.FC<{ forceOpen?: boolean }> = ({ forceOpen }) => {
  const {
    project,
    isLetterheadModalOpen,
    setIsLetterheadModalOpen,
    updateInstitutionConfig,
    addSigningAuthority,
    updateSigningAuthority,
    removeSigningAuthority,
    reorderSigningAuthorities,
    applyAuthorityPreset,
  } = useScheduler();

  const [activeTab, setActiveTab] = useState<'letterhead' | 'signatures'>('letterhead');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const institution = project.institution || {
    institutionName: 'College of Engineering & Technology',
    subHeader: 'Autonomous Institution • Affiliated to State Technological University',
    address: 'Main Campus, University Road, Academic Zone',
    officeTitle: 'Office of the Controller of Examinations',
    examTitle: 'End Semester Examinations',
    logoPlacement: 'left',
    signingAuthorities: [
      {
        id: 'auth-1',
        name: '',
        role: 'Chief Superintendent / Controller',
        department: 'Examination Control Division',
      },
    ],
    invigilatorAckLabel: "Invigilator's Acknowledgment",
    customInstructions:
      'Report at the Examination Control Room 15 minutes before the session. Possession of mobile devices or programmable calculators in halls is strictly prohibited.',
  };

  // Close on Escape key
  useEffect(() => {
    if (!isLetterheadModalOpen && !forceOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLetterheadModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLetterheadModalOpen, forceOpen, setIsLetterheadModalOpen]);

  if (!forceOpen && !isLetterheadModalOpen) return null;

  // Handle Logo Upload with canvas downscaling for performance
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Constrain max dimensions to 300px to maintain small localStorage footprint
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
          updateInstitutionConfig({ logoUrl: compressedDataUrl });
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    updateInstitutionConfig({ logoUrl: undefined });
  };

  const moveAuthority = (index: number, direction: 'up' | 'down') => {
    const auths = [...institution.signingAuthorities];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= auths.length) return;
    const [moved] = auths.splice(index, 1);
    auths.splice(targetIndex, 0, moved);
    reorderSigningAuthorities(auths);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={() => setIsLetterheadModalOpen(false)}
      data-lenis-prevent
    >
      <div
        className="apple-glass-card bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden sm:my-auto animate-sheet-up sm:animate-modal-spring pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Institutional Letterhead &amp; Signatures
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Print &amp; PDF Orders
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure official college name, emblem, and multi-controller signing authorities for duty slips &amp; schedules
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLetterheadModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-white/10 flex space-x-2 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('letterhead')}
            className={`btn-spring px-4 py-2 text-xs font-bold rounded-t-xl flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'letterhead'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Institution &amp; Letterhead</span>
          </button>
          <button
            onClick={() => setActiveTab('signatures')}
            className={`btn-spring px-4 py-2 text-xs font-bold rounded-t-xl flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'signatures'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>2. Signing Authorities ({institution.signingAuthorities.length})</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'letterhead' && (
            <div className="space-y-5 animate-tab-enter">
              {/* College / Institution Details */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-500" />
                    Institution Information
                  </h4>
                  <span className="text-[11px] text-slate-400">Printed atop all Duty Slips &amp; Master Schedules</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      College / Institution / University Name *
                    </label>
                    <input
                      type="text"
                      value={institution.institutionName}
                      onChange={(e) => updateInstitutionConfig({ institutionName: e.target.value })}
                      placeholder="e.g. Apex Institute of Technology & Management"
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Affiliation / Subtitle
                    </label>
                    <input
                      type="text"
                      value={institution.subHeader || ''}
                      onChange={(e) => updateInstitutionConfig({ subHeader: e.target.value })}
                      placeholder="e.g. Autonomous Institution • Approved by AICTE"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Campus Address / Location
                    </label>
                    <input
                      type="text"
                      value={institution.address || ''}
                      onChange={(e) => updateInstitutionConfig({ address: e.target.value })}
                      placeholder="e.g. Knowledge Park III, Greater Noida, UP - 201306"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload & Placement */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Institutional Emblem / Logo
                  </h4>
                  <span className="text-[11px] text-slate-400">Offline Base64, auto-optimized</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Logo Preview Box */}
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-2 relative overflow-hidden shrink-0 group">
                    {institution.logoUrl ? (
                      <>
                        <img
                          src={institution.logoUrl}
                          alt="Logo Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          onClick={handleRemoveLogo}
                          className="absolute inset-0 bg-red-950/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-5 h-5 text-red-300" />
                          <span className="text-[9px] font-bold mt-1">Remove</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                        <span className="text-[9px] text-slate-400 block mt-1">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-spring px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Emblem (PNG/JPG/SVG)</span>
                      </button>

                      {institution.logoUrl && (
                        <button
                          onClick={handleRemoveLogo}
                          className="btn-spring px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>

                    {/* Logo Placement selector */}
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Placement:
                      </span>
                      {(['left', 'center', 'none'] as const).map((placement) => (
                        <label
                          key={placement}
                          className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer font-medium transition-all ${
                            (institution.logoPlacement || 'left') === placement
                              ? 'bg-sky-500 text-white border-sky-600 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="logoPlacement"
                            value={placement}
                            checked={(institution.logoPlacement || 'left') === placement}
                            onChange={() => updateInstitutionConfig({ logoPlacement: placement })}
                            className="hidden"
                          />
                          {placement === 'left' ? 'Left of Title' : placement === 'center' ? 'Top Center' : 'Hidden'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Office & Exam Titles */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Office &amp; Examination Headings
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Office / Division Title
                    </label>
                    <input
                      type="text"
                      value={institution.officeTitle || ''}
                      onChange={(e) => updateInstitutionConfig({ officeTitle: e.target.value })}
                      placeholder="e.g. Office of the Controller of Examinations"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Examination Period / Title
                    </label>
                    <input
                      type="text"
                      value={institution.examTitle || project.examPeriod.name || ''}
                      onChange={(e) => updateInstitutionConfig({ examTitle: e.target.value })}
                      placeholder="e.g. End Semester Examinations - Autumn 2026"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Invigilator's Acknowledgment Title
                    </label>
                    <input
                      type="text"
                      value={institution.invigilatorAckLabel || "Invigilator's Acknowledgment"}
                      onChange={(e) => updateInstitutionConfig({ invigilatorAckLabel: e.target.value })}
                      placeholder="e.g. Invigilator's Acknowledgment & Undertaking"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Important Instructions &amp; Conduct Rules (Printed at bottom of duty slip)
                    </label>
                    <textarea
                      rows={3}
                      value={institution.customInstructions || ''}
                      onChange={(e) => updateInstitutionConfig({ customInstructions: e.target.value })}
                      placeholder="e.g. Report at the Examination Control Room 15 minutes prior. Possession of mobile devices or programmable calculators in examination halls is strictly prohibited."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="space-y-5 animate-tab-enter">
              {/* Presets Bar */}
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 p-4 rounded-2xl border border-sky-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    Quick Institutional Presets
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">One-click standard templates</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() => applyAuthorityPreset('single')}
                    className="btn-spring px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center cursor-pointer shadow-xs"
                  >
                    Single Controller
                    <span className="block text-[10px] text-slate-400 font-normal">1 Official Signatory</span>
                  </button>
                  <button
                    onClick={() => applyAuthorityPreset('dual')}
                    className="btn-spring px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center cursor-pointer shadow-xs"
                  >
                    Dual Tier
                    <span className="block text-[10px] text-slate-400 font-normal">Asst. Controller + COE</span>
                  </button>
                  <button
                    onClick={() => applyAuthorityPreset('three_tier')}
                    className="btn-spring px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center cursor-pointer shadow-xs"
                  >
                    Three-Tier System
                    <span className="block text-[10px] text-slate-400 font-normal">Asst + Supt + COE</span>
                  </button>
                  <button
                    onClick={() => applyAuthorityPreset('quad')}
                    className="btn-spring px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center cursor-pointer shadow-xs"
                  >
                    Quad / Executive
                    <span className="block text-[10px] text-slate-400 font-normal">Cell + Supt + COE + Dean</span>
                  </button>
                </div>
              </div>

              {/* Authorities List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Stamp className="w-3.5 h-3.5 text-indigo-500" />
                    Configured Signing Authorities ({institution.signingAuthorities.length})
                  </h4>
                  <button
                    onClick={() => addSigningAuthority()}
                    className="btn-spring px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Signatory</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {institution.signingAuthorities.map((auth, idx) => (
                    <div
                      key={auth.id}
                      className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3 relative group"
                    >
                      {/* Position Badge & Order Controls */}
                      <div className="flex items-center gap-1 sm:flex-col sm:gap-0.5 shrink-0">
                        <button
                          onClick={() => moveAuthority(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Move Left/Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => moveAuthority(idx, 'down')}
                          disabled={idx === institution.signingAuthorities.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Move Right/Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Authority Details Form */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            Authority Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={auth.name}
                            onChange={(e) => updateSigningAuthority(auth.id, { name: e.target.value })}
                            placeholder="e.g. Dr. R. K. Sharma (or leave blank)"
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            Official Role / Title *
                          </label>
                          <input
                            type="text"
                            value={auth.role}
                            onChange={(e) => updateSigningAuthority(auth.id, { role: e.target.value })}
                            placeholder="e.g. Controller of Examinations"
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            Department / Cell (Optional)
                          </label>
                          <input
                            type="text"
                            value={auth.department || ''}
                            onChange={(e) => updateSigningAuthority(auth.id, { department: e.target.value })}
                            placeholder="e.g. Examination Control Division"
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => removeSigningAuthority(auth.id)}
                        disabled={institution.signingAuthorities.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 transition-colors cursor-pointer self-end sm:self-center"
                        title={
                          institution.signingAuthorities.length <= 1
                            ? 'At least one signing authority is required'
                            : 'Remove signatory'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Document Preview Card */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                Live Print Preview Sample (Duty Slip Footer &amp; Header)
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> WYSIWYG
              </span>
            </div>

            <div className="bg-white text-black p-4 rounded-xl border border-gray-300 shadow-xs space-y-3 text-center">
              {/* Header preview */}
              <div
                className={`border-b border-black pb-2 flex ${
                  institution.logoPlacement === 'center'
                    ? 'flex-col items-center'
                    : institution.logoPlacement === 'left'
                    ? 'flex-row items-center justify-center gap-3 text-left'
                    : 'flex-col items-center'
                }`}
              >
                {institution.logoUrl && institution.logoPlacement !== 'none' && (
                  <img
                    src={institution.logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain shrink-0 mb-1"
                  />
                )}
                <div>
                  <h3 className="font-extrabold uppercase text-xs sm:text-sm tracking-wide text-black">
                    {institution.institutionName || 'College of Engineering & Technology'}
                  </h3>
                  {institution.subHeader && (
                    <p className="text-[10px] text-gray-700 font-medium">{institution.subHeader}</p>
                  )}
                  {institution.address && (
                    <p className="text-[9px] text-gray-500">{institution.address}</p>
                  )}
                  <p className="font-bold text-[11px] uppercase tracking-wider text-gray-900 mt-1">
                    {institution.officeTitle || 'Office of the Controller of Examinations'}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-700">
                    {institution.examTitle || project.examPeriod.name || 'End Semester Examinations'}
                  </p>
                </div>
              </div>

              {/* Instructions preview */}
              {institution.customInstructions && (
                <div className="p-1.5 bg-gray-50 rounded border border-gray-200 text-[9px] text-gray-700 text-left">
                  <strong>Important Instructions:</strong> {institution.customInstructions}
                </div>
              )}

              {/* Signature Blocks Preview */}
              <div
                className={`grid gap-4 pt-4 text-center ${
                  institution.signingAuthorities.length === 1
                    ? 'grid-cols-2'
                    : institution.signingAuthorities.length === 2
                    ? 'grid-cols-3'
                    : institution.signingAuthorities.length === 3
                    ? 'grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {/* Invigilator's Acknowledgment */}
                <div className="space-y-0.5">
                  <div className="border-t border-black pt-1 font-semibold text-[10px] text-black">
                    {institution.invigilatorAckLabel || "Invigilator's Acknowledgment"}
                  </div>
                  <div className="text-[8px] text-gray-500">Date: _______________</div>
                </div>

                {/* Dynamic Authorities */}
                {institution.signingAuthorities.map((auth) => (
                  <div key={auth.id} className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-semibold text-[10px] text-black">
                      {auth.name && <span className="block font-bold text-gray-900">{auth.name}</span>}
                      <span>{auth.role || 'Controller'}</span>
                    </div>
                    {auth.department && (
                      <div className="text-[8px] text-gray-600">{auth.department}</div>
                    )}
                    <div className="text-[8px] text-gray-400">Official Seal &amp; Signature</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Changes are saved automatically to the current project.
          </span>
          <button
            onClick={() => setIsLetterheadModalOpen(false)}
            className="btn-spring px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
          >
            Done &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
