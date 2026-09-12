# IronPulse

A private training platform for a crew of friends: a professionally programmed weekly
split, animated exercise demonstrations, set-by-set workout logging, attendance streaks,
teams with a leaderboard, reminders, nutrition targets and an AI coach that answers using
your real training data.

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**,
**Firebase** (Auth + Firestore) and the **Anthropic API** for the coach.

> It works the moment you clone it. With no configuration it runs in **local mode**
> (data in your browser) and the coach uses a built-in offline analyst. Add Firebase when
> you want real accounts and a shared team; add an Anthropic key when you want the full
> conversational coach.

---

## Quick start

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and click **Explore the demo account** — it comes pre-loaded
with eight weeks of realistic training history, so every chart, streak and insight has
something to show. Or create your own account and go through the five-step onboarding.

| Script          | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Development server on port 3000       |
| `npm run build` | Production build                      |
| `npm start`     | Serve the production build            |
| `npm run lint`  | ESLint (React Compiler rules included)|

---

## What's inside

### Training
- **Five complete programmes** — Aesthetic Hypertrophy (6-day, the default), Push/Pull/Legs,
  Upper/Lower, Foundation Full Body (beginners) and Home Iron (dumbbells + bench + bar).
- Every day has a trainer's brief, a warm-up protocol, ordered exercises with
  **sets × reps, RPE, rest and tempo**, supersets, intensifiers (drop sets, myo-reps),
  a finisher, a cool-down and coach's notes.
- **4-week mesocycles** with accumulation → intensification → peak → deload, and
  double-progression advice on every lift.
- **Weekly volume per muscle** checked against evidence-based landmarks (minimum effective,
  growth range, recoverable ceiling).

### Exercise library
- **90+ exercises**, each with purpose, setup, execution steps, coaching cues, common
  mistakes, breathing, tempo, safety notes and ranked substitutions.
- **Animated demonstrations** — a real-time SVG figure driven by joint-angle keyframes for
  26 movement patterns, played on the exercise's actual tempo with eccentric/concentric
  phase labels, speed control and a scrubber. No video files, works offline.
- **Muscle map** (front and back) showing activation for every exercise and every session.
- Form videos: each exercise links to a curated YouTube search, and your crew can save the
  specific video you all agree on.

### Workout player
- Loads today's session with **weights pre-filled from your history** — deload-aware:
  deload weeks start near 60%, and the week after picks up from your real working weights.
- Log weight, reps and RPE per set; mark warm-up sets; add or remove sets.
- **Rest timer** that starts automatically, with sound, vibration and ±15s controls.
- "Last time" comparison and a progression call (add load / hold / back off).
- **Tempo metronome** that beeps each second of the prescribed tempo and counts reps.
- Swap an exercise mid-session, plate calculator with warm-up ramp, per-exercise notes.
- Automatic **personal-record detection** (heaviest set, estimated 1RM, session volume),
  XP and a session summary. An in-progress workout survives a page refresh.

### Form checks
- Film a set or upload a clip. **The video never leaves your device.**
- Scrub in slow motion, step frame by frame, and watch it next to the animated demonstration.
- Tick the exercise's cues and common mistakes as a self-review.
- Capture up to six key frames (or auto-pick them) and get a **Claude vision review** of
  your technique — only those frames are sent, and only when you ask.
- Checks are saved with a thumbnail so you can compare over time.

### Consistency
- **Attendance**: check in as trained, active recovery, rest, ill or travelling; edit any
  past day on the month calendar; six-month heatmap.
- **Streaks** that survive planned rest days, weekly streaks, and 4/12-week adherence.
- **XP, levels and 34 badges** from *First Rep* to *Millionaire*.

### Crew
- **Teams**: create one with rules, terms, a weekly session target, member cap and privacy;
  share a six-character join code.
- Members must accept the terms. Roles: **owner**, **coach**, **member** (owners promote and
  remove). Leaderboard by streak, weekly sessions, volume or XP. Weekly team challenges.
  **Live team chat** with coach announcements.
- **Programme builder** for owners and coaches: clone a built-in plan or start from a blank
  week, edit every day and exercise with a live volume check, then assign it to members.
  Members see a banner and switch with one tap.

