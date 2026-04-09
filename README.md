<div align="center">

<img src="assets/Logo.png" width="140" alt="DayLi Logo" />

# DayLi - Your Student Life, Organized.

*An AI-Powered Lifestyle Operating System for the Modern Student*

<br/>

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

<br/>

</div>

---

## 📖 Overview

Student life is inherently fragmented. A dozen disjointed apps — a static calendar, a bare-bones budget tracker, a recipe app, a shift manager — each demand attention in isolation, forcing students to manually synthesize their constraints and expend cognitive energy just to *plan* their day.

**DayLi eliminates that fragmentation.**

It is a **context-aware, AI-augmented operating system** that unifies four critical life domains — Academics, Meal Planning, Expense Management, and Work Scheduling — into a single, high-fidelity, chronologically synchronized timeline.

DayLi doesn't just record your life. It **understands** it. By deeply integrating Google's Gemini AI, the app graduates from being a passive planner to an **active daily assistant** — one that reads your syllabi, audits your receipts, plans your meals, and protects your schedule, automatically.

---

## ✨ Core Features

### Unified Command Dashboard
The centerpiece of DayLi. Every domain feeds into a single, intelligent timeline that renders your entire day in chronological order. The **Smart Gap Detector** actively identifies free windows between classes and flags them as opportunities for study, meals, or work — before you even think to look.

### Academic Module — *AI Syllabus Parser*
Ditch manual data entry. Drop a PDF course outline and let Gemini do the rest. The parser intelligently extracts:
- Class schedules (multi-day slots split correctly)
- Assessment titles, types, weights, and due dates
- Professor info, office hours, room locations, and reading week
- Support for multi-stream / variant courses with different grading schemes

A 50-point structural validation prompt ensures **zero hallucinations** and week-for-week calendar accuracy.

### Meal Planning — *Dietary Intelligence Engine*
A full-stack nutrition assistant that adapts to your preferences:
- **AI Chef**: Generates personalized 7-day menus based on your dietary profile (Veg / Vegan / Keto / Non-Veg)
- **Global Recipes Cache**: Shared across all users to eliminate repeat AI calls — zero-cost, instant cache hits
- **Smart Grocery Sync**: One tap converts your weekly menu into a categorized, aisle-ready shopping list

### Work Module — *Conflict-Free Availability Engine*
Built for students who work. The availability engine uses matrix arithmetic to cross-reference class schedules against work constraints:
- Generates **"Safe-to-Work"** time blocks in real time
- Factors in configurable **commute buffers** to prevent physical conflict
- Instant **collision detection** rejects shifts that overlap with academic obligations

### Finance Module — *RECEIPT-GPT OCR Pipeline*
Transforms paper receipts into structured financial data in seconds:
- **Snap → Extract → Audit**: Camera triggers a 4-step Gemini reconciliation: reject non-receipts, extract itemized arrays, compute tax, execute a self-audit (`Σ items ≈ subtotal`) before persisting
- **Rolling Budgets**: Track Essentials vs. Lifestyle spending visually against monthly limits
- **Granular Transaction Log**: Full historical ledger with category iconography and pagination

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DayLi Client Layer                        │
│          React Native · Expo · NativeWind · Reanimated       │
│  ┌───────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ Academics │ │    Meals    │ │    Work    │ │ Expenses │  │
│  └─────┬─────┘ └──────┬──────┘ └─────┬──────┘ └────┬─────┘  │
│        └──────────────┴──────────────┴──────────────┘        │
│                      Home Dashboard                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴────────────────┐
           │         Supabase Cloud          │
           │  ┌──────────────────────────┐   │
           │  │  PostgreSQL + RLS Policies│   │
           │  └──────────────────────────┘   │
           │  ┌──────────────────────────┐   │
           │  │  Edge Functions (Deno)   │   │
           │  │  └─ AI Proxy Layer       │   │
           │  │     └─ Gemini 2.5 Flash  │   │
           │  └──────────────────────────┘   │
           │  ┌──────────────────────────┐   │
           │  │  Supabase Storage        │   │
           │  │  └─ PDF / Image Assets   │   │
           │  └──────────────────────────┘   │
           └────────────────────────────────┘
