# Academics Domain

## Core Purpose
The Academics domain is the foundational pillar of the DayLi application. It is designed to empower students by intelligently managing their academic life. This domain acts as a central hub for tracking courses, parsing complex syllabus PDFs into structured data, calculating academic pacing and weights, detecting scheduling conflicts, and sourcing real-time term dates (e.g., Reading Weeks) from the community. It automatically identifies upcoming exams or heavy workload weeks, bridging the gap between passive calendar apps and an active "academic assistant."

## File Dependencies
- **`src/hooks/useCourses.ts`**: Orchestrates global course state, community-sourced term updates, and atomic database persistence (upserting courses, classes, and assessments).
- **`src/hooks/useCourseDetails.ts`**: Handles granular, course-specific CRUD logic, grade tracking (current vs. potential grades), motivation engine calculation, and conflict validation (e.g., overriding overlapping classes).
- **`src/utils/aiService.ts`**: Provides the AI pipeline, proxying the Gemini system via Edge Functions to extract academic structured data specifically from course syllabus PDFs.

## Step-by-Step Logic Execution
### 1. Syllabus Parsing (AI Pipeline) 
When a user uploads a syllabus PDF, the app converts the file into Base64 and transmits it to `extractCourseFromPDF` in `aiService.ts`. The AI proxy then executes a multi-pass prompt (`"You are an expert academic assistant..."`) forcing Gemini to output strict JSON fitting the `CourseData` schema. It self-verifies confidence scores and extracts lectures, locations, professor info, assessments (with their weights), and grading schemas.
### 2. Saving the Course & Intelligent Term Linking
Upon confirmation, `saveCourseToSupabase` (in `useCourses.ts`) begins by checking if the university/term pattern matches a known "Community Knowledge" term. If it does, and a reading week is known (e.g. `is_reading_week: true`), it automatically integrates those dates. 
### 3. Cascading Database Strategy
Course creation is executed atomically:
- It creates/updates the parent `courses` row.
- It loops through extracted `classes` and ties them to the course via Foreign Key constraints.
- It inserts `assessments`, transforming string dates to proper DB timestamp fields tracking assignment weights and types (exam, quiz, assignment).
### 4. Conflict Resolution
If a newly inserted class block overlaps with an existing class, `useCourseDetails.ts` intercepts the change, fires a warning modal using the conflict array, and prompts the user whether they want to override the schedule or drop the older class.
### 5. Progress Tracking (Motivation Engine)
For a specific course view, `useCourseDetails.ts` manages a real-time calculation of marks. It recalculates the `currentGrade`, `maxPossibleGrade`, and `completedWeight` on-the-fly dynamically mapping against the grading schema parsed from the AI document.

## State Management
- **Course List State:** Managed globally or via `useCourses` state array tracking the user's high-level roster of `Course` interfaces.
- **Form/Edit State:** `useCourseDetails.ts` bounds temporary UI changes to isolated state variables (`editedCourse`, `editedClasses`, `editedAssessments`), avoiding DB writes until the user taps "Save".
- **Conflict State:** Stored locally in arrays (`setConflicts([ ... ])`) to control modal visibility and prompt user intervention over schedule collisions.
- **Grades/Weights:** Calculated reactively. `completedWeight` and `currentGrade` are memoized values tracking progress dynamically based on assessment checkbox/status updates.

## Database Interactions
**Database Used:** Supabase PostgreSQL with Row Level Security (RLS).
- **Table `courses`**: Stores `id`, `name`, `code`, `user_id`. CRUD handled via atomic operations linking to user's auth token.
- **Table `classes`**: Stores weekly schedule blocks (`day_of_week`, `start_time`, `end_time`, `type`), cascading deletion upon course removal.
- **Table `assessments`**: Stores due dates and heavy-lifting grading metadata (`weight`, `marks_earned`, `is_completed`).
- **Table `terms` (Sourced via API)**: Cross-references community patterns for term holidays.

## AI Integration Specifics
The domain heavily utilizes **Gemini models** (e.g., `gemini-2.0-flash`) accessed exclusively via a server-side **Supabase Edge Function** proxy `aiProxy.ts` extending the `aiService.ts`. This ensures `EXPO_PUBLIC_GEMINI_API_KEY` remains secure. The AI operates in a rigid JSON format mode (`response_mime_type: "application/json"`), ensuring predictably structured object extraction. It's designed to self-audit and correct any missed syllabus dates during the extraction chain.
