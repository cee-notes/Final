# MEC CEE Bachelor Level Practice Portal (schema v3)

A free mock-test platform for **MECEE-BL** (Nepal Medical Education Commission Common Entrance
Examination — Bachelor Level, 2026 third revision) aspirants — MBBS, BDS, Nursing and Public
Health. It runs CEE-pattern papers with server-side scoring, per-topic analytics, a
**model exam of the day** with a daily leaderboard, and a teacher dashboard — on infrastructure
that costs nothing: GitHub Pages for the frontend, Google Apps Script + Sheets for the backend.

🌐 **Live portal**: <https://cee-notes.cprecnepal.org.np>
📂 **Source**: <https://github.com/cee-notes/Final-sept>

---

## How it runs

The whole frontend is a single file, `index.html`, and it works in two modes **automatically**:

| Mode | When | Data lives in |
| :--- | :--- | :--- |
| **Apps Script web app** | `google.script.run` is available | Google Sheets (real users, real email) |
| **Sandbox / GitHub Pages** | no `google.script.run` | `localStorage`, via `MockApi` — a 1:1 simulation of the backend API, seeded with demo data |

`MockApi` mirrors the Apps Script functions exactly: same names, arguments, return shapes, error
messages, scoring rules, rate limits and duplicate protection — including the model-exam-of-the-day
engine (fixed paper per date, one attempt, daily leaderboard). That means the Pages deployment is a
fully usable demo, and the same UI code is shipped to production without a build step for the
browser.

---

## Exam rules (MECEE-BL 2026 pattern)

| | |
| :--- | :--- |
| Full paper | **200 MCQs**, single best response, four options |
| Weighting (Group I) | **Zoology 40 · Botany 40 · Chemistry 50 · Physics 50 · MAT 20** |
| Duration | **54 s per question** — a full 200-question paper is 180 minutes (minimum 10 min) |
| Marking | **+1** correct · **−0.25** wrong · **0** skipped |
| Difficulty mix | papers are difficulty-weighted **~20% easy / 60% medium / 20% hard** where the bank allows |
| Model exam of the day | one fixed 20-question paper per calendar date, **identical order for every student**, one attempt each, daily rank |
| Practice mode | choose subjects, topic focus, question count, optional timer, optional negative marking, optional instant feedback |

If the bank cannot fill a subject quota, the paper is topped up from the remaining questions and the
clock shrinks to match — a 12-question bank produces a 12-question, 11-minute mock rather than a
3-hour one. The **daily paper** is apportioned the same way: 20 questions become exactly
4 Zoology / 4 Botany / 5 Chemistry / 5 Physics / 2 MAT, never lopsided.

Scoring is **always** server-side. The paper is rebuilt deterministically from a seed
(`userId | startedAt | options signature`) when an attempt is submitted, so the client can never
change its own options, questions or marks; model exams are scored against the **server-stored
paper** (`CEE_EXAM_META_<userId>` in Script Properties — a submission without matching metadata is
rejected with `MODEL_NO_META`). The blueprint exists twice — `CEE_BLUEPRINT` in `index.html` and
`CEE_BLUEPRINT_` in `cee_mock_all_in_one.gs` — and `npm test` asserts the two build byte-identical,
difficulty-weighted papers.

---

## Features

### For students
- **Model exam of the day** — a fixed paper each date, same questions in the same order for the
  whole class, one attempt per day, instant rank on the daily leaderboard, 7-day history.
- Realistic timed exam: countdown with 10/5/1-minute warnings, auto-submit, question palette
  (answered / marked / not answered), progress bar.
- Touch-friendly controls — **Previous · Mark for review · Clear answer · Next** — plus keyboard
  shortcuts: `A`–`D` or `1`–`4` to answer, `←`/`→` to navigate, `M` to mark, `Backspace` to clear,
  `Ctrl`+`Enter` to submit, `?` for help.
- Crash-safe: answers are autosaved per user, so a reload, a flat battery or a lost connection
  resumes the attempt exactly where it stopped.
- Instant results: score, accuracy, section split, animated ring, printable report.
- Full answer review with explanations, filterable by correct / wrong / skipped.
- Analytics: accuracy trend, subject bars, weak-topic list with one-click topic drills, leaderboard.
- **Official syllabus browser** — the full MECEE-BL 2026 syllabus (all four program groups, every
  unit with its question count, exam format and official sample questions) right inside the app.
- Custom practice with instant feedback, and in-app messaging to the teacher.

