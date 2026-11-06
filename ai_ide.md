# 🤖 Master Prompt & Specification for Autonomous AI IDE (Windsurf / Cursor / Agent)

**Target Repository:** `https://github.com/natiBirhauz/VibeApp`  
**Project Name:** VibeApp (Text-to-APK Platform)  
**Primary Goal:** Build a lean, profitable, fully functional SaaS platform that allows users to describe an Android app in Hebrew/English, preview it in a browser simulator, and export a signed `.apk` file for mobile download.

---

## 🎯 AGENT EXECUTION PROTOCOL (HOW YOU MUST WORK)

As the autonomous development agent, you must execute the tasks sequentially. Do **not** try to complete everything in a single step. For each milestone:
1. **Plan & Scaffold:** Create the clean project files without bloat.
2. **Implement & Test:** Write working code, enforce TypeScript strictness and RTL support.
3. **Git Commit & Push:** Commit your progress directly to `natiBirhauz/VibeApp` with clear semantic commit messages (e.g., `feat: setup expo template and rtl system prompt`, `feat: web preview sandbox`).

---

## 🛠 TECH STACK SPECIFICATION

* **Frontend & Web Platform:** Next.js (App Router), Tailwind CSS, Lucide Icons, Shadcn UI.
* **Database & Auth:** Supabase (PostgreSQL + Auth + Storage).
* **AI Orchestration:**
  * **Interviewer / Fast Agent:** Cheap & fast model (e.g., Haiku / GPT-4o-mini).
  * **Coder Agent:** High-reasoning model (e.g., Claude 3.5 Sonnet / GPT-4o).
* **Live Sandbox:** Client-side React Native Web runner (Sandpack or iframe-based isolated web bundle).
* **App Generation Paradigm:** **Single-file Monolith (`App.tsx`)** based on an Expo (React Native) template with locked dependencies to prevent build breaks.
* **APK Cloud Builder:** Serverless GitHub Actions CI/CD triggered via GitHub API, compiling the pre-built shell + dynamic `App.tsx` injection into an APK, then uploading to Supabase Storage.
* **Payments & Credits:** Credit wallet system (prepaid credits) integrated with a local Israeli payment gateway (Grow / PayPlus / Morning / Stripe).

---

## 📋 STEP-BY-STEP IMPLEMENTATION ROADMAP

### Milestone 1: Core Template & AI System Prompt (Day 1-3)
* [ ] **1.1 Expo Base Template:**
  * Create directory `templates/expo-base` with a rock-solid `package.json` locking proven libraries:
    * `react-native`, `expo`, `expo-router`
    * `@react-native-async-storage/async-storage` (Local persistent storage)
    * `lucide-react-native`, `react-native-svg`
    * `react-native-reanimated`, `expo-haptics`
  * Add automatic RTL support (`I18nManager.allowRTL(true); I18nManager.forceRTL(true)`).
* [ ] **1.2 Prompt Engineering (`lib/ai/prompts.ts`):**
  * **Phase 1 Prompt (The Architect):** Receives raw user description, asks 3 sharp questions in Hebrew about features, data to store, and design style.
  * **Phase 2 Prompt (The Coder):** Receives answers, outputs **strictly** a single `App.tsx` file containing all screens, state management, and modern Tailwind/StyleSheet styles. Markdown wrappers must be clean.
* [ ] **Git Checkpoint:** `git add . && git commit -m "feat(core): setup base expo template and system prompts" && git push`

---

### Milestone 2: Web Platform & Live Simulator (Day 4-8)
* [ ] **2.1 Platform Layout:**
  * Build a split-screen dashboard:
    * **Right Column:** Conversational AI chat with streaming responses and credit counter.
    * **Left Column:** Phone frame container with live React Native Web preview.
* [ ] **2.2 Live Code Engine:**
  * Integrate an in-browser bundler or Sandpack that takes the generated `App.tsx` string and renders it instantly inside the phone frame.
  * Implement error boundary: if code throws a syntax or runtime error, capture the error message and silently feed it back to the AI for self-healing.
