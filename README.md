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
- Loads today's session with **last session's weights pre-filled**.
- Log weight, reps and RPE per set; mark warm-up sets; add or remove sets.
- **Rest timer** that starts automatically, with sound, vibration and ±15s controls.
- "Last time" comparison and a progression call (add load / hold / back off).
- Swap an exercise mid-session, plate calculator with warm-up ramp, per-exercise notes.
- Automatic **personal-record detection** (heaviest set, estimated 1RM, session volume),
  XP and a session summary. An in-progress workout survives a page refresh.

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
  Team feed for announcements and cheers.

### AI coach
- Streaming chat grounded in your data: profile and limitations, today's session, last 14
  days of training, weekly sets per muscle, recent PRs, bodyweight trend and adherence.
- Quick questions for the common asks (plateaus, volume check, nutrition, weekly review).
- **Offline analyst** fallback that gives data-driven answers with no API key.

### Everything else
- **Nutrition**: BMR/TDEE/macros from your stats, water tracker, food log, scalable
  vegetarian and non-vegetarian meal plans, and honest supplement verdicts.
- **Progress**: volume trend, estimated 1RM per lift, bodyweight trend, BMI and Navy body-fat
  estimate, measurements, progress photos, PR log, session history.
- **Timetable & alarms**: per-day training times, in-app alarm with sound, browser
  notifications, and a `.ics` calendar export for real phone alarms.
- **Tools**: 1RM calculator, plate loader, interval timer/stopwatch, body composition,
  macro calculator, unit converter.
- **Settings**: profile, programme, units, theme (dark/light/system), sounds, privacy,
  data export and reset.
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
5. **Deploy the security rules** in [`firestore.rules`](firestore.rules):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # choose your project, keep firestore.rules
   firebase deploy --only firestore:rules
   ```
   Or paste the file's contents into *Firestore → Rules* in the console and publish.
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
| `users/{uid}/photos/{id}`             | Progress photos                                      |
| `users/{uid}/coach/{id}`              | Coach conversation                                   |
| `teams/{teamId}`                      | Team, roster with shared stats, rules, feed          |

The rules let a user read and write only their own `users/{uid}` tree. Team documents are
readable by signed-in users (that's how joining by code works) and only members can
update them.

> **Progress photos** are stored inline as data URLs. That's fine in local mode, but
> Firestore documents cap at 1 MB — for heavy photo use, move them to Firebase Storage.

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
│   └── (app)/                   Signed-in app (shared shell)
│       ├── dashboard/  plan/  plan/[day]/  train/
│       ├── exercises/  exercises/[id]/
│       ├── attendance/  progress/  nutrition/  achievements/
│       ├── team/  coach/  timetable/  tools/  settings/  onboarding/
├── components/
│   ├── ui/                      Buttons, cards, forms, modals, feedback
│   ├── charts/                  Trend, muscle balance, grouped bars, heatmap
│   ├── workout/                 ExerciseAnimation, MuscleMap, ExerciseCard, RestTimer
│   └── layout/AppShell.tsx      Sidebar, top bar, mobile navigation
└── lib/
    ├── types.ts                 Domain model
    ├── fitness.ts               1RM, volume landmarks, progression, TDEE, streaks, XP
    ├── coach.ts                 Coach context builder, insights, offline analyst
    ├── session-utils.ts         Session summaries and PR detection
    ├── animation/               Figure rig (forward kinematics) + 26 movement patterns
    ├── data/                    Exercises, programmes, nutrition, badges
    ├── firebase/config.ts       Optional Firebase initialisation
    └── store/                   Auth + data providers, storage adapters, demo seed
```

---

## Good to know

- **Local mode is not secure authentication.** Its passwords only stop accidental mix-ups
  on a shared browser. Use Firebase for anything real.
- **Reminders while the browser is closed**: a website can't wake your phone by itself.
  In-app alarms and notifications fire while IronPulse is open; for guaranteed alarms,
  use *Timetable → Download calendar file* and import it into your phone's calendar.
- **Units**: weights are stored in kilograms and converted for display when you choose
  imperial.
- **Not medical advice.** The programmes and coach give general training guidance. Sharp,
  persistent or radiating pain means stop and see a physiotherapist or doctor.
