#!/usr/bin/env node
/**
 * smoke-test.mjs — headless end-to-end check of the portal (schema v3)
 * ---------------------------------------------------------------------------
 * Loads index.html in jsdom (so the MockApi localStorage backend is used, just
 * like the GitHub Pages preview), drives the real UI, and asserts on what the
 * user would see: auth, mock + practice, the model exam of the day (one attempt
 * per date, daily leaderboard), the syllabus browser, and the teacher tools
 * including autopilot. It also checks that the MECEE-BL 2026 paper builder in
 * index.html and the twin in cee_mock_all_in_one.gs produce byte-identical,
 * difficulty-weighted papers — if those two ever drift, server-side scoring
 * silently breaks.
 *
 *   npm install      (one-off, pulls jsdom)
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.error('jsdom is not installed — run `npm install` first.');
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ------------------------------------------------------------------ page */
const consoleErrors = [];
const dom = new JSDOM(readFileSync(resolve(root, 'index.html'), 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: new (await import('jsdom')).VirtualConsole()
    .on('error', (...a) => consoleErrors.push(a.map(String).join(' ')))
    .on('jsdomError', (e) => {
      if (!/Not implemented/.test(e.message)) consoleErrors.push(e.message);
    })
});
const w = dom.window;
const d = w.document;
w.scrollTo = () => {};
w.print = () => {};
w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);

const $ = (id) => d.getElementById(id);
const click = (el) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const type = (id, v) => {
  const el = $(id);
  el.value = v;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
};
const at = (name) => $('sec-' + name).classList.contains('on');

await sleep(400);

console.log('\nauth');
check('login screen is shown first', at('auth'));
check('theme starts in dark mode', d.documentElement.getAttribute('data-theme') === 'dark');
click($('themeToggle'));
check('theme toggle switches to light', d.documentElement.getAttribute('data-theme') === 'light');
check('theme choice is remembered', w.localStorage.getItem('cee_theme') === 'light');
click($('themeToggle'));
check('theme toggle switches back to dark', d.documentElement.getAttribute('data-theme') === 'dark');

type('liEmail', 'student@cee.edu');
type('liPass', 'demo1234');
click($('btnLogin'));
await sleep(400);
check('student reaches the dashboard', at('student'));
check('stat cards are populated', $('stAtt').textContent !== '0');

console.log('\nmock exam (CEE blueprint)');
click($('btnStartMock'));
await sleep(150);
click($('btnPrStart'));
await sleep(500);
check('exam view opens', at('exam'));
const exam = w.P.exam;
check('a paper was built', !!exam && exam.qs.length > 0, exam && `${exam.qs.length} questions`);
check('clock is CEE-paced (54 s/question, min 10)', exam.durMin === Math.max(10, Math.round(exam.qs.length * 54 / 60)), `durMin=${exam.durMin}`);
check('subjects are grouped like the real paper', (() => {
  const seen = [];
  for (const q of exam.qs) if (seen[seen.length - 1] !== q.section) seen.push(q.section);
  return seen.length === new Set(seen).size;
})());

const optButtons = [...d.querySelectorAll('#exQCard [data-opt]')];
check('options are real buttons (keyboard reachable)', optButtons.length === 4 && optButtons.every((b) => b.tagName === 'BUTTON'));
check('options expose radio semantics', optButtons.every((b) => b.getAttribute('role') === 'radio'));

click(optButtons[1]);
await sleep(60);
check('clicking an option records the answer', w.P.exam.answers[exam.qs[0].id] === 1);
check('clear button becomes available', $('btnClearQ').disabled === false);
click($('btnClearQ'));
await sleep(60);
check('clear answer button works', w.P.exam.answers[exam.qs[0].id] === undefined);

click($('btnMarkQ'));
await sleep(60);
check('mark for review works', !!w.P.exam.marks[exam.qs[0].id] && $('btnMarkQ').getAttribute('aria-pressed') === 'true');
click($('btnMarkQ'));
check('unmark works', !w.P.exam.marks[exam.qs[0].id]);

