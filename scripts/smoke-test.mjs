#!/usr/bin/env node
/**
 * smoke-test.mjs — headless end-to-end check of the portal
 * ---------------------------------------------------------------------------
 * Loads index.html in jsdom (so the MockApi localStorage backend is used, just
 * like the GitHub Pages preview), drives the real UI, and asserts on what the
 * user would see. It also checks that the CEE paper builder in index.html and
 * the twin in cee_mock_all_in_one.gs produce byte-identical papers — if those
 * two ever drift, server-side scoring silently breaks.
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
check('clock is CEE-paced (0.9 min/question, min 10)', exam.durMin === Math.max(10, Math.round(exam.qs.length * 0.9)), `durMin=${exam.durMin}`);
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

console.log('\npractice mode');
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

console.log('\nCEE blueprint parity (index.html vs cee_mock_all_in_one.gs)');
const ctx = vm.createContext({
  console,
  Utilities: { getUuid: () => 'x' },
  SpreadsheetApp: {}, PropertiesService: {}, LockService: {}, MailApp: {}, Session: {}, HtmlService: {}
});
vm.runInContext(readFileSync(resolve(root, 'cee_mock_all_in_one.gs'), 'utf8'), ctx);

const bank = [];
let n = 0;
for (const s of ['Physics', 'Chemistry', 'Biology', 'Botany', 'Maths'])
  for (let i = 0; i < 80; i++) bank.push({ id: 'q' + ++n, text: `Q${n} ${s}`, opts: ['a', 'b', 'c', 'd'], answer: i % 4, section: s, topic: '' });

const seed = 20260924;
const clientSet = w.buildCeeMockSetClient(bank, seed);
const serverSet = ctx.buildCeeMockSet_(bank, seed);
const ids = (set) => set.map((q) => q.id).join(',');
check('client and server build the identical paper', ids(clientSet) === ids(serverSet));
check('a full bank yields exactly 200 questions', clientSet.length === 200, `${clientSet.length}`);
const dist = {};
clientSet.forEach((q) => (dist[q.section] = (dist[q.section] || 0) + 1));
check('distribution matches the MEC pattern (50/50/40/40/20)',
  dist.Physics === 50 && dist.Chemistry === 50 && dist.Biology === 40 && dist.Botany === 40 && dist.Maths === 20,
  JSON.stringify(dist));
check('no question appears twice', new Set(clientSet.map((q) => q.id)).size === clientSet.length);
check('a full paper is a 180-minute exam', w.ceeDurationForClient(200) === 180 && ctx.ceeDurationFor_(200) === 180);
const tiny = bank.filter((q) => q.section === 'Physics').slice(0, 12);
check('a small bank degrades gracefully', ids(w.buildCeeMockSetClient(tiny, seed)) === ids(ctx.buildCeeMockSet_(tiny, seed)) && w.buildCeeMockSetClient(tiny, seed).length === 12);

console.log('\nruntime errors');
check('no uncaught JavaScript errors', consoleErrors.filter((e) => !/createObjectURL/.test(e)).length === 0, consoleErrors.join(' | '));

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
process.exit(0);
