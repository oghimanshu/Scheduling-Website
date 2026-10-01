import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ProjectState,
  Faculty,
  ExamDateConfig,
  Assignment,
  SessionType,
  AdministratorOverride,
  ValidationSummary,
  SessionDefinition,
  SessionTiming,
  CustomRoleDefinition,
  HodAssignmentPriority,
  TabType,
  CloudUser,
  SchedulerSettings,
} from '../types';
import { INITIAL_PROJECT_STATE, EMPTY_SESSION_PROJECT_STATE, DEFAULT_SESSIONS } from '../data/defaultData';
import { validateSchedule } from '../services/validation/validator';
import { analyzeInfeasibility, InfeasibilityReport } from '../services/validation/infeasibility';
import { generateFiveAlternatives, generateSingleAlternative } from '../services/scheduler/alternatives';
import { rebalanceSchedule } from '../services/scheduler/rebalance';
import { saveProjectToStorage, loadProjectFromStorage, clearProjectStorage } from '../services/storage/localStorage';
import { FirebaseManager, CloudSyncStatus } from '../services/storage/firebase';

interface SchedulerContextType {
  project: ProjectState;
  activeTab: TabType;
  scheduleViewMode: 'faculty' | 'session' | 'workload';
  validation: ValidationSummary;
  isGenerating: boolean;
  lastSaved: string;
  selectedAssignmentForInspect: Assignment | null;
  manualEditSlot: { facultySrNo?: number; date: string; session: SessionType } | null;
  isAlternativesModalOpen: boolean;
  isWhyValidModalOpen: boolean;
  isExportModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isReassignHodsModalOpen: boolean;
  isSessionManagerModalOpen: boolean;
  isDutySlipsModalOpen: boolean;
  isRoleSegregationModalOpen: boolean;
  isResetConfirmModalOpen: boolean;
  isGenerationOptionsModalOpen: boolean;
  isGoogleAuthModalOpen: boolean;
  isPrintViewActive: boolean;
  infeasibilityReport: InfeasibilityReport | null;
  currentUser: CloudUser | null;
  cloudSyncStatus: CloudSyncStatus;
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Setters
  setActiveTab: (tab: TabType) => void;
  setScheduleViewMode: (mode: 'faculty' | 'session' | 'workload') => void;
  setSelectedAssignmentForInspect: (assignment: Assignment | null) => void;
  setManualEditSlot: (slot: { facultySrNo?: number; date: string; session: SessionType } | null) => void;
  setIsAlternativesModalOpen: (open: boolean) => void;
  setIsWhyValidModalOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsReassignHodsModalOpen: (open: boolean) => void;
  setIsSessionManagerModalOpen: (open: boolean) => void;
  setIsDutySlipsModalOpen: (open: boolean) => void;
  setIsRoleSegregationModalOpen: (open: boolean) => void;
  setIsResetConfirmModalOpen: (open: boolean) => void;
  setIsGenerationOptionsModalOpen: (open: boolean) => void;
  setIsGoogleAuthModalOpen: (open: boolean) => void;
  selectedForSubstitute: Assignment | null;
  setSelectedForSubstitute: (assignment: Assignment | null) => void;
  isSubstituteModalOpen: boolean;
  setIsSubstituteModalOpen: (open: boolean) => void;
  setIsPrintViewActive: (active: boolean) => void;
  setInfeasibilityReport: (report: InfeasibilityReport | null) => void;

