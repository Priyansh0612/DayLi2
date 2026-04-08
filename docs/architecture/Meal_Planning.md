# Meal Planning Domain

## Core Purpose
The Meal Planning domain is engineered to eliminate decision fatigue, reduce food waste, and adhere to a student's budget constraints by intelligently automating weekly meals. It operates as an "AI Chef" that knows not just what groceries a student has, but also what their actual schedule looks like. Thus, meals aren't randomly generated—they are contextually anchored around available gaps in the user's daily academic/work schedule.

## File Dependencies
- **`src/utils/mealService.ts`**: The core orchestration engine. It triggers the weekly meal plan sequence, fetches user dietary restrictions, processes leftover distributions, and commits the finalized plan to the database.
- **`src/utils/aiChefService.ts`**: Dedicated strictly to the generative AI pipeline. It handles dynamic recipe creation, applies caching mechanisms to circumvent redundant tokens, and ensures strictly mapped Gemini outputs.

## Step-by-Step Logic Execution
### 1. Generating the "Student Week" Template
The process kicks off in `mealService.ts` inside `generateStudentWeek`. The algorithm doesn't ask the AI to blindly invent 21 meals. Instead, it mathematically creates a skeletal template of the week, deciding *where* cooking can happen and *where* leftovers should be utilized based on real-world constraints (e.g., cooking on Sunday means Monday lunch is leftovers).
### 2. Formulating the AI Prompt
The engine queries the user's profile for specific `allergies` and `dietary_preferences` (e.g., Vegan, Gluten-Free). Using the skeletal week structure, the prompt instructs the AI model to fill in the blanks with recipes that strictly avoid the allergens and fit the user's kitchen tools and schedule.
### 3. AI Generation
In `aiChefService.ts`, the model processes the strict prompt and generates a list of meal titles and concise preparation strategies, maintaining continuity (ensuring ingredients carry over between days to reduce waste). The output is strictly formatted JSON.
### 4. Fetching Step-By-Step Instructions (Global Cache Pattern)
When a user clicks on an AI-generated meal title for step-by-step instructions (`generateInstructions`), the app searches the global Supabase `recipes` table first. If someone across the community already generated "Spicy Peabo Casserole", DayLi pulls the cached data to save API tokens and reduce wait time by 90%. If it's novel, the AI Chef writes the recipe, scrubs the title, and uploads it to the global cache library for future users.

## State Management
- **Meal Plan Template State:** A local matrix tracking the week from Monday–Sunday (`{ Monday: { Breakfast, Lunch, Dinner } ... }`).
- **Generation Loading State:** Booleans tracking the high-latency AI requests, controlling animated loaders.
- **Dietary Arrays:** Arrays (`allergies`, `preferences`) injected dynamically.

## Database Interactions
**Database Used:** Supabase PostgreSQL with Row Level Security (RLS).
- **Table `profiles`**: Holds the allergy string arrays and dietary restrictions.
- **Table `weekly_meal_plans`**: Stores the finalized structured week plan as a massive JSONB column `plan_data` against the `week_start_date`. Overwrites previous drafts withupsert logic based on the user and start date.
- **Table `recipes`** (Global Table): A master cache table avoiding redundant Gemini requests. Includes `title` (sanitized matching string), `ingredients`, `instructions`, and `macro_estimations`.

## AI Integration Specifics
Powered via **Gemini 2.0 Flash**, instructions are requested via the edge function proxy. A distinct feature of this domain is the **Contextual Anchoring**: the AI is constrained by `mealService.ts` to respect schedule tightness. For example, if a Tuesday has back-to-back classes with only 15-minute breaks, the generation algorithms automatically force Tuesday's Lunch to be a "Leftover" or "Wrap" requiring 0-prep time, thus aligning generative recipe creation to actual reality.
