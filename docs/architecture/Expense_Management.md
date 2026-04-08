# Expense Management Domain

## Core Purpose
The Expense Management Domain operates as an automated financial analyst and bookkeeper tailored for student life. It is built to passively calculate budgets, predict safe daily allowances, manage recurring subscriptions, and seamlessly digitize physical/digital receipts using advanced AI OCR—completely abstracting the anxiety of "how much can I spend today?"

## File Dependencies
- **`src/services/expenseService.ts`**: The monolithic engine for handling backend financial logic. It dictates budget rolling, receipt OCR handling, parsing, recurring subscription logic, and database interactions.
- **`src/hooks/useExpenseDashboard.ts`**: The UI state controller. Calculates financial insights dynamically (burn rate, safe daily allowance), formats visual dashboard states, and manages the temporary "undo-delete" transaction buffer.

## Step-by-Step Logic Execution
### 1. The Pacing Engine & Dashboard Load
Upon entering the dashboard, `useExpenseDashboard.ts` runs a `fetchData` sweep compiling daily expenditures. It passes these figures through the memoized `insights` engine to output a `pacingStatus` (e.g., On Track, Warning, Danger)—a mathematical breakdown comparing `spentTheMonth / daysPassed` vs `budgetTotal / daysInMonth`. 
### 2. Receipt OCR Pipeline (RECEIPT-GPT)
When a user takes a photo of a receipt, the image is passed to `processReceipt` inside `expenseService.ts`. It's handed to the Gemini multimodal model across a 4-step instruction chain:
1. Complete OCR scanning.
2. Structure extraction (finding Total, Date, Vendor).
3. Reconciliation (auditing text vs integers).
4. Self-Audit (ensuring category estimation makes sense).
The AI returns a perfect JSON object that pops up for the user to confirm before pushing to the ledger.
### 3. Chronological Budget Rolling (Cron Alternative)
Each time the app loads, `expenseService.ts` triggers a background check: `processDueSubscriptions`. Because Supabase Edge Functions aren't yet mapped to a CRON scheduler, this client-side "pseudo-cron" identifies any subscriptions marked `is_recurring: true` that have passed their billing date, auto-inserts the resulting transactions into the `expenses` ledger, and rolls the billing anchor date up a month.
### 4. Transactions with Undo-Buffer
Deleting an expense doesn't immediately send a DELETE command to Supabase. `useExpenseDashboard.ts` initiates an optimistic update—removing it from the UI, updating the totals instantly, and starting a 3000ms timeout buffer allowing the user to "Undo". Only after the buffer expires does the DB execute the destructive call.

## State Management
- **Dashboard Summary State:** `spent`, `budget`, `safeDailySpend` are reactively bound variables.
- **Transaction Lists:** `expenses` array powers the user's ledger view.
- **Temporal/Buffer State:** Optimistic update queues managing the "Undo" paradigm without blocking UI rendering.
- **Progress Animation State:** Variables tracking the fluid progress ring fills relative to budget saturation.

## Database Interactions
**Database Used:** Supabase PostgreSQL with Row Level Security (RLS).
- **Table `expenses`**: The master ledger table tracking `amount`, `vendor`, `category` (Needs vs Wants vs Subscriptions) and physical attachment links (`receipt_url`).
- **Table `subscriptions`**: Maintains recurring cycle parameters (Monthly, Yearly), dates, amounts, and auto-renew flags.
- **Table `budgets`**: Single-row tracking per user establishing macro monthly anchors. 

## AI Integration Specifics
The financial heart relies on **Gemini 2.0 Flash (Multimodal capabilities)** running via the `aiProxy.ts` Edge Function. The prompt enforces strict hallucination avoidance: "CRITICAL: Do NOT guess numbers. Only extract values visually present in the image." The model is asked directly for categorizations like "Groceries", "Entertainment", or "Transit", utilizing AI context-understanding rather than rigid RegExp parsing which would immediately fail on crumpled physical receipts.
