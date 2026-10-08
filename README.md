# Examination Supervision Scheduler

A production-grade, constraint-based mathematical web application for allocating college examination supervision duties to faculty members. Built with React 19, TypeScript, Tailwind CSS, Lucide icons, and mathematical constraint optimization algorithms.

Designed and Developed by Himanshu Gaur.

---

## Key Features

### 1. Robust Constraint-Based Scheduling Engine
- **Mathematical Equilibrium**:
  - Automatically balances periods such as 6 examination dates * 57 required positions/day = 342 total duties.
  - Regular faculty: 6 duties each (49 * 6 = 294).
  - HODs (Heads of Department): 4 duties each (12 * 4 = 48).
  - Total Faculty Capacity: 294 + 48 = 342 positions.
- **Arrival Category Constraints**:
  - **Morning Arrival**: Eligible for JRS 1 and JRS 2.
  - **Mid Arrival**: Eligible for JRS 1, JRS 2, and JRS 3.
  - **Afternoon Arrival**: Eligible for JRS 2 and JRS 3.
- **Fatigue and Operational Rules**:
  - Maximum 2 supervisions per faculty per day.
  - **Rest Period Protection**: Faculty assigned to JRS 1 cannot supervise JRS 3 on the same day without an explicit administrator override.
  - Daily minimum spacing and balanced distribution across exam dates.
- **5 Distinct Alternative Schedules**:
  - Generates 5 mathematically valid alternative schedules scored by balance and variance, with pairwise similarity metrics.
- **Rebalance Engine with Lock Preservation**:
  - Swap and fill solver that strictly respects locked assignments and administrator overrides while repairing invalid slots.

---

### 2. Universal "Add New" Creation System (No CSV Required)
- **Direct Faculty Creation**:
  - Add new faculty members directly via the "+ ADD FACULTY" button.
  - Auto-suggests the next sequential Sr. No. (with manual override), allows setting role, arrival timing, previous duties, and target/max workload caps.
- **Single Examination Date Addition**:
  - Add single dates via "+ ADD SINGLE DATE" without needing to regenerate or wipe existing dates and assignments.
  - Configure individual session staffing quotas and mark holiday/non-examination days.
- **Custom Role Tier Creation**:
  - Add institutional role tiers (Deans, Associate Professors, Visiting Faculty) via "+ ADD ROLE TIER" with custom target supervisions, workload caps, and concessions.
- **Exam Room / Hall Creation**:
  - Add rooms with seating capacities, building block details, floor locations, and invigilator requirements.

---

### 3. Comprehensive Right-Click and Touch Long-Press Context Menus
- **Universal Desktop and Mobile Support**:
  - Full desktop right-click menu and 500ms touch long-press support for tablets and mobile touchscreens.
  - Glassmorphic popup menu with automatic viewport boundary clamping.
- **Faculty Rows**:
  - Edit Faculty Details (Name, Role, Arrival, Quotas).
  - Toggle Head of Department (HOD) status.
  - Manage Date Exclusions and Medical/Sabbatical Leave.
  - Print Individual Duty Slip.
  - Delete Faculty Member.
- **Exam Date Rows**:
  - Customize Timings and Quotas per session.
  - Toggle Active / Holiday status.
  - Duplicate Date.
  - Delete Exam Date.
- **Role Tier Cards**:
  - Edit Role Tier and Workload Caps.
  - Assign to Selected Faculty Members.
  - Filter Faculty Roster by Tier.
  - Delete Custom Role.
- **Exam Hall Rows**:
  - Edit Hall Details and Seating Capacity.
  - Toggle Active / Inactive Status.
  - Duplicate Hall.
  - Delete Hall.
- **Master Schedule Grid Cells and Duty Badges**:
  - Reassign to another faculty member.
  - Two-way duty swap with conflict prevention.
  - Promote to Primary Duty or Standby Reserve.
  - Lock/Unlock duty slot.
  - Mark specific session or entire day unavailable.
  - Edit faculty profile and allowed sessions.

---

