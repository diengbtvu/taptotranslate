#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

let failed = 0;
for (const file of walk(ROOT)) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.error('FAIL', path.relative(ROOT, file), r.stderr.trim()); }
}

const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
for (const k of ['manifest_version','name','version']) {
  if (!(k in m)) { failed++; console.error('manifest missing:', k); }
}
const refs = [...(m.background?.scripts||[]), ...(m.content_scripts||[]).flatMap(c=>[...(c.js||[]),...(c.css||[])])];
for (const f of refs) {
  if (!fs.existsSync(path.join(ROOT, f))) { failed++; console.error('missing file:', f); }
}

if (failed) { console.error(failed + ' issue(s)'); process.exit(1); }
console.log('All checks passed.');