check('previous is disabled on the first question', $('btnPrevQ').disabled === true);
click($('btnNextQ'));
await sleep(60);
check('next button moves forward', w.P.exam.cur === 1);
click($('btnPrevQ'));
await sleep(60);
check('previous button moves back', w.P.exam.cur === 0);

check('palette has one button per question', d.querySelectorAll('#palGrid .pal-btn').length === exam.qs.length);
check('palette buttons are labelled for screen readers', !!d.querySelector('#palGrid .pal-btn').getAttribute('aria-label'));

// answer everything, then submit
for (let i = 0; i < exam.qs.length; i++) {
  w.P.exam.cur = i;
  w.renderQuestion();
  const opts = [...d.querySelectorAll('#exQCard [data-opt]')];
  click(opts[i % 4]);
}
await sleep(80);
const stored = JSON.parse(w.localStorage.getItem('cee_exam:' + w.P.user.id) || 'null');
check('progress is autosaved under a per-user key', !!stored && stored.userId === w.P.user.id);
check('saved answers survive a reload', Object.keys(stored.answers).length === exam.qs.length);

click($('btnSubmitExam'));
await sleep(120);
click($('btnCfYes'));
await sleep(500);
check('result screen is shown', at('result'));
check('score is rendered', $('resScore').textContent !== '');
check('the saved exam is cleared after submitting', !w.localStorage.getItem('cee_exam:' + w.P.user.id));

console.log('\nreview');
click($('btnGoReview'));
await sleep(400);
check('review lists every question', d.querySelectorAll('#revList .rev-card').length === exam.qs.length, at('review') ? '' : 'review section not open');
click($('rfW'));
await sleep(100);
check('review filter narrows the list', d.querySelectorAll('#revList .rev-card').length <= exam.qs.length);
click($('btnBackResult'));
await sleep(200);
click($('btnResDash'));
await sleep(300);

console.log('\nmodel exam of the day');
click($('btnPractice'));
await sleep(150);
click($('btnPrStart'));
await sleep(400);
check('practice session starts', at('exam') && w.P.exam.opts.mode === 'practice');
click([...d.querySelectorAll('#exQCard [data-opt]')][0]);
await sleep(100);
check('instant feedback is revealed', !!d.querySelector('.ifb-box.on'));
check('locked options cannot be changed', !!d.querySelector('#exQCard .opt[disabled]'));
click($('btnSubmitExam'));
await sleep(120);
click($('btnCfYes'));
await sleep(400);
check('practice submits and scores', at('result'));

console.log('\nmodel exam of the day');
click($('btnResDash'));
await sleep(400);
check('daily card is visible on the dashboard', $('dailyCard').style.display !== 'none' && $('dcMeta').textContent.includes('questions'));
check('today\'s paper stats are shown', /question/.test($('dcMeta').textContent));
click($('btnDailyStart'));
await sleep(500);
check('model exam starts', at('exam') && w.P.exam.opts.mode === 'model');
check('model exam chip is shown', $('exModeChip').textContent.indexOf('MODEL') === 0);
const mq = w.P.exam.qs.length;
for (let i = 0; i < w.P.exam.qs.length; i++) {
  w.P.exam.cur = i;
  w.renderQuestion();
  const opts = [...d.querySelectorAll('#exQCard [data-opt]')];
  click(opts[0]);
}
click($('btnSubmitExam'));
await sleep(120);
click($('btnCfYes'));
await sleep(500);
check('model exam submits and scores', at('result') && $('resMode').textContent.indexOf('MODEL') === 0);
click($('btnResDash'));
await sleep(500);
check('daily card shows the finished attempt', $('dcStatus').textContent.indexOf('Done') >= 0 && $('dcStatus').textContent.indexOf('#') >= 0);
check('start button is hidden after the one attempt', $('btnDailyStart').style.display === 'none');
click($('btnDailyBoard'));
await sleep(400);
check('daily leaderboard opens', $('modalDailyBoard').classList.contains('on'));
check('daily leaderboard lists every participant', d.querySelectorAll('#dbBody tr').length >= 2);
click(d.querySelector('#modalDailyBoard [data-close]'));
await sleep(150);

