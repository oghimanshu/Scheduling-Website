import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchedulerProvider, useScheduler } from '../context/SchedulerContext';
import { FacultyManager } from '../components/FacultyManager';
import { ExamPeriodManager } from '../components/ExamPeriodManager';
import { RoleManagerView } from '../components/RoleManagerView';
import { RoomManager } from '../components/RoomManager';
import {
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuDivider,
  ContextMenuHeader,
} from '../components/ContextMenuPopup';
import { ExamRoom, ProjectState } from '../types';
import { INITIAL_PROJECT_STATE, DEFAULT_DATES_CONFIG } from '../data/defaultData';
import { ConflictsInspectorModal } from '../components/ConflictsInspectorModal';

describe('Universal Add New and Right-Click UI Components', () => {
  it('renders FacultyManager with Add Faculty button and context menu integration', () => {
    const html = renderToString(
      <SchedulerProvider>
        <FacultyManager />
      </SchedulerProvider>
    );

    // Verify Add Faculty button and modal triggers exist
    expect(html).toContain('ADD FACULTY');
    expect(html).toContain('Faculty Master Data');
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders ExamPeriodManager with Add Single Date button and context menu triggers', () => {
    const html = renderToString(
      <SchedulerProvider>
        <ExamPeriodManager />
      </SchedulerProvider>
    );

    // Verify Add Single Date button and date generator exist
    expect(html).toContain('ADD SINGLE DATE');
    expect(html).toContain('GENERATE DATES');
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders RoleManagerView with Add Role Tier button and context menus', () => {
    const html = renderToString(
      <SchedulerProvider>
        <RoleManagerView />
      </SchedulerProvider>
    );

    // Verify Add Role Tier button exists
    expect(html).toContain('ADD ROLE TIER');
    expect(html).toContain('Batch Faculty Role Assignment');
    expect(html).toContain('Role Tiers &amp; Quota Definitions');
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders RoomManager with Add Hall and context menus', () => {
    const html = renderToString(
      <SchedulerProvider>
        <RoomManager />
      </SchedulerProvider>
    );

    expect(html).toContain('Exam Rooms &amp; Examination Halls');
    expect(html).toContain('Add Room / Hall');
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders ContextMenuPopup with header, items, shortcuts, and dividers correctly', () => {
    const html = renderToString(
      <ContextMenuPopup
        isOpen={true}
        position={{ x: 100, y: 150 }}
        onClose={() => {}}
      >
        <ContextMenuHeader title="Test Object" subtitle="Category • Details" />
        <ContextMenuItem
          label="Edit Item"
          shortcut="Double-click"
          onClick={() => {}}
        />
        <ContextMenuItem
          label="Delete Item"
          variant="danger"
          onClick={() => {}}
        />
        <ContextMenuDivider />
      </ContextMenuPopup>
    );

    expect(html).toContain('Test Object');
    expect(html).toContain('Category • Details');
    expect(html).toContain('Edit Item');
    expect(html).toContain('Double-click');
    expect(html).toContain('Delete Item');
  });

  it('context provider correctly initializes addFaculty, addExamDate, and addCustomRole functions', () => {
    let functionsDefined = false;

    const TestInspector = () => {
      const {
        addFaculty,
        updateFaculty,
        deleteFaculty,
        addExamDate,
        updateExamDate,
        deleteExamDate,
        addCustomRole,
        updateCustomRole,
        deleteCustomRole,
      } = useScheduler();

      if (
        typeof addFaculty === 'function' &&
        typeof updateFaculty === 'function' &&
        typeof deleteFaculty === 'function' &&
        typeof addExamDate === 'function' &&
        typeof updateExamDate === 'function' &&
        typeof deleteExamDate === 'function' &&
        typeof addCustomRole === 'function' &&
        typeof updateCustomRole === 'function' &&
        typeof deleteCustomRole === 'function'
      ) {
        functionsDefined = true;
      }

      return <div>Verified</div>;
    };

    renderToString(
      <SchedulerProvider>
        <TestInspector />
      </SchedulerProvider>
    );

    expect(functionsDefined).toBe(true);
  });

  it('renders ConflictsInspectorModal with filter tabs and conflict inspector details', () => {
    const htmlWithModal = renderToString(
      <SchedulerProvider>
        <ConflictsInspectorModal forceOpen={true} />
      </SchedulerProvider>
    );

    expect(htmlWithModal).toContain('Schedule Conflicts &amp; Rule Violations');
    expect(htmlWithModal).toContain('All (');
    expect(htmlWithModal).toContain('Hard Conflicts');
    expect(htmlWithModal).toContain('Close Inspector');
    expect(htmlWithModal.length).toBeGreaterThan(100);
  });

  it('provides cleanExcludedDateAssignments and prevents scheduling on excluded non-exam dates', () => {
    let cleanFnDefined = false;
    let assignmentPrevented = false;

    const mockProjectState: ProjectState = {
      ...INITIAL_PROJECT_STATE,
      faculty: [
        {
          srNo: 16,
          name: 'Faculty 16',
          arrival: 'Morning',
          isHod: false,
          targetSupervisions: 4,
          maxSupervisions: 4,
          previousSupervisions: 0,
        },
      ],
      examPeriod: {
        name: 'Test Period',
        startDate: '2026-10-05',
        endDate: '2026-10-12',
        dates: DEFAULT_DATES_CONFIG,
      },
    };

    const ExcludedDateTest = () => {
      const { cleanExcludedDateAssignments, addOrUpdateAssignment } = useScheduler();
      if (typeof cleanExcludedDateAssignments === 'function') {
        cleanFnDefined = true;
      }

      // 2026-10-05 is an excluded date in DEFAULT_DATES_CONFIG
      const res = addOrUpdateAssignment(16, '2026-10-05', 'JRS 2');

      if (!res.success && res.error?.includes('non-examination / holiday date')) {
        assignmentPrevented = true;
      }

      return <div>Clean Excluded Date Test</div>;
    };

    renderToString(
      <SchedulerProvider initialProjectState={mockProjectState}>
        <ExcludedDateTest />
      </SchedulerProvider>
    );

    expect(cleanFnDefined).toBe(true);
    expect(assignmentPrevented).toBe(true);
  });
});