### AI coach
- Streaming chat grounded in your data: profile and limitations, today's session, last 14
  days of training, weekly sets per muscle, recent PRs, bodyweight trend and adherence.
- Quick questions for the common asks (plateaus, volume check, nutrition, weekly review).
- **Offline analyst** fallback that gives data-driven answers with no API key.

### Everything else
- **Nutrition**: BMR/TDEE/macros from your stats, water tracker, food log, scalable
  vegetarian and non-vegetarian meal plans, and honest supplement verdicts.
- **Progress**: volume trend, estimated 1RM per lift, bodyweight trend, BMI and Navy body-fat
  estimate, measurements, progress photos, PR log, session history. **Import** bodyweight
  and measurements from any CSV (Google Fit, Samsung Health, a spreadsheet) or an Apple Health
  `export.xml` — parsed in the browser, nothing uploaded.
- **Timetable & alarms**: per-day training times, in-app alarm with sound and snooze, browser
  notifications, optional **push reminders when the app is closed**, and a `.ics` calendar
  export for real phone alarms.
- **Tools**: 1RM calculator, plate loader, interval timer/stopwatch, body composition,
  macro calculator, unit converter.
- **Settings**: profile, programme, units, theme (dark/light/system), sounds, privacy,
  data export, backup restore and reset.
- **PWA**: installable, with an offline shell.

---

## Setting up Firebase (real accounts + shared teams)

Local mode keeps everything in one browser, so friends on different phones can't share a
team. Firebase fixes that. The free Spark plan is plenty for a crew.

1. **Create a project** at <https://console.firebase.google.com>.
2. **Add a Web app** (Project settings → Your apps → `</>`). Copy the config values.
3. **Authentication** → Sign-in method → enable **Email/Password** and **Google**.
   Under *Settings → Authorized domains*, add your deployed domain later.
4. **Firestore Database** → Create database → start in *production mode*.
   **Storage** → Get started (used for progress photos).