### 4. Exam Rooms and Hall Invigilation Manager
- **Seating Capacity and Staff Quota Engine**:
  - Configure room seating capacities and invigilators required per hall.
- **Automated Room Distribution**:
  - One-click allocation distributes active halls across all scheduled duty sessions without altering existing faculty pairs.
- **Printable Noticeboard Room Chart**:
  - Formatted room-wise invigilation chart ready for campus noticeboards and examination control rooms.

---

### 5. Intuitive Guided Setup Wizard and File Drop Zones
- **Step-by-Step Guided Setup**:
  - Welcoming walkthrough guiding new administrators through faculty import, exam period configuration, and room allocations.
- **Universal Drag-and-Drop**:
  - Drop CSV files anywhere onto dedicated drop zones or the global backdrop.
  - Drag faculty rows onto role cards for instant batch role assignment.
  - Drag duties between faculty rows and dates on the master schedule grid.

---

### 6. Interactive Conflicts and Rule Violations Inspector
- **Header Conflict Locator**:
  - Clicking on the conflict badge in the navigation header opens the dedicated Conflicts &amp; Violations Inspector.
- **Deep Mathematical Rule Inspection**:
  - Filter by Hard Constraints (double bookings, daily caps, arrival violations, excluded holiday scheduling), Warnings (rest period breaches), and Unfilled Staffing Slots.
  - Search issues in real time by faculty name, Sr. No., date, or rule type.
- **1-Click Locate & Highlight on Schedule Grid**:
  - Instantly centers the viewport on the conflicting cell, switches to the faculty view, and applies an animated pulse ring.
- **Orphan Excluded Duty Cleanup**:
  - Automatically identifies and purges duties accidentally assigned to excluded holiday or non-examination dates.

---

### 7. Institutional Letterhead, Signatures, and Print Customizer
- **Institutional Branding**:
  - Upload college logo, header text, subtitle, and accreditation details.
- **Multi-Tier Signing Authorities**:
  - Configure signature blocks for Controller of Examinations, Dean, Chief Superintendent, and Principal with customizable presets (Single, Dual, Three-tier, Quad).
- **Comprehensive Print and Export Options**:
  - Export to Excel (.xlsx), CSV, and full state JSON backups.
  - Print individual duty slips, master schedule grids, and noticeboard room rosters with paper size and orientation controls.

---

### 8. Google Drive Sync and Zero-Setup Cloud Backup
- Backup and restore scheduling projects directly to Google Drive folders.
- Local browser auto-save ensures zero data loss between sessions.

---

### 9. Visual Polish and Accessibility
- **Apple VisionOS Glassmorphic Aesthetic**:
  - Modern translucent cards, specular lighting rims, and smooth spring physics.
- **Dark Mode with Ambient Animations**:
  - Dark mode featuring subtle animated cherry blossoms for a calm, distraction-free environment.
- **Pointer-Aware Scroll Isolation**:
  - Smooth Lenis scrolling with isolated scroll containers for dense data tables.

---

## Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/oghimanshu/Scheduling-Website.git
   cd "Scheduling Website"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Run unit and constraint verification tests:
   ```bash
   npm test
   ```

5. Build for production (single-file distribution):
   ```bash
   npm run build
   ```

---

## Deploying to GitHub Pages

The application is pre-configured for automated GitHub Pages hosting with relative asset paths (`base: './'`) and a pre-configured GitHub Actions workflow.