  // Core Operations
  generateAlternatives: () => void;
  executeGenerateAlternatives: (overrideSettings?: Partial<SchedulerSettings>) => void;
  generateAnotherAlternative: (customSeed?: number) => void;
  selectAlternative: (alternativeId: string) => void;
  rebalanceCurrentSchedule: () => void;
  loadProjectFromCloudSession: (cloudState: ProjectState) => void;
  toggleLockAssignment: (assignmentId: string) => void;
  addOrUpdateAssignment: (
    facultySrNo: number,
    date: string,
    session: SessionType,
    isOverride?: boolean,
    overrideReason?: string
  ) => { success: boolean; error?: string };
  removeAssignment: (assignmentId: string) => void;
  updateAssignments: (assignments: Assignment[]) => void;
  swapFacultyAssignments: (
    srNo1: number,
    date1: string,
    session1: SessionType,
    srNo2: number,
    date2: string,
    session2: SessionType
  ) => void;
  updateFacultyList: (faculty: Faculty[]) => void;
  toggleFacultyHod: (srNo: number) => void;
  bulkReassignHods: (hodSrNos: number[], defaultHodTarget?: number) => void;
  toggleFacultyExclusion: (srNo: number, reason?: string) => void;
  updateFacultyExcludedDates: (srNo: number, dates: string[]) => void;
  updateRoleWorkloadCap: (role: 'hod' | 'regular', newCap: number, newTarget?: number) => void;
  updateExamDates: (dates: ExamDateConfig[]) => void;
  updateExamPeriodInfo: (name: string, startDate: string, endDate: string) => void;
  setAvailability: (facultySrNo: number, date: string, isAvailable: boolean) => void;
  bulkSetAvailability: (facultySrNos: number[], dates: string[], isAvailable: boolean) => void;
  copyAvailabilityDateToDate: (fromDate: string, toDate: string) => void;
  addSession: (session: SessionDefinition) => void;
  updateSession: (session: SessionDefinition) => void;
  removeSession: (sessionId: string) => void;
  updateSessionTimings: (sessionId: string, timing: SessionTiming) => void;
  updateSettings: (updater: Partial<ProjectState['settings']>) => void;
  importProjectData: (newState: ProjectState) => void;
  resetProject: () => void;
  resetSessionToZero: (keepFaculty?: boolean, keepExamDates?: boolean) => void;
  clearAssignments: () => void;
  updateFacultyRole: (srNo: number, role: string, concession?: number, target?: number, max?: number) => void;
  bulkSegregateRoles: (srNos: number[], role: string, concession?: number, target?: number, max?: number) => void;
  updateCustomRoles: (roles: CustomRoleDefinition[]) => void;
  updateHodAssignmentPriority: (priority: HodAssignmentPriority) => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<ProjectState>(() => {
    const loaded = loadProjectFromStorage();
    const st = loaded.state;
    if (!st.sessions || !Array.isArray(st.sessions)) {
      st.sessions = DEFAULT_SESSIONS;
    }
    return st;
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [scheduleViewMode, setScheduleViewMode] = useState<'faculty' | 'session' | 'workload'>('faculty');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(project.lastSavedTimestamp || 'Not saved yet');
  const [selectedAssignmentForInspect, setSelectedAssignmentForInspect] = useState<Assignment | null>(null);
  const [manualEditSlot, setManualEditSlot] = useState<{ facultySrNo?: number; date: string; session: SessionType } | null>(null);
  const [isAlternativesModalOpen, setIsAlternativesModalOpen] = useState(false);
  const [isWhyValidModalOpen, setIsWhyValidModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isReassignHodsModalOpen, setIsReassignHodsModalOpen] = useState(false);
  const [isSessionManagerModalOpen, setIsSessionManagerModalOpen] = useState(false);
  const [isDutySlipsModalOpen, setIsDutySlipsModalOpen] = useState(false);
  const [isRoleSegregationModalOpen, setIsRoleSegregationModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [isGenerationOptionsModalOpen, setIsGenerationOptionsModalOpen] = useState(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);
  const [selectedForSubstitute, setSelectedForSubstitute] = useState<Assignment | null>(null);
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [isPrintViewActive, setIsPrintViewActive] = useState(false);
  const [infeasibilityReport, setInfeasibilityReport] = useState<InfeasibilityReport | null>(null);

  // Cloud Sync & Auth State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => FirebaseManager.getInstance().getStatus());
  const [currentUser, setCurrentUser] = useState<CloudUser | null>(() => FirebaseManager.getInstance().getStatus().user);

  useEffect(() => {
    const unsub = FirebaseManager.getInstance().subscribe((s) => {
      setCloudSyncStatus(s);
      setCurrentUser(s.user);
    });
    return unsub;
  }, []);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('EXAM_SCHEDULER_THEME');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('EXAM_SCHEDULER_THEME', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('EXAM_SCHEDULER_THEME', 'light');
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Auto-save to LocalStorage whenever project changes
  useEffect(() => {
    const ts = saveProjectToStorage(project);
    if (ts) {
      setLastSaved(ts);
    }
  }, [project]);

  // Validation is computed reactively whenever faculty, dates, assignments, availability, settings, or sessions change
  const validation = useMemo(() => {
    return validateSchedule(
      project.faculty,
      project.examPeriod.dates,
      project.assignments,
      project.availability,
      project.settings,
      project.sessions
    );
  }, [project.faculty, project.examPeriod.dates, project.assignments, project.availability, project.settings, project.sessions]);

  // Trigger celebration confetti when schedule becomes fully valid (342/342 and 0 conflicts)
  useEffect(() => {
    if (
      validation.isValid &&
      validation.totalFilledPositions > 0 &&
      validation.totalFilledPositions === validation.totalRequiredPositions
    ) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Ignored
      }
    }
  }, [validation.isValid, validation.totalFilledPositions, validation.totalRequiredPositions]);

  // Execute alternative generation with current or override settings
  const executeGenerateAlternatives = useCallback((overrideSettings?: Partial<SchedulerSettings>) => {
    setIsGenerating(true);
    setInfeasibilityReport(null);

    const effectiveSettings = overrideSettings
      ? { ...project.settings, ...overrideSettings }
      : project.settings;

    setTimeout(() => {
      try {
        const locked = project.assignments.filter((a) => a.isLocked);
        const { alternatives } = generateFiveAlternatives(
          project.faculty,
          project.examPeriod.dates,
          project.availability,
          effectiveSettings,
          locked,
          project.sessions
        );

        if (alternatives.length === 0) {
          const report = analyzeInfeasibility(
            project.faculty,
            project.examPeriod.dates,
            locked,
            project.availability,
            effectiveSettings,
            project.sessions
          );
          setInfeasibilityReport(report);
          setIsGenerating(false);
          return;
        }

        // Apply first alternative as default active
        const bestAlt = alternatives[0];
        setProject((prev) => ({
          ...prev,
          settings: effectiveSettings,
          activeScheduleId: bestAlt.id,
          assignments: bestAlt.assignments,
          alternatives,
        }));
        setIsAlternativesModalOpen(true);
      } catch (err: any) {
        console.error('Generation error:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [project.faculty, project.examPeriod.dates, project.availability, project.settings, project.assignments, project.sessions]);

  // Generate 5 alternative schedules (triggers interactive modal if promptGenerationOptions is true)
  const generateAlternatives = useCallback(() => {
    if (project.settings.promptGenerationOptions !== false) {
      setIsGenerationOptionsModalOpen(true);
    } else {
      executeGenerateAlternatives();
    }
  }, [project.settings.promptGenerationOptions, executeGenerateAlternatives]);

  // Load project from cloud session
  const loadProjectFromCloudSession = useCallback((cloudState: ProjectState) => {
    setProject(cloudState);
    saveProjectToStorage(cloudState);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  }, []);

  // Generate another alternative with custom or next seed
  const generateAnotherAlternative = useCallback((customSeed?: number) => {
    const seed = customSeed ?? Math.floor(Math.random() * 100000);
    const locked = project.assignments.filter((a) => a.isLocked);
    const alt = generateSingleAlternative(
      project.faculty,
      project.examPeriod.dates,
      project.availability,
      project.settings,
      seed,
      locked,
      project.sessions
    );
    if (alt) {
      setProject((prev) => ({
        ...prev,
        alternatives: [alt, ...prev.alternatives.slice(0, 4)],
        activeScheduleId: alt.id,
        assignments: alt.assignments,
      }));
    }
  }, [project.faculty, project.examPeriod.dates, project.availability, project.settings, project.assignments, project.sessions]);

  // Select one alternative as active
  const selectAlternative = useCallback((alternativeId: string) => {
    const found = project.alternatives.find((a) => a.id === alternativeId);
    if (found) {
      setProject((prev) => ({
        ...prev,
        activeScheduleId: found.id,
        assignments: found.assignments,
      }));
      setIsAlternativesModalOpen(false);
    }
  }, [project.alternatives]);

  // Rebalance current schedule
  const rebalanceCurrentSchedule = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const result = rebalanceSchedule(
          project.faculty,
          project.examPeriod.dates,
          project.assignments,
          project.availability,
          project.settings,
          project.sessions
        );
        if (result.success) {
          setProject((prev) => ({
            ...prev,
            assignments: result.assignments,
          }));
        } else if (result.infeasibilityReport) {
          setInfeasibilityReport(result.infeasibilityReport);
        }
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, [project.faculty, project.examPeriod.dates, project.assignments, project.availability, project.settings, project.sessions]);

  // Lock / Unlock assignment
  const toggleLockAssignment = useCallback((assignmentId: string) => {
    setProject((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === assignmentId ? { ...a, isLocked: !a.isLocked } : a
      ),
    }));
  }, []);

  // Add or update an assignment manually
  const addOrUpdateAssignment = useCallback((
    facultySrNo: number,
    date: string,
    session: SessionType,
    isOverride = false,
    overrideReason?: string
  ): { success: boolean; error?: string } => {
    const existing = project.assignments.find(
      (a) => a.facultySrNo === facultySrNo && a.date === date && a.session === session
    );
    if (existing) {
      return { success: false, error: 'Faculty member is already assigned to this session.' };
    }

    const fac = project.faculty.find((f) => f.srNo === facultySrNo);
    if (!fac) return { success: false, error: 'Faculty member not found.' };

    const newAssignment: Assignment = {
      id: `${facultySrNo}-${date}-${session}`,
      facultySrNo,
      date,
      session,
      isLocked: false,
      isOverride,
      overrideReason: isOverride ? overrideReason : undefined,
      overrideTimestamp: isOverride ? new Date().toISOString() : undefined,
    };

    let newOverrides = project.overrides;
    if (isOverride && overrideReason) {
      const overrideRecord: AdministratorOverride = {
        id: `ovr-${Date.now()}`,
        assignmentId: newAssignment.id,
        facultySrNo,
        facultyName: fac.name,
        date,
        session,
        overrideType: 'eligibility',
        reason: overrideReason,
        timestamp: new Date().toLocaleString(),
      };
      newOverrides = [...newOverrides, overrideRecord];
    }

    setProject((prev) => ({
      ...prev,
      assignments: [...prev.assignments, newAssignment],
      overrides: newOverrides,
    }));

    return { success: true };
  }, [project.assignments, project.faculty, project.overrides]);

  // Remove assignment
  const removeAssignment = useCallback((assignmentId: string) => {
    setProject((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== assignmentId),
    }));
  }, []);

  // Swap two faculty assignments
  const swapFacultyAssignments = useCallback((
    srNo1: number,
    date1: string,
    session1: SessionType,
    srNo2: number,
    date2: string,
    session2: SessionType
  ) => {
    setProject((prev) => {
      const newAssignments = prev.assignments.map((a) => {
        if (a.facultySrNo === srNo1 && a.date === date1 && a.session === session1 && !a.isLocked) {
          return {
            ...a,
            id: `${srNo2}-${date1}-${session1}`,
            facultySrNo: srNo2,
          };
        }
        if (a.facultySrNo === srNo2 && a.date === date2 && a.session === session2 && !a.isLocked) {
          return {
            ...a,
            id: `${srNo1}-${date2}-${session2}`,
            facultySrNo: srNo1,
          };
        }
        return a;
      });
      return { ...prev, assignments: newAssignments };
    });
  }, []);

  // Bulk update assignments directly (e.g. from Substitute modal)
  const updateAssignments = useCallback((newAssignments: Assignment[]) => {
    setProject((prev) => {
      const updated = {
        ...prev,
        assignments: newAssignments,
        lastSavedTimestamp: new Date().toLocaleTimeString('en-GB'),
      };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  // Update faculty list
  const updateFacultyList = useCallback((newFaculty: Faculty[]) => {
    setProject((prev) => {
      const validSrNos = new Set(newFaculty.map((f) => f.srNo));
      const filteredAssignments = prev.assignments.filter((a) => validSrNos.has(a.facultySrNo));
      return {
        ...prev,
        faculty: newFaculty,
        assignments: filteredAssignments,
      };
    });
  }, []);

  // 1-Click Toggle Faculty HOD Status
  const toggleFacultyHod = useCallback((srNo: number) => {
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        if (f.srNo !== srNo) return f;
        const newIsHod = !f.isHod;
        return {
          ...f,
          isHod: newIsHod,
          targetSupervisions: newIsHod ? 4 : 6,
          maxSupervisions: newIsHod ? 4 : 6,
        };
      }),
    }));
  }, []);

  // Bulk Reassign HODs
  const bulkReassignHods = useCallback((hodSrNos: number[], defaultHodTarget = 4) => {
    const hodSet = new Set(hodSrNos);
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        const isHod = hodSet.has(f.srNo);
        return {
          ...f,
          isHod,
          targetSupervisions: isHod ? defaultHodTarget : 6,
          maxSupervisions: isHod ? defaultHodTarget : 6,
        };
      }),
    }));
  }, []);

  // Toggle Faculty Inclusion / Exclusion (e.g. Sabbatical, Leave)
  const toggleFacultyExclusion = useCallback((srNo: number, reason?: string) => {
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        if (f.srNo !== srNo) return f;
        const newExcluded = !f.isExcluded;
        return {
          ...f,
          isExcluded: newExcluded,
          exclusionReason: newExcluded ? (reason || 'On Leave / Excluded') : undefined,
        };
      }),
    }));
  }, []);

  // Update date-specific exclusions for a faculty member
  const updateFacultyExcludedDates = useCallback((srNo: number, dates: string[]) => {
    setProject((prev) => {
      const newAvail = { ...prev.availability };
      const currentFac = prev.faculty.find((f) => f.srNo === srNo);
      const prevExcluded = new Set(currentFac?.excludedDates || []);
      const newExcludedSet = new Set(dates);

      // Synchronize availability map: mark excluded dates as false, un-excluded dates as true
      prev.examPeriod.dates.forEach((d) => {
        const key = `${srNo}_${d.date}`;
        if (newExcludedSet.has(d.date)) {
          newAvail[key] = false;
        } else if (prevExcluded.has(d.date) && !newExcludedSet.has(d.date)) {
          newAvail[key] = true;
        }
      });

      return {
        ...prev,
        availability: newAvail,
        faculty: prev.faculty.map((f) => {
          if (f.srNo !== srNo) return f;
          return {
            ...f,
            excludedDates: dates,
          };
        }),
      };
    });
  }, []);

  // Role-based bulk workload/cap update (e.g. all HODs or all Regular faculty in one go)
  const updateRoleWorkloadCap = useCallback((role: 'hod' | 'regular', newCap: number, newTarget?: number) => {
    const target = newTarget ?? newCap;
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        if (role === 'hod' && f.isHod) {
          return {
            ...f,
            maxSupervisions: Math.max(1, newCap),
            targetSupervisions: Math.max(1, target),
          };
        }
        if (role === 'regular' && !f.isHod) {
          return {
            ...f,
            maxSupervisions: Math.max(1, newCap),
            targetSupervisions: Math.max(1, target),
          };
        }
        return f;
      }),
    }));
  }, []);

  // Update exam dates configuration
  const updateExamDates = useCallback((dates: ExamDateConfig[]) => {
    setProject((prev) => ({
      ...prev,
      examPeriod: {
        ...prev.examPeriod,
        dates,
      },
    }));
  }, []);

  // Update exam period metadata
  const updateExamPeriodInfo = useCallback((name: string, startDate: string, endDate: string) => {
    setProject((prev) => ({
      ...prev,
      examPeriod: {
        ...prev.examPeriod,
        name,
        startDate,
        endDate,
      },
    }));
  }, []);

  // Set availability for one faculty on one date
  const setAvailability = useCallback((facultySrNo: number, date: string, isAvailable: boolean) => {
    setProject((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [`${facultySrNo}_${date}`]: isAvailable,
      },
    }));
  }, []);

  // Bulk set availability
  const bulkSetAvailability = useCallback((facultySrNos: number[], dates: string[], isAvailable: boolean) => {
    setProject((prev) => {
      const newAvail = { ...prev.availability };
      facultySrNos.forEach((srNo) => {
        dates.forEach((date) => {
          newAvail[`${srNo}_${date}`] = isAvailable;
        });
      });
      return { ...prev, availability: newAvail };
    });
  }, []);

  // Copy availability
  const copyAvailabilityDateToDate = useCallback((fromDate: string, toDate: string) => {
    setProject((prev) => {
      const newAvail = { ...prev.availability };
      prev.faculty.forEach((f) => {
        const fromVal = prev.availability[`${f.srNo}_${fromDate}`] !== false;
        newAvail[`${f.srNo}_${toDate}`] = fromVal;
      });
      return { ...prev, availability: newAvail };
    });
  }, []);

  // Add Session (e.g. JRS 4)
  const addSession = useCallback((newSession: SessionDefinition) => {
    setProject((prev) => {
      const updatedSessions = [...prev.sessions, newSession];
      // Update all dates to include this session with its default requirements and timings
      const updatedDates = prev.examPeriod.dates.map((d) => ({
        ...d,
        sessionRequirements: {
          ...d.sessionRequirements,
          [newSession.id]: d.isExcluded ? 0 : newSession.defaultRequirement,
        },
        sessionTimings: {
          ...d.sessionTimings,
          [newSession.id]: newSession.defaultTiming,
        },
      }));
      return {
        ...prev,
        sessions: updatedSessions,
        examPeriod: {
          ...prev.examPeriod,
          dates: updatedDates,
        },
      };
    });
  }, []);

  // Update Session (timings, requirement, arrivals)
  const updateSession = useCallback((session: SessionDefinition) => {
    setProject((prev) => {
      const updatedSessions = prev.sessions.map((s) => (s.id === session.id ? session : s));
      const updatedDates = prev.examPeriod.dates.map((d) => ({
        ...d,
        sessionTimings: {
          ...d.sessionTimings,
          [session.id]: session.defaultTiming,
        },
      }));
      return {
        ...prev,
        sessions: updatedSessions,
        examPeriod: {
          ...prev.examPeriod,
          dates: updatedDates,
        },
      };
    });
  }, []);

  // Remove Session
  const removeSession = useCallback((sessionId: string) => {
    setProject((prev) => {
      const updatedSessions = prev.sessions.filter((s) => s.id !== sessionId);
      const updatedDates = prev.examPeriod.dates.map((d) => {
        const newReq = { ...d.sessionRequirements };
        delete newReq[sessionId];
        const newTimings = { ...d.sessionTimings };
        delete newTimings[sessionId];
        return {
          ...d,
          sessionRequirements: newReq,
          sessionTimings: newTimings,
        };
      });
      const updatedAssignments = prev.assignments.filter((a) => a.session !== sessionId);
      return {
        ...prev,
        sessions: updatedSessions,
        assignments: updatedAssignments,
        examPeriod: {
          ...prev.examPeriod,
          dates: updatedDates,
        },
      };
    });
  }, []);

  // Update Session Timings across all dates
  const updateSessionTimings = useCallback((sessionId: string, timing: SessionTiming) => {
    setProject((prev) => {
      const updatedSessions = prev.sessions.map((s) =>
        s.id === sessionId ? { ...s, defaultTiming: timing } : s
      );
      const updatedDates = prev.examPeriod.dates.map((d) => ({
        ...d,
        sessionTimings: {
          ...d.sessionTimings,
          [sessionId]: timing,
        },
      }));
      return {
        ...prev,
        sessions: updatedSessions,
        examPeriod: {
          ...prev.examPeriod,
          dates: updatedDates,
        },
      };
    });
  }, []);

  // Update settings
  const updateSettings = useCallback((updater: Partial<ProjectState['settings']>) => {
    setProject((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updater },
    }));
  }, []);

  // Import full project
  const importProjectData = useCallback((newState: ProjectState) => {
    if (!newState.sessions || !Array.isArray(newState.sessions)) {
      newState.sessions = DEFAULT_SESSIONS;
    }
    setProject(newState);
  }, []);

  // Reset to default baseline
  const resetProject = useCallback(() => {
    setProject(INITIAL_PROJECT_STATE);
  }, []);

  // Complete Reset Everything to Zero & Clear Storage
  const resetSessionToZero = useCallback((keepFaculty: boolean = false, keepExamDates: boolean = false) => {
    if (keepFaculty) {
      setProject((prev) => {
        // Reset duty counters to 0, preserve faculty profiles and roles
        const preservedFaculty = prev.faculty.map((f) => ({
          ...f,
          previousSupervisions: 0,
        }));
        const newState: ProjectState = {
          ...EMPTY_SESSION_PROJECT_STATE,
          faculty: preservedFaculty,
          examPeriod: keepExamDates ? prev.examPeriod : EMPTY_SESSION_PROJECT_STATE.examPeriod,
          settings: {
            ...EMPTY_SESSION_PROJECT_STATE.settings,
            customRoles: prev.settings?.customRoles || EMPTY_SESSION_PROJECT_STATE.settings.customRoles,
            hodAssignmentPriority: prev.settings?.hodAssignmentPriority || EMPTY_SESSION_PROJECT_STATE.settings.hodAssignmentPriority,
            defaultSessionTimings: prev.settings?.defaultSessionTimings || EMPTY_SESSION_PROJECT_STATE.settings.defaultSessionTimings,
          },
        };
        saveProjectToStorage(newState);
        return newState;
      });
      setIsResetConfirmModalOpen(false);
      setActiveTab('faculty');
      return;
    }

    clearProjectStorage();
    setProject(EMPTY_SESSION_PROJECT_STATE);
    setIsResetConfirmModalOpen(false);
    setActiveTab('faculty');
  }, []);

  // Clear assignments
  const clearAssignments = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      assignments: [],
      alternatives: [],
      activeScheduleId: null,
    }));
  }, []);

  // Update individual faculty role
  const updateFacultyRole = useCallback((
    srNo: number,
    role: string,
    concession?: number,
    target?: number,
    max?: number
  ) => {
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        if (f.srNo !== srNo) return f;
        const isHodRole = role.toLowerCase().includes('hod') || role.toLowerCase().includes('head');
        return {
          ...f,
          role,
          isHod: isHodRole,
          concessionOrAdditionalDuties: concession !== undefined ? concession : (f.concessionOrAdditionalDuties ?? 0),
          targetSupervisions: target !== undefined ? target : f.targetSupervisions,
          maxSupervisions: max !== undefined ? max : f.maxSupervisions,
        };
      }),
    }));
  }, []);

  // Bulk segregate roles
  const bulkSegregateRoles = useCallback((
    srNos: number[],
    role: string,
    concession?: number,
    target?: number,
    max?: number
  ) => {
    const targetSet = new Set(srNos);
    const isHodRole = role.toLowerCase().includes('hod') || role.toLowerCase().includes('head');
    setProject((prev) => ({
      ...prev,
      faculty: prev.faculty.map((f) => {
        if (!targetSet.has(f.srNo)) return f;
        return {
          ...f,
          role,
          isHod: isHodRole,
          concessionOrAdditionalDuties: concession !== undefined ? concession : (f.concessionOrAdditionalDuties ?? 0),
          targetSupervisions: target !== undefined ? target : f.targetSupervisions,
          maxSupervisions: max !== undefined ? max : f.maxSupervisions,
        };
      }),
    }));
  }, []);

  // Update custom roles in settings
  const updateCustomRoles = useCallback((roles: CustomRoleDefinition[]) => {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        customRoles: roles,
      },
    }));
  }, []);

  // Update HOD assignment priority
  const updateHodAssignmentPriority = useCallback((priority: HodAssignmentPriority) => {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        hodAssignmentPriority: priority,
      },
    }));
  }, []);

  return (
    <SchedulerContext.Provider
      value={{
        project,
        activeTab,
        scheduleViewMode,
        validation,
        isGenerating,
        lastSaved,
        selectedAssignmentForInspect,
        manualEditSlot,
        isAlternativesModalOpen,
        isWhyValidModalOpen,
        isExportModalOpen,
        isSettingsModalOpen,
        isReassignHodsModalOpen,
        isSessionManagerModalOpen,
        isDutySlipsModalOpen,
        isRoleSegregationModalOpen,
        isResetConfirmModalOpen,
        isGenerationOptionsModalOpen,
        isGoogleAuthModalOpen,
        selectedForSubstitute,
        setSelectedForSubstitute,
        isSubstituteModalOpen,
        setIsSubstituteModalOpen,
        isPrintViewActive,
        infeasibilityReport,
        currentUser,
        cloudSyncStatus,
        isDarkMode,
        toggleDarkMode,
        setActiveTab,
        setScheduleViewMode,
        setSelectedAssignmentForInspect,
        setManualEditSlot,
        setIsAlternativesModalOpen,
        setIsWhyValidModalOpen,
        setIsExportModalOpen,
        setIsSettingsModalOpen,
        setIsReassignHodsModalOpen,
        setIsSessionManagerModalOpen,
        setIsDutySlipsModalOpen,
        setIsRoleSegregationModalOpen,
        setIsResetConfirmModalOpen,
        setIsGenerationOptionsModalOpen,
        setIsGoogleAuthModalOpen,
        setIsPrintViewActive,
        setInfeasibilityReport,
        generateAlternatives,
        executeGenerateAlternatives,
        generateAnotherAlternative,
        selectAlternative,
        rebalanceCurrentSchedule,
        loadProjectFromCloudSession,
        toggleLockAssignment,
        addOrUpdateAssignment,
        removeAssignment,
        updateAssignments,
        swapFacultyAssignments,
        updateFacultyList,
        toggleFacultyHod,
        bulkReassignHods,
        toggleFacultyExclusion,
        updateFacultyExcludedDates,
        updateRoleWorkloadCap,
        updateExamDates,
        updateExamPeriodInfo,
        setAvailability,
        bulkSetAvailability,
        copyAvailabilityDateToDate,
        addSession,
        updateSession,
        removeSession,
        updateSessionTimings,
        updateSettings,
        importProjectData,
        resetProject,
        resetSessionToZero,
        clearAssignments,
        updateFacultyRole,
        bulkSegregateRoles,
        updateCustomRoles,
        updateHodAssignmentPriority,
      }}
    >
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = (): SchedulerContextType => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
};