5. **Deploy the security rules** in [`firestore.rules`](firestore.rules) and
   [`storage.rules`](storage.rules) — [`firebase.json`](firebase.json) already points at both:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # pick your project
   firebase deploy --only firestore:rules,storage
   ```
   Or paste each file into *Firestore → Rules* and *Storage → Rules* in the console.
6. **Create `.env.local`** from the template and fill in the six `NEXT_PUBLIC_FIREBASE_*`
   values:
   ```bash
   cp .env.example .env.local
   ```
7. Restart `npm run dev`. The login page now says *Storage mode: Firebase (synced)* and
   shows *Continue with Google*.

### How data is stored

| Path                                  | Contents                                             |
| ------------------------------------- | ---------------------------------------------------- |
| `users/{uid}`                         | Profile, settings, XP/badges, streak, favourites     |
| `users/{uid}/sessions/{id}`           | Logged workouts                                      |
| `users/{uid}/attendance/{date}`       | Daily check-ins                                      |
| `users/{uid}/metrics/{id}`            | Bodyweight and measurements                          |
| `users/{uid}/nutrition/{date}`        | Food and water logs                                  |
| `users/{uid}/photos/{id}`             | Progress photo details (the image is in Storage)     |
| `users/{uid}/coach/{id}`              | Coach conversation                                   |
| `users/{uid}/formChecks/{id}`         | Form-check notes, checklist, review, small thumbnail |
| `users/{uid}/devices/{token}`         | Push-reminder schedule for each enabled device       |
| `teams/{teamId}`                      | Team, roster, rules, chat, programmes, assignments   |
| Storage `users/{uid}/photos/{id}.jpg` | Compressed progress photos (owner-only)              |

The rules let a user read and write only their own `users/{uid}` tree. Team documents are
readable by signed-in users (that's how joining by code works) and only members can
update them.

Writes are diffed — only documents that changed are sent, and deletions propagate. Team
changes (joining, chat, roles, programmes) run as transactions, so two people acting at once
never overwrite each other. If you turn off *Share my stats with my team*, your leaderboard
numbers are hidden from everyone else.

### Push reminders while the app is closed (optional)

A closed tab can only receive a notification through a push service, so this part needs a
small scheduled job. It requires the **Blaze** (pay-as-you-go) plan; a crew's usage stays
well inside the free allowance.

1. *Project settings → Cloud Messaging → Web Push certificates* → **Generate key pair**.
   Put the key in `.env.local` as `NEXT_PUBLIC_FIREBASE_VAPID_KEY` and rebuild.
2. Deploy the scheduled function in [`functions/`](functions/src/index.ts). Every five
   minutes it finds devices whose reminder time has arrived in their own time zone, skips
   anyone who has already trained that day, and removes expired tokens:
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
3. In the app: *Timetable → Reminders when the app is closed* → turn it on, on each device.

On iPhone, web push only works after *Share → Add to Home Screen* (iOS 16.4 or later).

---

## Setting up the AI coach

1. Create an API key at <https://console.anthropic.com>.
2. Add it to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart the dev server.

The key is used only on the server, in [`src/app/api/coach/route.ts`](src/app/api/coach/route.ts);
it is never sent to the browser. The route uses `claude-opus-5` with adaptive thinking,
streams the reply, caches the system prompt, and has server-side refusal fallback enabled so
a declined request degrades gracefully instead of dead-ending the chat.

Without a key, the coach page still works — it switches to the offline analyst and says so.

The same key powers **form-check reviews** in
[`src/app/api/form-check/route.ts`](src/app/api/form-check/route.ts). The route looks up the
exercise's cues and mistakes on the server, accepts at most six JPEG frames, and asks Claude
to review only what the frames show — including how confident it is and how to film better.
Without a key, the self-review checklist still works.

---

## Deploying

The simplest route is **Vercel**:

1. Push the repository to GitHub.
2. Import it at <https://vercel.com/new>.
3. Add the same environment variables from `.env.local` in *Project → Settings →
   Environment Variables*.
4. Deploy, then add the Vercel domain to Firebase *Authentication → Authorized domains*.

Any Node.js host that runs `npm run build && npm start` works as well.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 Landing page
│   ├── login/                   Sign in / sign up / demo
│   ├── api/coach/route.ts       Streaming AI coach endpoint
│   ├── api/form-check/route.ts  Claude vision review of captured frames
│   ├── firebase-messaging-sw.js Push service worker (generated from env)
│   └── (app)/                   Signed-in app (shared shell)
│       ├── dashboard/  plan/  plan/[day]/  train/
│       ├── exercises/  exercises/[id]/
│       ├── attendance/  progress/  nutrition/  achievements/
│       ├── team/  team/programs/  coach/  form-check/
│       ├── timetable/  tools/  settings/  onboarding/
├── components/
│   ├── ui/                      Buttons, cards, forms, modals, feedback
│   ├── charts/                  Trend, muscle balance, grouped bars, heatmap
│   ├── workout/                 ExerciseAnimation, MuscleMap, RestTimer, TempoMetronome
│   ├── team/                    Live chat, programmes and assignments
│   ├── progress/                Measurement import dialog
│   └── layout/AppShell.tsx      Sidebar, top bar, mobile navigation
└── lib/
    ├── types.ts                 Domain model
    ├── fitness.ts               1RM, volume landmarks, progression, TDEE, streaks, XP
    ├── coach.ts                 Coach context builder, insights, offline analyst
    ├── session-utils.ts         Session summaries and PR detection
    ├── animation/               Figure rig (forward kinematics) + 26 movement patterns
    ├── data/                    Exercises, programmes, nutrition, badges
    ├── firebase/                Optional Firebase initialisation, Storage uploads
    ├── importers.ts             CSV and Apple Health parsers
    ├── image.ts                 Photo compression and video frame capture
    ├── push.ts                  Push-notification registration
    └── store/                   Auth + data providers, storage adapters, demo seed
functions/                       Scheduled Cloud Function that sends push reminders
```

---

## Good to know

- **Local mode is not secure authentication.** Its passwords only stop accidental mix-ups
  on a shared browser. Use Firebase for anything real.
- **Reminders while the browser is closed** need push set up (above). Without it, in-app
  alarms and notifications fire while IronPulse is open. For guaranteed alarms either way,
  use *Timetable → Download calendar file* and import it into your phone's calendar.
- **Units**: weights are stored in kilograms and converted for display when you choose
  imperial.
- **Not medical advice.** The programmes and coach give general training guidance. Sharp,
  persistent or radiating pain means stop and see a physiotherapist or doctor.