```

### 🔐 Security Architecture
- **Row Level Security (RLS)**: Every Supabase table enforces user-scoped access policies — no user can ever query another's data
- **AI Proxy (Edge Function)**: All Gemini API calls are routed server-side through a Deno Edge Function. The API key is **never exposed to the client**
- **Biometric Re-auth**: Native FaceID / TouchID integration via `expo-local-authentication` gates sensitive screens
- **JWT Auth Headers**: Every Edge Function invocation validates the Supabase session JWT before executing

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Framework** | React Native 0.81 · Expo SDK 54 |
| **UI / Animations** | NativeWind · Reanimated 4 · Moti · React Native Skia |
| **Navigation** | React Navigation 7 (Stack + Bottom Tabs) |
| **Backend / Database** | Supabase (PostgreSQL · RLS · Edge Functions · Storage) |
| **AI / Intelligence** | Google Gemini 2.5 Flash (via secure AI Proxy) |
| **Auth** | Supabase Auth · Google OAuth · Biometrics (FaceID/TouchID) |
| **Language** | TypeScript (strict mode) |
| **State Management** | React Hooks · Custom domain hooks per module |

---

## Key Engineering Achievements

### 1. The AI Syllabus Parser — Zero-Hallucination PDF Extraction
> Traditional regex-based parsers fail catastrophically on layout changes. We engineered a strict Gemini prompt enforcing a pure JSON schema return (`responseMimeType: "application/json"`) with a 50-point structural validation chain. The result: a cascading ingestion algorithm that splits grouped assessments, explodes recurring items (e.g., "10 Quizzes at 1% each" → 10 rows), redistributes "drop lowest" weights, and validates that all assessment weights sum to exactly 100% — all before a single record is written to the database.

### 2. RECEIPT-GPT — The 4-Step OCR Reconciliation Engine
> Standard OCR APIs return raw, unassociated text blocks with no semantic layout awareness. We built a formal multi-stage Gemini pipeline that: **(1)** rejects non-receipt images, **(2)** extracts an itemized array with implied tax semantics, **(3)** internally audits `sum(items) ≈ subtotal` for mathematical correctness, and **(4)** populates a human-review modal before any data persists. The human-in-the-loop buffer ensures the AI is never trusted blindly.

### 3. The Global Recipes Cache — Zero-Cost AI Scaling
> Naively calling Gemini for every meal generation request introduces API token overhead and UI latency at scale. DayLi decouples AI from a 1:1 user request mapping. All generated recipes are aggressively upserted into a globally shared `global_recipes` Supabase table. Any subsequent identical dietary-profile query routes directly to the cache — completely bypassing Gemini — achieving **zero incremental API cost** for repeated patterns across the entire user base.

### 4. The Availability Engine — Matrix-Based Conflict Prevention
> The `availabilityEngine.ts` service doesn't just look for gaps — it performs matrix arithmetic across the user's full academic schedule and work constraints, subtracting commute buffers and enforcing legal max-hour caps before emitting a set of "safe" time intervals. Any shift registered that overlaps an academic block is immediately rejected with an explicit collision report.

---

## 👥 The Team

| Member | Role |
|---|---|
| **Priyansh** | Systems Integrator · Full-Stack Developer · AI Orchestration |
| **Shlesha** | UI Specialist · Frontend Engineer · Design System Architect |
| **Drumil** | Data Engineer · Backend Specialist · Prompt Engineer |

> Development was executed via **Vertical Feature Sprints** — each sprint delivered a complete, functional end-to-end domain (Auth → Academics → Meals → Work → Finance → Aggregation Dashboard) rather than building the stack layer by layer.

---

## 🚀 Quick Start

> ⚠️ DayLi depends on active Supabase and Google Cloud projects. Contact the project lead for authorized credentials before running locally.

**1. Clone the Repository**
```bash
git clone https://github.com/Priyansh0612/DayLi-2.git
cd DayLi-2
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Environment**

Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**4. Launch the Development Sandbox**
```bash
npx expo start --clear
```
Press `i` for iOS Simulator · `a` for Android · `w` for Web

**5. Run Release Build on Device** *(iOS)*
```bash
npx expo run:ios --configuration Release --device
```

---

<div align="center">

Made with ❤️ by **Priyansh · Shlesha · Drumil**


</div>