### Setup Steps:

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Update scheduler with universal add new and context menus"
   git push origin main
   ```

2. **Enable GitHub Actions for Pages in GitHub**:
   - Go to your repository on GitHub.
   - Navigate to **Settings** -> **Pages** (under Code and automation).
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.

3. **Automatic Deployment**:
   - Every push to `main` automatically builds the standalone application and deploys it to GitHub Pages.

---

## Project Architecture

```
Scheduling Website/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── src/
│   ├── components/
│   │   ├── AlternativesModal.tsx       # 5 Alternative schedules browser
│   │   ├── AvailabilityManager.tsx     # Faculty blackout calendar
│   │   ├── CherryBlossomBackground.tsx # Ambient canvas animations
│   │   ├── ContextMenuPopup.tsx        # VisionOS context menu popup & items
│   │   ├── Dashboard.tsx               # Executive metrics & engine overview
│   │   ├── DateSessionModal.tsx        # Single-date timing & quota customizer
│   │   ├── DutySlipsModal.tsx          # Individual faculty duty slip generator
│   │   ├── ExamPeriodManager.tsx       # Exam dates manager & direct date addition
│   │   ├── ExportModal.tsx             # XLSX, CSV, JSON export & backup
│   │   ├── FacultyManager.tsx          # Faculty roster, add faculty modal, CSV drop
│   │   ├── FileDropZone.tsx            # Reusable drag-and-drop file uploader
│   │   ├── GenerationOptionsModal.tsx  # Solver weights & constraints configuration
│   │   ├── GlobalFileDropzone.tsx      # Full-window drag-and-drop file receiver
│   │   ├── GoogleAuthModal.tsx         # Google Drive cloud sync integration
│   │   ├── InstructionsView.tsx        # System operational guidelines & steps
│   │   ├── LetterheadCustomizerModal.tsx# Institutional header & signature editor
│   │   ├── Navbar.tsx                  # Header navigation & generation trigger
│   │   ├── QuickstartWizardModal.tsx   # Step-by-step guided onboarding wizard
│   │   ├── RoleManagerView.tsx         # Tier definitions & drag-and-drop segregation
│   │   ├── RoomAllocationChartModal.tsx# Printable room-wise noticeboard chart
│   │   ├── RoomManager.tsx             # Seating capacities & hall assignment
│   │   ├── ScheduleContextMenu.tsx     # Duty cell contextual menu
│   │   ├── ScheduleViewer.tsx          # Master schedule grid & workload views
│   │   └── SwapFacultyModal.tsx        # Two-way duty exchange modal
│   ├── context/
│   │   └── SchedulerContext.tsx        # Global state, persistence & CRUD actions
│   ├── hooks/
│   │   ├── useContextMenu.ts           # Right-click & 500ms touch long-press hook
│   │   └── useScrollIsolation.ts       # Pointer-aware Lenis scroll isolation
│   ├── services/
│   │   ├── csvParser.ts                # Faculty CSV parsing & sample generation
│   │   ├── roomParser.ts               # Room CSV parsing & template generation
│   │   ├── export/                     # XLSX, CSV, JSON export engines
│   │   ├── scheduler/                  # Constraint optimization solver & rebalancing
│   │   └── validation/                 # Mathematical validation & diagnostics
│   ├── test/
│   │   ├── crudAndContextMenu.test.tsx # CRUD operations & context menu tests
│   │   ├── dragAndDrop.test.tsx        # Drag-and-drop transfer tests
│   │   ├── renderTabs.test.tsx         # Component rendering regression tests
│   │   ├── roomAllocation.test.ts      # Seating capacity & allocation tests
│   │   └── scheduler.test.ts           # Mathematical constraint verification tests
│   ├── types/
│   │   └── index.ts                    # TypeScript domain interfaces
│   ├── App.tsx                         # Root layout with Himanshu Gaur attribution
│   └── main.tsx                        # React application entry point
├── vite.config.ts                      # Singlefile build & dev HTML synchronization
└── package.json                        # Scripts and dependencies
```

---

## Mathematical Proof and Infeasibility Diagnostics

When capacity or constraints make a 100% allocation mathematically impossible (e.g. if too many faculty are on leave or arrival quotas conflict), the built-in **Infeasibility Diagnostic Analyzer** explains the exact root cause:
- Displays Total Capacity vs. Total Required positions.
- Flags specific arrival shortages (e.g., insufficient Morning faculty for JRS 1).
- Suggests concrete, actionable remediations: reducing session quotas, re-including faculty, or granting temporary arrival overrides.

---

## License & Attribution

Designed and Developed by **Himanshu Gaur**.
Distributed under the MIT License.