### For teachers
- Approve, reject and device-unlock students; searchable user table.
- **Model exam admin** — generate today's paper on demand, and switch on the **autopilot**
  (a time-driven trigger that prepares tomorrow's paper every day at 20:00 script time). Questions
  in a live daily paper are **locked** against edits/deletes (`MODEL_QUESTION_LOCKED`) until the
  exam day is over, and a paper cannot be regenerated once students have attempted it.
- Class analytics: participation, class accuracy, subject bars, class-wide weak topics,
  per-student progress table, CSV export.
- Per-student drill-down with printable per-attempt score reports and direct email.
- Question bank CRUD with difficulty tags, duplicate protection and image upload
  (auto-downscaled to ~48 KB).
- Bulk upload (CSV paste, `.csv` or `.xlsx`) with a **server-side dry-run preview** before writing.
- PDF builder: extract text from a syllabus PDF and turn selections into questions.
- Inbox for student messages.

### Everywhere
- Dark and light themes (follows the OS by default, remembered once you choose).
- Responsive down to small phones; print stylesheets for results, reviews and reports.
- Accessible: dialogs are labelled and focus-trapped, options are real radio-buttons, the palette is
  screen-reader labelled, and `prefers-reduced-motion` is respected.

---

## Repository layout

```text
Final-sept/
├── index.html                # the entire frontend (markup + CSS + JS + MockApi + syllabus data)
├── demo.html                 # identical copy of index.html (alternate Pages entry point)
├── cee_mock_all_in_one.gs    # Apps Script backend + base64 copy of index.html (EMBEDDED_HTML)
├── scripts/
│   ├── build-gas.mjs         # re-embeds index.html into the .gs file
│   └── smoke-test.mjs        # 68 headless end-to-end checks (jsdom) + client/server parity
├── package.json              # dev scripts only — the site itself has no dependencies
└── CNAME                     # custom domain for GitHub Pages
```

---

## Deploying

### 1. GitHub Pages (demo / sandbox mode)
Push to `main` and enable Pages — `index.html` is self-contained, so there is nothing to build.

### 2. Google Apps Script (real backend)
1. Create or open a Google Sheet; it becomes the database.
2. **Extensions → Apps Script**, delete the default code and paste **all** of
   `cee_mock_all_in_one.gs`.
3. **Deploy → New deployment → Web app** — *Execute as: Me*, *Who has access: Anyone*.
4. Open the web app URL. The `Users`, `Questions`, `Attempts`, `Responses`, `Messages` and
   `DailyExams` tabs are created automatically (schema `CEE_TABS_READY = v3` — missing columns are
   self-healed, the question `Difficulty` column is backfilled to `medium`) and the bank seeds
   itself with 10 demo questions.
5. Register an account, then change its `Role` cell from `student` to `teacher` to bootstrap the
   first teacher.
6. Optional: as a teacher, open the dashboard and switch on **Autopilot**. The first time, Google
   will ask you to authorise the script's time-driven trigger; afterwards tomorrow's model exam is
   generated every day at 20:00 (script timezone).

**After changing `index.html`, always run `npm run build`.** The web app serves the frontend from the
`EMBEDDED_HTML` base64 string inside the `.gs` file; without the rebuild, the deployment keeps
serving the previous version.

### Upgrading an existing deployment (v1 → v3)
Paste the new `.gs` over the old one and reload the web app once. Then:

- The new `DailyExams` tab and the `Difficulty` / `DailyDate` columns are added automatically.
- Old questions tagged `Biology` or `Maths` are **remapped on read** to `Zoology` / `MAT`, so
  historical data keeps working inside the new blueprint.
- The public API was renamed for consistency: `registerUser`, `loginUser`, `logoutUser`,
  `sendStudentMessage` (previously `register`, `login`, `logout`, `sendMessageToTeacher`). If you
  built anything custom against the old names, update those four calls.
- The sandbox store moved from `cee_db_v1` to `cee_db_v3` in `localStorage`; old demo data is not
  migrated — clear site data to reseed.

---

## Development

```bash
npm install          # dev-only (jsdom) — the portal itself has zero runtime dependencies
npm run serve        # http://localhost:8080 — runs in sandbox mode with demo data
npm test             # 68 headless end-to-end checks + client/server blueprint parity
npm run build        # re-embed index.html into cee_mock_all_in_one.gs
npm run build:check  # CI-friendly: fails if the embed is stale
```

`npm test` drives the real UI in jsdom: login, mock exam, answering, marking, autosave, submission,
review, practice with instant feedback, the model exam of the day (start, one-attempt rule,
leaderboard), the syllabus browser, the teacher dashboard, autopilot and the question bank — and
then compares the paper built by the client against the one built by the Apps Script backend,
including the difficulty weighting and the legacy-section remap.

### Demo accounts (sandbox mode)

| Role | Email | Password |
| :--- | :--- | :--- |
| Teacher | `teacher@cee.edu` | `demo1234` |
| Student | `student@cee.edu` · `aayush@cee.edu` · `sabina@cee.edu` | `demo1234` |
| Pending approval | `pending@cee.edu` | `demo1234` |

Sandbox data lives in `localStorage` (`cee_db_v3`). Clear site data to reset it. The seed includes
today's model-exam paper and one demo attempt by Aayush, so the daily leaderboard has data.

---

## Security notes

- Passwords are SHA-256 hashed (`hashPassword`); sessions are 24-hour tokens with a one-device lock
  and a login rate limit (5 failures → 2-minute lockout, via `CacheService`).
- Every privileged call re-validates the session server-side; teacher-only endpoints check the role.
- Exam options, question sets and scores are all derived server-side; submissions are idempotent and
  late/auto-submitted attempts are flagged (2-minute grace). Model-exam submissions are only scored
  against the server-stored paper for that date.
- Sheets writes are serialised with `LockService`.

---

## Subjects and topic codes (MECEE-BL 2026)

| Subject | Topic codes |
| :--- | :--- |
| Zoology | Z1–Z8 |
| Botany | B1–B9 |
| Chemistry | C1–C5 |
| Physics | P1–P6 |
| MAT | A1–A4 |

Codes are defined in `TOPICS` (`index.html`) and `TOPICS_` (`cee_mock_all_in_one.gs`); edit both to
match your college's micro-syllabus. The unit names and per-unit question counts follow the official
MECEE-BL 2026 syllabus (third revision, April 28, 2026) — see the in-app syllabus browser.
