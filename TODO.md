# IronPulse — Build Roadmap

> Full-stack gym training platform for a private crew. Next.js 16 (App Router, RSC) +
> TypeScript + Tailwind v4 + Firebase (Auth/Firestore/Storage) with a zero-config local
> fallback so the app runs before Firebase is wired up.

Legend: `[x]` done · `[~]` partial · `[ ]` planned

---

## Phase 0 — Foundation

- [x] Scaffold Next.js 16 + TS + Tailwind v4 + ESLint
- [x] Install deps: firebase, motion, recharts, lucide-react, zustand, sonner, date-fns, @anthropic-ai/sdk
- [x] Design system (dark-first tokens, type scale, glass/glow utilities, light theme)
- [x] Domain types (`src/lib/types.ts`)
- [x] Utility layer: dates, formatting, strength math, streak math

## Phase 1 — Data layer (the part that makes it real)

- [x] Repository interface + **two adapters**: Firebase and LocalStorage (demo mode)
- [x] Auth provider: email/password + Google (Firebase) · demo accounts (local)
- [x] Firestore security rules + composite index notes
- [x] Seed/migration for new users (profile, settings, team defaults)

## Phase 2 — Training content (the trainer's brain)

- [x] Exercise library — 90+ exercises with: primary/secondary muscles, equipment,
      mechanic, force vector, difficulty, setup, execution, coaching cues, common
      mistakes, breathing, tempo, safety notes, substitutions, warmup guidance
- [x] **Animated exercise demonstrations** — parametric SVG figure engine driven by
      per-pattern joint keyframes (22 movement patterns), tempo-aware, phase labels
- [x] Muscle map SVG (front + back) with per-exercise activation heat
- [x] Video panel — embed when a clip is configured, otherwise a curated form-search
      link (no broken third-party embeds shipped by default)
- [x] Programs — 5 selectable mesocycles:
  - `aesthetic-6` Aesthetic Hypertrophy (default, 6 days)
  - `ppl-6` Push / Pull / Legs ×2
  - `upper-lower-4` Upper/Lower 4-day
  - `full-body-3` Beginner Full Body
  - `home-5` Home / minimal equipment
- [x] 4-week undulating progression + built-in deload logic
- [x] Warmup ramps, cooldown/mobility blocks, conditioning prescriptions
- [x] Nutrition: TDEE/macros engine + meal templates (veg + non-veg, bulk/cut/recomp)
- [x] Supplement + recovery guidance (evidence-based, with disclaimers)

## Phase 3 — App surfaces

- [x] Landing page (marketing, feature tour, program preview)
- [x] Auth: sign in / sign up / demo mode / onboarding wizard (goals, stats, split, schedule)
- [x] Dashboard — today's session, streak, weekly volume, team pulse, coach tip
- [x] Weekly plan overview + per-day detail
- [x] **Live workout player** — set-by-set logger, rest timer w/ audio, RPE, tempo
      metronome, PR detection, superset flow, plate math, notes, session summary
- [x] Exercise library browser (search, filters, favourites) + exercise detail page
- [x] Attendance — check-in, calendar month view, year heatmap, streak + freezes
- [x] Progress — bodyweight, measurements, e1RM per lift, volume by muscle, radar
      balance chart, PR log, progress photos
- [x] Nutrition page — macro targets, meal plan, water, quick add
- [x] Teams — create/join by code, roles (owner/coach/member), roster, leaderboard,
      team rules & terms acceptance, announcements feed, weekly challenge
- [x] AI Coach — streaming chat grounded in the user's real data + quick actions;
      deterministic local analyst fallback when no API key is set
- [x] Timetable & reminders — per-day alarm times, browser notifications, in-app
      alarm, snooze, `.ics` export for phone calendars
- [x] Tools — 1RM, plate loader, warmup ramp, BMI/BF%, TDEE, unit converter, timers
- [x] Achievements — XP, levels, 30+ badges with unlock rules
- [x] Profile & settings — units, theme, rest defaults, privacy, data export/reset

## Phase 4 — Polish & platform

- [x] PWA: manifest, service worker, offline shell, installable
- [x] Motion pass (page transitions, counters, confetti on PR/streak)
- [x] Accessibility: focus rings, reduced-motion, semantic landmarks, keyboard nav
- [x] Responsive: mobile bottom nav, tablet, desktop sidebar
- [x] README with Firebase setup, env vars, deploy notes
- [x] `npm run build` clean + lint clean

## Backlog / nice-to-have (not built yet)

- [ ] Real-time team chat (Firestore listeners are in place; UI is a feed, not chat)
- [ ] Coach-assigned custom programs per member
- [ ] Apple Health / Google Fit import
- [ ] Push notifications via FCM when the tab is closed (needs a paid-ish setup)
- [ ] Video upload for form checks + AI form review from video frames
