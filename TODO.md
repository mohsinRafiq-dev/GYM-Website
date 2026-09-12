# IronPulse — Build Roadmap

> Full-stack gym training platform for a private crew. Next.js 16 (App Router) +
> TypeScript + Tailwind v4 + Firebase (Auth/Firestore) with a zero-config local
> fallback so the app runs before Firebase is wired up.

Legend: `[x]` done · `[~]` partial · `[ ]` planned

---

## Phase 0 — Foundation

- [x] Scaffold Next.js 16 + TS + Tailwind v4 + ESLint
- [x] Dependencies: firebase, recharts, lucide-react, sonner, canvas-confetti, @anthropic-ai/sdk
- [x] Design system (dark-first tokens, type scale, glass/glow utilities, light theme)
- [x] Domain types (`src/lib/types.ts`)
- [x] Utility layer: dates, formatting, strength math, streak math

## Phase 1 — Data layer

- [x] Repository interface + **two adapters**: Firestore and LocalStorage (local mode)
- [x] Auth provider: email/password + Google (Firebase) · local accounts + demo account
- [x] Firestore security rules (`firestore.rules`)
- [x] Defaults and schema hydration for new and older stored data
- [x] Demo account seeded with eight weeks of realistic history

## Phase 2 — Training content

- [x] Exercise library — 106 exercises with primary/secondary muscles, equipment,
      mechanic, force, difficulty, setup, execution, coaching cues, common mistakes,
      breathing, tempo, safety notes and ranked substitutions
- [x] **Animated exercise demonstrations** — SVG figure engine driven by joint-angle
      keyframes for 26 movement patterns, played on the real tempo with phase labels
- [x] Muscle map SVG (front + back) with per-exercise and per-session activation
- [x] Form videos — curated YouTube search per exercise; the crew can save an agreed link
- [x] Programmes — 5 selectable:
  - `aesthetic-6` Aesthetic Hypertrophy (default, 6 days)
  - `ppl-6` Push / Pull / Legs ×2
  - `upper-lower-4` Upper/Lower 4-day
  - `full-body-3` Beginner Full Body
  - `home-5` Home / minimal equipment
- [x] 4-week mesocycle: accumulation → intensification → peak → deload
- [x] Warm-up protocols, finishers, cool-downs and coach's notes per day
- [x] Nutrition: TDEE/macros engine + scalable meal plans (veg + non-veg, build/cut)
- [x] Supplement guidance with evidence verdicts and disclaimers

## Phase 3 — App surfaces

- [x] Landing page (feature tour, programme preview, live animation demo)
- [x] Auth: sign in / sign up / demo account / five-step onboarding wizard
- [x] Dashboard — today's session, streak, weekly volume, muscle balance, insights, team pulse
- [x] Weekly plan overview + per-day detail
- [x] **Workout player** — set-by-set logging, rest timer with sound/vibration, RPE,
      warm-up sets, supersets, plate calculator, swaps, notes, PR detection, summary
- [x] Exercise library (search, filters, favourites) + exercise detail with lift history
- [x] Attendance — check-in, editable month calendar, six-month heatmap, streak milestones
- [x] Progress — volume trend, e1RM per lift, bodyweight, measurements, photos,
      muscle balance chart, PR log, session history
- [x] Nutrition — macro targets, food log, water tracker, meal plans
- [x] Teams — create/join by code, roles (owner/coach/member), terms acceptance,
      leaderboard, weekly challenge, team feed
- [x] AI Coach — streaming chat grounded in the user's data + quick questions;
      offline analyst when no API key is set
- [x] Timetable & reminders — per-day times, in-app alarm, browser notifications,
      `.ics` export for real phone alarms
- [x] Tools — 1RM, plate loader + warm-up ramp, interval timer, body composition,
      macro calculator, unit converter
- [x] Achievements — XP, levels and 34 badges
- [x] Settings — profile, programme, units, theme, sounds, privacy, export and reset

## Phase 4 — Polish & platform

- [x] PWA: manifest, service worker, offline shell, installable
- [x] Feedback: confetti and sound on PRs, badge-unlock toasts
- [x] Accessibility: focus-visible rings, reduced-motion support, labelled controls,
      Escape closes dialogs
- [x] Responsive: mobile bottom nav, desktop sidebar, no horizontal scroll at 400px
- [x] README with Firebase setup, env vars and deploy notes
- [x] `npm run build` clean + lint clean

## Phase 5 — Verification & hardening

- [x] Headless-browser sweep: all 17 routes at 1440px and 400px — zero console errors, zero horizontal overflow
- [x] Interaction flows verified end to end: sign-up → onboarding, log + finish a workout (rest timer, PR, summary), persistence after reload, exercise card, team creation, coach reply
- [x] Store derivation is a pure function (safe under React double-invoked updaters); saves and badge toasts run in effects
- [x] Badge XP actually awarded; level curve tuned (≈ level 8 after two months of consistent training)
- [x] Volume landmarks re-based on fractional sets (primary 1, secondary 0.5); all five programmes free of "over"/"under" verdicts
- [x] PR detection: first log sets a baseline, one record per exercise per session, noise thresholds, rep PRs for bodyweight moves
- [x] Line charts zoom to their data; area/bar charts keep a zero baseline; validated colour palette for multi-series charts
- [x] Mesocycle week and "most recent first" lists no longer depend on storage order
- [x] Coach checks API availability first — no failing request or console error without a key
- [x] Adherence only counts weeks since tracking began
- [x] Unused dependencies removed

## Backlog (not built yet)

- [ ] Smarter load pre-fill after a deload week (currently copies the last session's weight)
- [ ] Tempo metronome in the workout player (a setting exists but isn't wired up)
- [ ] Snooze for reminders
- [ ] Page transition animations
- [ ] Progress photos in Firebase Storage (currently inline data URLs; Firestore documents cap at 1 MB)
- [ ] Real-time team chat (the team feed is a post list, not live chat)
- [ ] Coach-assigned custom programmes per member
- [ ] Apple Health / Google Fit import
- [ ] Push notifications via FCM when the tab is closed
- [ ] Video upload for form checks
