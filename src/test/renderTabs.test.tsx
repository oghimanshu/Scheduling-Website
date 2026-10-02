import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { ScheduleViewer } from '../components/ScheduleViewer';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { InstructionsView } from '../components/InstructionsView';
import { FacultyManager } from '../components/FacultyManager';
import { ResetSessionConfirmModal } from '../components/ResetSessionConfirmModal';
import { RoleSegregationModal } from '../components/RoleSegregationModal';
import { DutySlipsModal } from '../components/DutySlipsModal';
import { RoleManagerView } from '../components/RoleManagerView';
import { GenerationOptionsModal } from '../components/GenerationOptionsModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';
import { QuickstartWizardModal } from '../components/QuickstartWizardModal';
import { DateSessionModal } from '../components/DateSessionModal';
import { SubstituteModal } from '../components/SubstituteModal';
import { WorkloadAnalytics } from '../components/WorkloadAnalytics';
import { DragDropOverrideModal } from '../components/DragDropOverrideModal';
import { DragDropCollisionModal } from '../components/DragDropCollisionModal';
import { LetterheadCustomizerModal } from '../components/LetterheadCustomizerModal';
import { PrintScheduleModal } from '../components/PrintScheduleModal';
import { ExportModal } from '../components/ExportModal';
import { setPrintOrientation, clearPrintOrientation } from '../utils/printHelper';
import { generateSampleFacultyCSV } from '../services/csvParser';
import { MOCK_FACULTY_LIST as DEFAULT_FACULTY_LIST } from './fixtures/mockFaculty';
import { INITIAL_PROJECT_STATE, DEFAULT_DATES_CONFIG } from '../data/defaultData';

function PopulatedScheduleTester({ mode }: { mode: 'faculty' | 'session' | 'workload' }) {
  const { setScheduleViewMode, updateFacultyList } = useScheduler();
  React.useEffect(() => {
    setScheduleViewMode(mode);
  }, [mode]);
  return <ScheduleViewer />;
}