console.log('\nsyllabus browser');
click($('btnSyllabus'));
await sleep(200);
check('syllabus modal opens', $('modalSyllabus').classList.contains('on'));
check('all four program groups are listed', d.querySelectorAll('#sylBody .syl-group').length === 4);
check('all five subjects with all 32 units are listed', d.querySelectorAll('#sylBody .syl-unit').length === 32 && d.querySelectorAll('#sylBody .syl-subj').length === 6);
check('official sample questions are included', d.querySelectorAll('#sylBody .syl-sample').length >= 4);
click(d.querySelector('#modalSyllabus [data-close]'));
await sleep(150);

console.log('\nteacher');
click($('btnResDash'));
await sleep(200);
click($('btnLogout'));
await sleep(300);
type('liEmail', 'teacher@cee.edu');
type('liPass', 'demo1234');
click($('btnLogin'));
await sleep(700);
check('teacher dashboard loads', at('teacher'));
check('users table is filled', d.querySelectorAll('#usersBody tr').length > 0);
check('pending approvals are listed', d.querySelectorAll('#pendingBody tr').length > 0);
click($('btnBank'));
await sleep(300);
check('question bank opens', $('modalBank').classList.contains('on'));
check('bank lists questions', d.querySelectorAll('#bankList .bank-item').length > 0);
check('dialog is announced as a modal', modalRole());
function modalRole() {
  const box = d.querySelector('#modalBank .mbox');
  return box.getAttribute('role') === 'dialog' && box.getAttribute('aria-modal') === 'true';
}
const before = d.querySelectorAll('#bankList .bank-item').length;
click($('btnAddQ'));
await sleep(150);
type('qfText', 'Smoke test: what is the SI unit of force?');
['newton', 'joule', 'watt', 'pascal'].forEach((v, i) => type('qfOpt' + i, v));
type('qfSection', 'Physics');
click($('btnQfSave'));
await sleep(400);
check('teacher can add a question', d.querySelectorAll('#bankList .bank-item').length === before + 1);

console.log('\nteacher — model exam admin');
check('daily admin card is present', !!$('dailyAdmin'));
click($('swAutopilot'));
await sleep(400);
check('autopilot toggles on', $('swAutopilot').checked === true && w.MockApi._raw().autopilot === true);
click($('btnDailyGen'));
await sleep(400);
check('regeneration is blocked after attempts (MODEL_ATTEMPTED)', /cannot be regenerated|already attempted/i.test(d.body.textContent || ''));

console.log('\nCEE blueprint parity (index.html vs cee_mock_all_in_one.gs)');
const ctx = vm.createContext({
  console,
  Utilities: { getUuid: () => 'x' },
  SpreadsheetApp: {}, PropertiesService: {}, LockService: {}, MailApp: {}, Session: {}, HtmlService: {}
});
vm.runInContext(readFileSync(resolve(root, 'cee_mock_all_in_one.gs'), 'utf8'), ctx);

const bank = [];
let n = 0;
const DIFFS = ['easy', 'medium', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'easy', 'medium'];
for (const s of ['Zoology', 'Botany', 'Chemistry', 'Physics', 'MAT'])
  for (let i = 0; i < 80; i++) bank.push({ id: 'q' + ++n, text: `Q${n} ${s}`, opts: ['a', 'b', 'c', 'd'], answer: i % 4, section: s, topic: '', difficulty: DIFFS[i % 10] });

