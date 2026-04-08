# Intelligent Home Dashboard Domain

## Core Purpose
The Intelligent Home Dashboard is the nucleus of the DayLi application. It is where isolated domains—Academics, Expenses, Work, and Meals—collide on a single, responsive timeline. Its purpose is to aggregate daily responsibilities into an emotionally intelligent, fluid view, providing the user with a unified source of truth dynamically shifting based on the exact time of day.

## File Dependencies
- **`src/screens/HomeScreen.tsx`**: The massive (2000+ line) orchestration view bridging every system, loading the custom bento-grid layout, handling pull-to-refresh aggregates, determining collisions, and painting the unified schedule.
- **`src/hooks/useLiveTime.ts`**: The active heartbeat of the application. An ultra-perfomant clock triggering second-by-second updates, automatically adjusting visual styling (Morning/Afternoon/Evening) and firing refreshes on AppState foregrounding.

## Step-by-Step Logic Execution
### 1. The Super Fetch
When the Home screen mounts, it doesn't wait sequentially. The `onRefresh` function triggers an aggressive `Promise.all` combining `fetchSchedule`, `fetchExpenses`, `fetchWeeklyWork`, `fetchWeather`, and `fetchSetupFlags`. It merges thousands of data points at once.
### 2. Time Engine & Unified Timeline
`HomeScreen.tsx` parses all different components (Classes, Work Shifts, Custom Events) into identical interface blocks mapping their `dateObj` parameters into an absolute millisecond-based timeline. It inherently sorts everything chronologically. 
### 3. Smart Meal Anchoring (Contextual injection)
Inside `fetchSchedule`, the `generateSmartMeals` engine runs. It reviews the timeline built thus far. If the student has back-to-back classes spanning the typical lunch hour, it compresses lunch into a 15-minute "Quick Bite" right at the class transition. It then injects this generated timeline block seamlessly back into the array.
### 4. Overlap & Collision Management
If a user creates an override block from the dashboard, `checkCollisions` iterates via time-bounds checking (`proposedStart < pillar.endDateObj && proposedEnd > pillar.dateObj`). "Hard" pillars (Work, Academics) throw total blocks. "Soft" fluid blocks (Meals, Custom study) throw overlapping warnings offering readjustments.
### 5. Visual "Vibe" Calculation 
Powered by `useLiveTime.ts`, if the hour crosses strict thresholds (e.g., `< 12` Morning, `< 17` Afternoon), variables dynamically override React Native generic UI settings, updating breathing orb opacity arrays via Reanimated animations.

## State Management
- **Aggregated Collections:** Arrays like `todayClasses`, `todayWork`, `todayMeals`, `customEvents` act as buffers before combining.
- **FTUE Triggers:** Booleans (`hasAnyCourses`, `hasFinanceSetup`) determining if the master Home Screen defaults to standard view or aggressively promotes onboarding cards via Setup Checklists.
- **Clock Matrix:** Live temporal integers cascading updates over React Native components seamlessly without trashing memory.

## Database Interactions
**Database Used:** Supabase PostgreSQL with Row Level Security (RLS).
This is the heaviest read-load location in the application.
- It simultaneously queries `courses`, `classes`, `assessments`, `work_shifts`, `weekly_meal_plans`, `custom_events`, `semesters`, and `budgets/expenses`.
- Instead of using a giant join, the application parses parallel reads mapping explicit date filtering locally to optimize bandwidth vs frontend assembly.
- Uses an external API `api.open-meteo.com` to grab geolocation-based local weather constraints.

## AI Integration Specifics
The Home Dashboard sits downstream of AI processes. While it doesn't invoke large language models directly on load, its layout heavily depends on AI outputs (e.g. AI parsed syllabus outputs feeding the schedule, AI generated recipe blocks displaying in meal suggestions). It integrates "smart gap detection" to prompt the user to use an AI generated custom event (e.g. suggesting study times based off an upcoming exam pulled from AI OCR).
