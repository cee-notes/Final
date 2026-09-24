#!/usr/bin/env node
/**
 * build-gas.mjs — inject index.html into cee_mock_all_in_one.gs
 * ---------------------------------------------------------------------------
 * The Apps Script web app serves the frontend from the base64 string
 * `EMBEDDED_HTML` at the top of cee_mock_all_in_one.gs. Editing index.html
 * without re-running this script means the deployed portal keeps serving the
 * previous build — which is exactly what had happened before.
 *
 *   node scripts/build-gas.mjs          rebuild the embed
 *   node scripts/build-gas.mjs --check  fail (exit 1) if the embed is stale
 *
 * Wired up as `npm run build` / `npm run build:check`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = resolve(root, 'index.html');
const GS = resolve(root, 'cee_mock_all_in_one.gs');
const CHUNK = 240; // keep source lines readable in the Apps Script editor

const check = process.argv.includes('--check');

const html = readFileSync(HTML, 'utf8');
const gs = readFileSync(GS, 'utf8');

const marker = /var EMBEDDED_HTML = [\s\S]*?;\r?\n/;
const match = gs.match(marker);
if (!match) {
  console.error('✗ Could not find the `var EMBEDDED_HTML = ...;` declaration in cee_mock_all_in_one.gs');
  process.exit(2);
}

/** Current embed, decoded, so we can tell whether anything actually changed. */
function decodeCurrent(decl) {
  const parts = [...decl.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  try {
    return Buffer.from(parts.join(''), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

const current = decodeCurrent(match[0]);
if (current === html) {
  console.log('✓ cee_mock_all_in_one.gs is already in sync with index.html');
  process.exit(0);
}

if (check) {
  console.error('✗ EMBEDDED_HTML in cee_mock_all_in_one.gs is stale — run `npm run build`');
  process.exit(1);
}

const b64 = Buffer.from(html, 'utf8').toString('base64');
const lines = [];
for (let i = 0; i < b64.length; i += CHUNK) lines.push(`'${b64.slice(i, i + CHUNK)}'`);
const decl = `var EMBEDDED_HTML = ${lines.join(' +\n')};\n`;

writeFileSync(GS, gs.replace(marker, decl), 'utf8');

const kb = (b64.length / 1024).toFixed(1);
console.log(`✓ Embedded index.html (${kb} KB base64, ${lines.length} lines) into cee_mock_all_in_one.gs`);
