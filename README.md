# Examination Supervision Scheduler

A production-grade, constraint-based mathematical web application for allocating college examination supervision duties to faculty members. Built with React 19, TypeScript, Tailwind CSS, Lucide icons, and mathematical constraint optimization algorithms.

---

## 🌟 Key Features

### 1. Robust Constraint-Based Scheduling Engine
- **Mathematical Equilibrium**:
  - Automatically balances periods such as 6 examination dates $\times$ 57 required positions/day = 342 total duties.
  - Regular faculty: 6 duties each ($49 \times 6 = 294$).
  - HODs (Heads of Department): 4 duties each ($12 \times 4 = 48$).
  - Total Faculty Capacity: $294 + 48 = 342$ positions.
- **Arrival Category Constraints**:
  - **Morning Arrival**: Eligible for JRS 1 and JRS 2.
  - **Mid Arrival**: Eligible for JRS 1, JRS 2, and JRS 3.
  - **Afternoon Arrival**: Eligible for JRS 2 and JRS 3.
- **Fatigue & Operational Rules**:
  - Maximum **2 supervisions per faculty per day**.
  - **Rest Period Protection**: Faculty assigned to JRS 1 cannot supervise JRS 3 on the same day without an explicit administrator override.
  - Daily minimum spacing and balanced distribution across exam dates.
- **5 Distinct Alternative Schedules**:
  - Generates 5 mathematically valid alternative schedules scored by balance and variance, with pairwise similarity metrics.
- **Rebalance Engine with Lock Preservation**:
  - Swap and fill solver that strictly respects locked assignments and administrator overrides while repairing invalid slots.

---

### 2. Flexible HOD Reassignment
- **1-Click Inline Toggle**: Click any faculty member's "HOD" badge in the table to instantly toggle between Regular and HOD designation.
- **Dedicated Reassign HODs Modal**:
  - Search, filter, promote, or demote department heads in seconds.
  - Customize individual HOD workload limits (default: 4, adjustable to any number).
  - Real-time capacity balance indicator calculating net delta against period requirements.

---

### 3. Faculty Duty Inclusion / Exclusion
- **Exclude without Deleting**: Temporarily mark faculty members as excluded (e.g., sabbatical, medical leave, external deputation).
- **Audit & Reason Tracking**: Store explicit reasons for exclusion with timestamps.
- **Live Solver & Diagnostics Update**:
  - Excluded faculty are immediately exempt from duty allocations.
  - Dashboard and Infeasibility Analyzer automatically detect capacity shortfalls and provide targeted remedies.

---

### 4. Custom JRS Sessions & Dynamic Timings
- **Add Additional Sessions**:
  - Add JRS 4, Evening Sessions, or specialized practical exam sessions.
  - Configure default supervisor counts, timings (e.g., `16:30` - `18:30`), and eligible arrival categories (Morning, Mid, Afternoon).
- **Change Schedule & Timings**:
  - Edit session start and end times globally or per exam date.
  - Staffing requirements update dynamically across all matrix and timetable views.

---

### 5. Multi-Format Export & Print
- **Excel Spreadsheet (`.xlsx`)**: Comprehensive workbook with Master Timetable, Faculty Workload summaries, and Daily Session Rosters.
- **CSV**: Standard comma-separated values ready for LMS/ERP import.
- **JSON**: Full state backup with one-click restore.
- **Official Print Views**: Clean, formatted print layouts with signature blocks for Principal and Chief Superintendent.

---

## 🚀 Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/examination-supervision-scheduler.git
   cd examination-supervision-scheduler
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

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🌐 Deploying to GitHub Pages

The application is fully configured for automated GitHub Pages hosting with relative asset paths (`base: './'`) and a pre-configured GitHub Actions workflow.

### Simple 3-Step Setup:

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Examination Supervision Scheduler"
   git branch -M main
   git remote add origin https://github.com/<your-username>/examination-supervision-scheduler.git
   git push -u origin main
   ```

2. **Enable GitHub Actions for Pages in GitHub**:
   - Go to your repository on GitHub.
   - Navigate to **Settings** $\rightarrow$ **Pages** (under Code and automation).
   - Under **Build and deployment** $\rightarrow$ **Source**, choose **GitHub Actions**.

3. **Automatic Deployment**:
   - Every time you push to `main` (or `master`), the workflow at `.github/workflows/deploy.yml` will automatically build the application and deploy it to:
     ```
     https://<your-username>.github.io/examination-supervision-scheduler/
     ```

---

## 📂 Project Architecture

```
examination-supervision-scheduler/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Pages CI/CD workflow
├── src/
│   ├── components/
│   │   ├── AlternativesModal.tsx     # 5 Alternative schedules browser
│   │   ├── AvailabilityManager.tsx   # Faculty leave & blackout calendar
│   │   ├── Dashboard.tsx             # Executive summary & quick actions
│   │   ├── ExamPeriodManager.tsx     # Date roster & dynamic session requirements
│   │   ├── FacultyManager.tsx        # CSV upload, HOD toggle & exclusion filters
│   │   ├── ManualEditModal.tsx       # Slot assignment override & swap tool
│   │   ├── Navbar.tsx                # App navigation & generation trigger
│   │   ├── ReassignHodsModal.tsx     # Department HOD reassignment & workload cap
│   │   ├── ScheduleViewer.tsx        # Master grid, daily view & workload view
│   │   └── SessionManagerModal.tsx   # Dynamic JRS sessions & timing editor
│   ├── context/
│   │   └── SchedulerContext.tsx      # Global state, auto-save & actions
│   ├── data/
│   │   └── defaultData.ts            # Default 61-faculty dataset & 342-slot baseline
│   ├── services/
│   │   ├── export/                   # XLSX, CSV, JSON export & print generator
│   │   ├── scheduler/                # Constraint solver, alternatives & rebalance
│   │   ├── storage/                  # LocalStorage & persistence
│   │   └── validation/               # Hard/soft constraint validation & infeasibility
│   ├── types/
│   │   └── index.ts                  # Core TypeScript domain models
│   ├── App.tsx                       # Root application view
│   └── main.tsx                      # React root entry
├── vite.config.ts                    # Vite config with base: './' for GitHub Pages
└── package.json                      # Scripts and dependencies
```

---

## ⚖️ Mathematical Proof & Infeasibility Diagnostics

When capacity or constraints make a 100% allocation impossible (e.g. if too many faculty are excluded or on leave), the built-in **Infeasibility Diagnostic Analyzer** explains the exact root cause:
- Shows Total Capacity vs. Total Required positions.
- Flags specific arrival shortages (e.g., insufficient Morning faculty for JRS 1).
- Suggests concrete, actionable remediations: reducing session quotas, re-including faculty, or granting temporary arrival overrides.
