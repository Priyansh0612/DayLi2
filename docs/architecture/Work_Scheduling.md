# Work Scheduling Domain

## Core Purpose
The Work Scheduling Domain balances the financial necessity of part-time jobs against the threat of academic burnout and legal limitations for international students. It algorithmically acts as an intermediary, processing a user's academic commitments to dynamically generate optimal, legal, and healthy availability windows to submit to employers, eliminating the stress of manual shift calculations.

## File Dependencies
- **`src/services/availabilityEngine.ts`**: The rule-based algorithm sandbox dictating work legality, snapping rules, gap detection, commute buffers, and target hour warnings.
- **`src/hooks/useWorksDashboard.ts`**: The orchestration hooks linking the user's database shifts to the availability UI, handling PDF generation, conflict detection against the academic timetable, and shift editing logic.

## Step-by-Step Logic Execution
### 1. Preferences & Validation
The engine (`availabilityEngine.ts`) first pulls user demographics and rules (`targetHours`, `commuteMins`, `isInternationalStudent`). The `validateTargetHours` firewall evaluates if `isInternationalStudent` is true, hard-capping generated hours at 24. If domestic, limits above 30 hours trigger a soft burnout alert. 
### 2. Matrix Flattening
`useWorksDashboard.ts` feeds the academic classes into `generateAvailability`. For each day, the engine maps class blocks, then bloats each block outwards by `commuteMins`—acting as an impenetrable shield around class time.
### 3. Smart Gap Generation 
With classes blocked off on a flat timeline (from `06:00` to `24:00`), the engine searches for "free gaps". It dynamically rounds these gaps using a 15-minute grid snappers (`snapStartUP`, `snapEndDOWN`) to ensure clean start times. If an empty window is smaller than `CONFIG.minShift` (e.g. 4 hours), it kills the gap, as an employer won’t schedule a 1-hour shift.
### 4. Availability Declaration (Export)
The finalized generated `TimeSlot` structures are presented to the user. Using `expo-print` in `useWorksDashboard.ts`, these times are dynamically formatted into an official HTML-based PDF document reading "Availability Declaration", providing a clean, shareable summary the user can send via `expo-sharing` directly to their manager.
### 5. Manual Shift Overrides & Conflict Detection
When adding a manual shift, `useWorksDashboard.ts` cross-references target shift times against underlying academic classes and existing records, blocking submission if a hard overlap triggers a `Conflict` alert.

## State Management
- **Work Rule Set State:** Stores user variables (`WorkPreferences`) tracking commute buffers and days-off constraints.
- **Shift Ledgers:** Arrays representing `existingShifts`, the generative `availBlocks`, and the unified `schedule`.
- **Edit Modal state:** Coordinates edit forms, managing `editStart`, `editEnd`, and complex unsubmitted changes buffers (`hasUnsavedChanges`). React Native's `usePreventRemove` is dynamically bound to this to warn users if they navigate away before saving shifting blocks.

## Database Interactions
**Database Used:** Supabase PostgreSQL with Row Level Security (RLS).
- **Table `profiles`**: Holds fundamental configuration values (`target_work_hours`, `commute_time_mins`, `days_off`, `is_international_student`).
- **Table `work_shifts`**: Dual-purpose ledger storing both employer-confirmed `type: 'shift'` entries and generative pending windows `type: 'availability'`.
- **Table `courses / classes`**: Queried via join to extract the academic firewall blocks against which work availability is generated.

## AI Integration Specifics
**No Direct Generative AI.** This domain utilizes deterministic, rules-based logic inside `availabilityEngine.ts`. Because work availability directly involves legal limitations (Visa constraints) and explicit academic overlap, introducing generative AI hallucinations would be dangerous to the user's livelihood. It relies purely on strict mathematics and conditional block rendering.