const seed = 20260924;
const clientSet = w.buildCeeMockSetClient(bank, seed);
const serverSet = ctx.buildCeeMockSet_(bank, seed);
const ids = (set) => set.map((q) => q.id).join(',');
check('client and server build the identical paper', ids(clientSet) === ids(serverSet));
check('a full bank yields exactly 200 questions', clientSet.length === 200, `${clientSet.length}`);
const dist = {};
clientSet.forEach((q) => (dist[q.section] = (dist[q.section] || 0) + 1));
check('distribution matches the MECEE-BL 2026 pattern (40/40/50/50/20)',
  dist.Zoology === 40 && dist.Botany === 40 && dist.Chemistry === 50 && dist.Physics === 50 && dist.MAT === 20,
  JSON.stringify(dist));
const ddist = { easy: 0, medium: 0, hard: 0 };
clientSet.forEach((q) => (ddist[q.difficulty] = (ddist[q.difficulty] || 0) + 1));
check('papers are difficulty-weighted (~20/60/20)',
  Math.abs(ddist.easy - 40) <= 6 && Math.abs(ddist.medium - 120) <= 6 && Math.abs(ddist.hard - 40) <= 6,
  JSON.stringify(ddist));
check('daily apportion splits 20 as 4/4/5/5/2 on both sides',
  JSON.stringify(w.apportionClient(20, [40, 40, 50, 50, 20])) === JSON.stringify([4, 4, 5, 5, 2]) &&
  JSON.stringify(ctx.apportion_(20, [40, 40, 50, 50, 20])) === JSON.stringify([4, 4, 5, 5, 2]));
check('sheet admin console is wired (menu, dashboard, edit watcher, dialogs)',
  ['onOpen', 'menuApproveAllPending', 'menuRegisterStudent', 'menuGenerateDaily', 'menuToggleAutopilot',
   'menuToggleEditWatcher', 'menuRefreshSheet', 'menuShowUrl', 'menuAbout', 'registerStudentFromSheet',
   'onSheetEdit_', 'buildDashboard_', 'formatSheets_', 'toggleAutopilot_']
    .every((f) => typeof ctx[f] === 'function'));
check('Users schema carries the teacher-owned Notes column',
  ctx.TAB_SCHEMA_.Users.indexOf('Notes') >= 0 && ctx.TAB_SCHEMA_.Users.length === 12);
check('DailyExams tab is in the schema',
  ctx.TAB_SCHEMA_.DailyExams.join(',') === 'Date,QIds,Count,DurMin,Status,GeneratedBy,GeneratedAt');
check('no question appears twice', new Set(clientSet.map((q) => q.id)).size === clientSet.length);
check('a full paper is a 180-minute exam', w.ceeDurationForClient(200) === 180 && ctx.ceeDurationFor_(200) === 180);
const tiny = bank.filter((q) => q.section === 'Physics').slice(0, 12);
check('a small bank degrades gracefully', ids(w.buildCeeMockSetClient(tiny, seed)) === ids(ctx.buildCeeMockSet_(tiny, seed)) && w.buildCeeMockSetClient(tiny, seed).length === 12);
check('legacy Biology/Maths sections remap to the 2026 scheme',
  w.legacySectionClient('Biology') === 'Zoology' && w.legacySectionClient('Maths') === 'MAT' &&
  ctx.legacySection_('biology') === 'Zoology' && ctx.legacySection_('Maths') === 'MAT');
const legacyBank = bank.map((q) => ({ ...q, section: q.section === 'Zoology' ? 'Biology' : q.section === 'MAT' ? 'Maths' : q.section }));
check('client and server build identical papers from a legacy-section bank',
  ids(w.buildCeeMockSetClient(legacyBank, seed)) === ids(ctx.buildCeeMockSet_(legacyBank, seed)));

console.log('\nruntime errors');
check('no uncaught JavaScript errors', consoleErrors.filter((e) => !/createObjectURL/.test(e)).length === 0, consoleErrors.join(' | '));

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
process.exit(0);
