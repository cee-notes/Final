# MEC CEE Bachelor Level Practice Portal

A free mock-test platform for **MEC CEE** (Nepal Medical Education Commission Common Entrance
Examination) aspirants — MBBS, BDS, Nursing and Public Health. It runs CEE-pattern papers with
server-side scoring, per-topic analytics and a teacher dashboard, on infrastructure that costs
nothing: GitHub Pages for the frontend, Google Apps Script + Sheets for the backend.

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
messages, scoring rules, rate limits and duplicate protection. That means the Pages deployment is a
fully usable demo, and the same UI code is shipped to production without a build step for the
browser.

---

## Exam rules (MEC CEE pattern)

| | |
| :--- | :--- |
| Full paper | **200 MCQs**, subject-grouped like the real exam |
| Weighting | Physics 50 · Chemistry 50 · Biology 40 · Botany 40 · MAT 20 |
| Duration | **0.9 min per question** — a full 200-question paper is 180 minutes (minimum 10 min) |
| Marking | **+1** correct · **−0.25** wrong · **0** skipped |
| Practice mode | choose subjects, topic focus, question count, optional timer, optional negative marking, optional instant feedback |

If the bank cannot fill a subject quota, the paper is topped up from the remaining questions and the
clock shrinks to match — a 12-question bank produces a 12-question, 11-minute mock rather than a
3-hour one.

Scoring is **always** server-side. The paper is rebuilt deterministically from a seed
(`userId | startedAt | options signature`) when an attempt is submitted, so the client can never
change its own options, questions or marks. The blueprint exists twice — `CEE_BLUEPRINT` in
`index.html` and `CEE_BLUEPRINT_` in `cee_mock_all_in_one.gs` — and `npm test` asserts the two build
byte-identical papers.

---

## Features

### For students
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
- Custom practice with instant feedback, and in-app messaging to the teacher.

### For teachers
- Approve, reject and device-unlock students; searchable user table.
- Class analytics: participation, class accuracy, subject bars, class-wide weak topics, per-student
  progress table, CSV export.
- Per-student drill-down with printable per-attempt score reports and direct email.
- Question bank CRUD with duplicate protection and image upload (auto-downscaled to ~48 KB).
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
├── index.html                # the entire frontend (markup + CSS + JS + MockApi)
├── cee_mock_all_in_one.gs    # Apps Script backend + base64 copy of index.html (EMBEDDED_HTML)
├── model_exam_engine.gs      # OPTIONAL standalone engine — see the warning below
├── scripts/
│   ├── build-gas.mjs         # re-embeds index.html into the .gs file
│   └── smoke-test.mjs        # headless end-to-end tests (jsdom)
├── package.json              # dev scripts only — the site itself has no dependencies
└── CNAME                     # custom domain for GitHub Pages
```

> ⚠️ `model_exam_engine.gs` is a **separate, self-contained** experiment with its own sheets
> (`ModelExamQuestions`, `ModelExamResults`) and its own column layout. The portal does not use it.
> Do not paste it into the same Apps Script project as `cee_mock_all_in_one.gs`.

---

## Deploying

### 1. GitHub Pages (demo / sandbox mode)
Push to `main` and enable Pages — `index.html` is self-contained, so there is nothing to build.

### 2. Google Apps Script (real backend)
1. Create or open a Google Sheet; it becomes the database.
2. **Extensions → Apps Script**, delete the default code and paste **all** of
   `cee_mock_all_in_one.gs`.
3. **Deploy → New deployment → Web app** — *Execute as: Me*, *Who has access: Anyone*.
4. Open the web app URL. The `Users`, `Questions`, `Attempts`, `Responses` and `Messages` tabs are
   created automatically and the bank is seeded with 8 demo questions.
5. Register an account, then change its `Role` cell from `student` to `teacher` to bootstrap the
   first teacher.

**After changing `index.html`, always run `npm run build`.** The web app serves the frontend from the
`EMBEDDED_HTML` base64 string inside the `.gs` file; without the rebuild, the deployment keeps
serving the previous version.

---

## Development

```bash
npm install          # dev-only (jsdom) — the portal itself has zero runtime dependencies
npm run serve        # http://localhost:8080 — runs in sandbox mode with demo data
npm test             # 48 headless end-to-end checks + client/server blueprint parity
npm run build        # re-embed index.html into cee_mock_all_in_one.gs
npm run build:check  # CI-friendly: fails if the embed is stale
```

`npm test` drives the real UI in jsdom: login, mock exam, answering, marking, autosave, submission,
review, practice with instant feedback, the teacher dashboard and the question bank — and then
compares the paper built by the client against the one built by the Apps Script backend.

### Demo accounts (sandbox mode)

| Role | Email | Password |
| :--- | :--- | :--- |
| Teacher | `teacher@cee.edu` | `demo1234` |
| Student | `student@cee.edu` · `aayush@cee.edu` · `sabina@cee.edu` | `demo1234` |
| Pending approval | `pending@cee.edu` | `demo1234` |

Sandbox data lives in `localStorage` (`cee_db_v1`). Clear site data to reset it.

---

## Security notes

- Passwords are SHA-256 hashed (`hashPassword`); sessions are 24-hour tokens with a one-device lock
  and a login rate limit (5 failures → 2-minute lockout).
- Every privileged call re-validates the session server-side; teacher-only endpoints check the role.
- Exam options, question sets and scores are all derived server-side; submissions are idempotent and
  late/auto-submitted attempts are flagged.
- Sheets writes are serialised with `LockService`.

---

## Subjects and topic codes

| Subject | Topic codes |
| :--- | :--- |
| Physics | P1–P8 |
| Chemistry | C1–C7 |
| Biology (Zoology) | Z1–Z9 |
| Botany | B1–B6 |
| Maths / MAT | M1–M9 |

Codes are defined in `TOPICS` (`index.html`) and `TOPICS_` (`cee_mock_all_in_one.gs`); edit both to
match your college's micro-syllabus.