* [ ] **2.3 State & Revert:**
  * Store version snapshots of each iteration so the user can click "Undo" or revert to any previous prompt state without losing credits.
* [ ] **Git Checkpoint:** `git add . && git commit -m "feat(ui): split-screen chat and live react-native simulator" && git push`

---

### Milestone 3: Fast APK Cloud Builder (Day 9-14)
* [ ] **3.1 GitHub Actions Workflow (`.github/workflows/build-apk.yml`):**
  * Create a parameterized workflow that takes:
    * `APP_NAME` (string)
    * `APP_CODE` (base64 encoded `App.tsx`)
    * `APP_ICON_URL` (optional image URL)
    * `CALLBACK_URL` or Supabase Upload credentials.
  * Workflow steps:
    1. Checkout the base Expo Android project (pre-cached Gradle).
    2. Replace `App.tsx` and update `app.json` (appName, slug, packageId).
    3. Run `./gradlew assembleRelease` (or `eas build -p android --local`).
    4. Sign the APK with a standard keystore.
    5. Upload the resulting `.apk` to Supabase Storage Bucket (`/apks/{projectId}.apk`).
* [ ] **3.2 Trigger API (`app/api/build-apk/route.ts`):**
  * Next.js API route that dispatches `workflow_dispatch` via GitHub REST API (using a GitHub Personal Access Token).
  * Returns build status, polling endpoint, and estimated time (60-90 seconds).
* [ ] **3.3 Download Modal & Mobile Onboarding:**
  * Modal showing a QR Code pointing to the APK download link.
  * Quick 3-step visual guide on Android "Install from Unknown Sources" authorization.
* [ ] **Git Checkpoint:** `git add . && git commit -m "feat(build): cloud apk builder pipeline and download flow" && git push`

---

### Milestone 4: Database, Credit Wallet & Payments (Day 15-20)
* [ ] **4.1 Supabase Schema (`supabase/schema.sql`):**
  * `profiles`: `id`, `email`, `credits_balance` (default: 15), `created_at`.
  * `projects`: `id`, `user_id`, `name`, `current_code`, `status`, `apk_url`, `created_at`.
  * `transactions`: `id`, `user_id`, `amount_paid`, `credits_added`, `payment_id`, `created_at`.
* [ ] **4.2 Credit Ledger Logic:**
  * Initial generation: Deduct 10 credits.
  * Chat iteration / edit: Deduct 2 credits.
  * APK Export: Deduct 20 credits (Requires minimum balance).
* [ ] **4.3 Payment Gateway Webhook (`app/api/webhooks/payment/route.ts`):**
  * Webhook listener verifying successful payment and automatically crediting the user balance.
* [ ] **Git Checkpoint:** `git add . && git commit -m "feat(billing): supabase auth, credit system and payment webhooks" && git push`

---

### Milestone 5: Starter Templates & Polishing (Day 21-25)
* [ ] **5.1 5 Built-in Hebrew Templates:**
  * Add 1-click starter apps:
    1. Business Quote & Price Calculator (מחשבון הצעות מחיר).
    2. Digital Business Card & Appointment Booker (כרטיס ביקור וקביעת פגישות).
    3. Family Task & Grocery Manager (מנהל משימות וקניות).
    4. Workout & Weight Tracker (יומן אימונים ומשקל).
    5. WhatsApp Product Catalog (קטלוג מוצרים והזמנה בוואטסאפ).
* [ ] **5.2 Mobile Responsiveness & Polish:**
  * Clean UI, dark/light mode, error toasts, and smooth Hebrew typography (Rubik / Heebo).
* [ ] **Git Checkpoint:** `git add . && git commit -m "feat(launch): hebrew starter templates and final polish" && git push`

---

## 🚀 INSTRUCTIONS FOR THE AGENT TO START RIGHT NOW:

1. Clone or inspect `https://github.com/natiBirhauz/VibeApp`.
2. Begin with **Milestone 1**: Set up the project directory structure, create `templates/expo-base`, and define `lib/ai/prompts.ts`.
3. Provide terminal progress updates and commit to git after completing each subtask.