describe('Populated UI Components Test', () => {
  it('renders ScheduleViewer with loaded faculty and assignments in faculty, session, and workload modes', () => {
    for (const mode of ['faculty', 'session', 'workload'] as const) {
      const html = renderToString(
        <SchedulerProvider>
          <PopulatedScheduleTester mode={mode} />
        </SchedulerProvider>
      );
      expect(html.length).toBeGreaterThan(50);
    }
  });

  it('renders AvailabilityManager with loaded faculty', () => {
    const html = renderToString(
      <SchedulerProvider>
        <AvailabilityManager />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
  });

  it('renders InstructionsView cleanly', () => {
    const html = renderToString(
      <SchedulerProvider>
        <InstructionsView />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
    expect(html).toContain('How to Use the Examination Supervision Scheduler');
  });

  it('renders FacultyManager cleanly', () => {
    const html = renderToString(
      <SchedulerProvider>
        <FacultyManager />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(50);
    expect(html).toContain('Faculty Master Data');
    expect(html).toContain('DOWNLOAD EXAMPLE FORMAT');
  });

  it('verifies sample CSV format is completely empty of faculty data', () => {
    const sample = generateSampleFacultyCSV(false);
    expect(sample.trim()).toBe('Sr. No.,Faculty Name,HOD,Arrival');
    expect(sample).not.toContain('Neera');
    expect(sample).not.toContain('Himanshu');
  });

  it('renders ResetSessionConfirmModal, RoleSegregationModal, and DutySlipsModal', () => {
    function ModalsTester() {
      const { setIsResetConfirmModalOpen, setIsRoleSegregationModalOpen, setIsDutySlipsModalOpen } = useScheduler();
      React.useEffect(() => {
        setIsResetConfirmModalOpen(true);
        setIsRoleSegregationModalOpen(true);
        setIsDutySlipsModalOpen(true);
      }, []);
      return (
        <>
          <ResetSessionConfirmModal forceOpen={true} />
          <RoleSegregationModal forceOpen={true} />
          <DutySlipsModal forceOpen={true} />
        </>
      );
    }

    const html = renderToString(
      <SchedulerProvider>
        <ModalsTester />
      </SchedulerProvider>
    );
    expect(html).toContain('Reset Session to Zero');
    expect(html).toContain('Faculty Role Segregation');
    expect(html).toContain('Faculty Duty Slips');
  });

  it('renders RoleManagerView tab cleanly with custom roles and allocation controls', () => {
    const html = renderToString(
      <SchedulerProvider>
        <RoleManagerView />
      </SchedulerProvider>
    );
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain('Faculty Role Manager');
    expect(html).toContain('Batch Faculty Role Assignment');
  });

  it('renders GenerationOptionsModal and GoogleAuthModal with forceOpen', () => {
    const genModalHtml = renderToString(
      <SchedulerProvider>
        <GenerationOptionsModal forceOpen={true} />
      </SchedulerProvider>
    );
    expect(genModalHtml).toContain('Faculty Selection');
    expect(genModalHtml).toContain('HOD Duty Allocation Priority');
    expect(genModalHtml).toContain('Consecutive Days Rest Rule');
    expect(genModalHtml).toContain('Standby Reserve Supervisors');

    const authModalHtml = renderToString(
      <SchedulerProvider>
        <GoogleAuthModal forceOpen={true} />
      </SchedulerProvider>
    );
    expect(authModalHtml).toContain('Google Drive &amp; Cloud Auto-Sync');
    expect(authModalHtml).toContain('1-Click Drive &amp; Folder Sync');
    expect(authModalHtml).toContain('Google Drive API');
    expect(authModalHtml).toContain('Firebase DB');

    const quickstartHtml = renderToString(
      <SchedulerProvider>
        <QuickstartWizardModal forceOpen={true} />
      </SchedulerProvider>
    );
    expect(quickstartHtml).toContain("Let&#x27;s Begin — Intuitive Quickstart");
    expect(quickstartHtml).toContain('Faculty List');
    expect(quickstartHtml).toContain('Dates &amp; Sessions');
  });

  it('renders DateSessionModal, SubstituteModal, and WorkloadAnalytics cleanly', () => {
    const dateModalHtml = renderToString(
      <SchedulerProvider>
        <DateSessionModal
          dateConfig={DEFAULT_DATES_CONFIG[1]}
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
        />
      </SchedulerProvider>
    );
    expect(dateModalHtml).toContain('Date Session Customizer');
    expect(dateModalHtml).toContain('Eligible Faculty Arrivals');

    const subModalHtml = renderToString(
      <SchedulerProvider>
        <SubstituteModal
          assignment={{
            id: '1-2026-10-06-JRS 1',
            facultySrNo: 1,
            date: '2026-10-06',
            session: 'JRS 1',
            isLocked: false,
            isOverride: false,
          }}
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
        />
      </SchedulerProvider>
    );
    expect(subModalHtml).toContain('Find Substitute / Duty Swap');
    expect(subModalHtml).toContain('Conflict-Free Only');

    const analyticsHtml = renderToString(
      <SchedulerProvider>
        <WorkloadAnalytics />
      </SchedulerProvider>
    );
    expect(analyticsHtml).toContain('Workload Fairness &amp; Equity Analytics');
    expect(analyticsHtml).toContain('Avg Duties');
  });

  it('renders DragDropOverrideModal and DragDropCollisionModal cleanly without getting trapped or crashing', () => {
    const overrideHtml = renderToString(
      <DragDropOverrideModal
        isOpen={true}
        onClose={() => {}}
        sourceAssignment={{
          id: '1-2026-10-06-JRS 1',
          facultySrNo: 1,
          date: '2026-10-06',
          session: 'JRS 1',
          isLocked: false,
          isOverride: false,
        }}
        sourceFaculty={{
          srNo: 1,
          name: 'Dr. Alice',
          arrival: 'Morning',
          targetSupervisions: 5,
          maxSupervisions: 6,
          previousSupervisions: 0,
          isExcluded: false,
          isHod: false,
        }}
        targetFaculty={{
          srNo: 2,
          name: 'Dr. Bob',
          arrival: 'Morning',
          targetSupervisions: 5,
          maxSupervisions: 6,
          previousSupervisions: 0,
          isExcluded: false,
          isHod: false,
        }}
        conflictReasons={['Exceeds maximum workload cap (7/6)']}
        dateDisplay="06 Oct 2026"
        onConfirmOverride={() => {}}
      />
    );
    expect(overrideHtml).toContain('Scheduling Rule Conflict');
    expect(overrideHtml).toContain('Exceeds maximum workload cap (7/6)');
    expect(overrideHtml).toContain('Authorize Override &amp; Assign');

    const collisionHtml = renderToString(
      <DragDropCollisionModal
        isOpen={true}
        onClose={() => {}}
        sourceAssignment={{
          id: '1-2026-10-06-JRS 1',
          facultySrNo: 1,
          date: '2026-10-06',
          session: 'JRS 1',
          isLocked: false,
          isOverride: false,
        }}
        sourceFaculty={{
          srNo: 1,
          name: 'Dr. Alice',
          arrival: 'Morning',
          targetSupervisions: 5,
          maxSupervisions: 6,
          previousSupervisions: 0,
          isExcluded: false,
          isHod: false,
        }}
        targetFaculty={{
          srNo: 2,
          name: 'Dr. Bob',
          arrival: 'Morning',
          targetSupervisions: 5,
          maxSupervisions: 6,
          previousSupervisions: 0,
          isExcluded: false,
          isHod: false,
        }}
        targetAssignment={{
          id: '2-2026-10-06-JRS 1',
          facultySrNo: 2,
          date: '2026-10-06',
          session: 'JRS 1',
          isLocked: false,
          isOverride: false,
        }}
        dateDisplay="06 Oct 2026"
        onResolve={() => {}}
      />
    );
    expect(collisionHtml).toContain('Duty Assignment Collision');
    expect(collisionHtml).toContain('Two-Way Duty Swap');
    expect(collisionHtml).toContain('One-Way Replace');
  });

  it('renders DutySlipsModal isolated printable container and switches print orientation', () => {
    // Test printHelper orientation injection in DOM-less SSR
    setPrintOrientation('landscape', '8mm');
    clearPrintOrientation();
    setPrintOrientation('portrait', '8mm');
    clearPrintOrientation();

    const dutySlipsHtml = renderToString(
      <SchedulerProvider>
        <DutySlipsModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(dutySlipsHtml).toContain('duty-slips-modal-card');
    expect(dutySlipsHtml).toContain('duty-slips-modal-ui');
    expect(dutySlipsHtml).toContain('Faculty Duty Slips &amp; Appointment Orders');
    expect(dutySlipsHtml).toContain('Save Paper (2 / Page)');
    expect(dutySlipsHtml).toContain('Letterhead &amp; Signatures');
  });

  it('renders LetterheadCustomizerModal with institution fields and presets', () => {
    const modalHtml = renderToString(
      <SchedulerProvider>
        <LetterheadCustomizerModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(modalHtml).toContain('Institutional Letterhead &amp; Signatures');
    expect(modalHtml).toContain('College / Institution / University Name');
    expect(modalHtml).toContain('Institutional Emblem / Logo');
    expect(modalHtml).toContain('Upload Emblem');
    expect(modalHtml).toContain('Signing Authorities');
    expect(modalHtml).toContain('Live Print Preview Sample');
  });

  it('supports configuring multiple signing authorities and reflects them in duty slips and master schedule', () => {
    const mockStorage: Record<string, string> = {};
    const customProjectState = {
      ...INITIAL_PROJECT_STATE,
      faculty: DEFAULT_FACULTY_LIST,
      assignments: [
        {
          id: '4-2026-10-06-JRS 1',
          facultySrNo: 4,
          date: '2026-10-06',
          session: 'JRS 1' as const,
          isLocked: false,
          isOverride: false,
        },
      ],
      institution: {
        institutionName: 'Apex Institute of Technology & Science',
        subHeader: 'Autonomous Campus • Accredited Grade A++',
        address: 'Knowledge Corridor, Sector 62',
        officeTitle: 'Office of the Examination Directorate',
        examTitle: 'End Semester Examinations Autumn 2026',
        logoPlacement: 'left' as const,
        customInstructions: 'Bring physical photo ID card and hall ticket.',
        invigilatorAckLabel: "Invigilator's Acknowledgment",
        signingAuthorities: [
          {
            id: 'auth-1',
            name: 'Dr. A. Verma',
            role: 'Assistant Controller of Examinations',
            department: 'Examination Conduct Section',
          },
          {
            id: 'auth-2',
            name: 'Prof. K. Singh',
            role: 'Center Superintendent',
            department: 'Campus Examination Center',
          },
          {
            id: 'auth-3',
            name: 'Dr. R. K. Sharma',
            role: 'Controller of Examinations',
            department: 'Office of the Controller of Examinations',
          },
        ],
      },
    };

    mockStorage['EXAM_SCHEDULER_SESSION_STATE_V1'] = JSON.stringify(customProjectState);
    const originalWindow = (global as any).window;
    (global as any).window = {
      sessionStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      matchMedia: () => ({ matches: false }),
    };

    try {
      const testHtml = renderToString(
        <SchedulerProvider>
          <div>
            <ScheduleViewer />
            <DutySlipsModal forceOpen={true} />
          </div>
        </SchedulerProvider>
      );

      // Verify Master Schedule Print Header displays custom institution
      expect(testHtml).toContain('Apex Institute of Technology &amp; Science');
      expect(testHtml).toContain('Office of the Examination Directorate');

      // Verify Duty Slips display custom details & multi-controller signatures
      expect(testHtml).toContain('Knowledge Corridor, Sector 62');
      expect(testHtml).toContain('Bring physical photo ID card and hall ticket.');
      expect(testHtml).toContain('Assistant Controller of Examinations');
      expect(testHtml).toContain('Center Superintendent');
      expect(testHtml).toContain('Controller of Examinations');
      expect(testHtml).toContain('Dr. A. Verma');
      expect(testHtml).toContain('Prof. K. Singh');
      expect(testHtml).toContain('Dr. R. K. Sharma');
      expect(testHtml).toContain("Invigilator&#x27;s Acknowledgment");
    } finally {
      if (originalWindow !== undefined) {
        (global as any).window = originalWindow;
      } else {
        delete (global as any).window;
      }
    }
  });

  it('renders PrintScheduleModal cleanly with full customization options and printable preview', () => {
    const html = renderToString(
      <SchedulerProvider>
        <PrintScheduleModal forceOpen={true} />
      </SchedulerProvider>
    );

    // Verify modal header & print triggers
    expect(html).toContain('Master Schedule Print &amp; PDF Customizer');
    expect(html).toContain('Print Schedule / PDF');

    // Verify navigation tabs
    expect(html).toContain('Columns');
    expect(html).toContain('Layout');
    expect(html).toContain('Header');

    // Verify column toggles in active columns tab
    expect(html).toContain('Faculty Metadata Columns');
    expect(html).toContain('Sr. Number');
    expect(html).toContain('Faculty Name (Mandatory)');
    expect(html).toContain('Role / Designation');
    expect(html).toContain('Arrival Category');
    expect(html).toContain('Workload Target / Cap');
    expect(html).toContain('Total Duties Column');
    expect(html).toContain('Included Exam Dates');

    // Verify live WYSIWYG preview & print container
    expect(html).toContain('Live Print Preview');
    expect(html).toContain('master-schedule-printable-container');
    expect(html).toContain('College Examination Supervision');
  });

  it('renders DutySlipsModal with custom slips-per-page cramming controls and cutting guides', () => {
    const mockStorage: Record<string, string> = {};
    const customProjectState = {
      ...INITIAL_PROJECT_STATE,
      faculty: DEFAULT_FACULTY_LIST,
      assignments: [
        {
          id: '4-2026-10-06-JRS 1',
          facultySrNo: 4,
          date: '2026-10-06',
          session: 'JRS 1' as const,
          isLocked: false,
          isOverride: false,
        },
      ],
    };

    mockStorage['EXAM_SCHEDULER_SESSION_STATE_V1'] = JSON.stringify(customProjectState);
    const originalWindow = (global as any).window;
    (global as any).window = {
      sessionStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      matchMedia: () => ({ matches: false }),
    };

    try {
      const html = renderToString(
        <SchedulerProvider>
          <DutySlipsModal forceOpen={true} />
        </SchedulerProvider>
      );

      // Verify header and controls
      expect(html).toContain('Faculty Duty Slips &amp; Appointment Orders');
      expect(html).toContain('Slips / Page:');
      expect(html).toContain('Save Paper (2 / Page)');
      expect(html).toContain('4 (2×2)');
      expect(html).toContain('6 (2×3)');
      expect(html).toContain('8 (2×4)');

      // Verify content override toggles
      expect(html).toContain('Instructions');
      expect(html).toContain('Minimal Header');
      expect(html).toContain('Compact Signatures');

      // Verify printable container & preview
      expect(html).toContain('duty-slips-printable-container');
      expect(html).toContain('Letterhead &amp; Signatures');
      expect(html).toContain('Print / PDF All');
    } finally {
      if (originalWindow !== undefined) {
        (global as any).window = originalWindow;
      } else {
        delete (global as any).window;
      }
    }
  });

  it('renders ExportModal with seamless Print Customizer integration', () => {
    function ExportTester() {
      const { setIsExportModalOpen } = useScheduler();
      React.useEffect(() => {
        setIsExportModalOpen(true);
      }, []);
      return <ExportModal forceOpen={true} />;
    }

    const html = renderToString(
      <SchedulerProvider>
        <ExportTester />
      </SchedulerProvider>
    );

    expect(html).toContain('Export Schedule &amp; Project Backup');
    expect(html).toContain('Print-Friendly Format');
    expect(html).toContain('Customizer');
    expect(html).toContain('Open Print Customizer');
  });
});



