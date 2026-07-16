#!/usr/bin/env node
// Generate the desktop app entry (src/index.html) from the canonical source.
//
// Yardstick is authored once as app/index.html, which loads pdf.js / xlsx /
// jsPDF from public CDNs so it works as a plain web page. The desktop build
// must run fully offline, so this script copies that file to src/index.html and
// rewrites every CDN <script> URL to the copy bundled under src/vendor/.
//
// app/index.html is the source of truth (tracked in git). src/index.html is a
// generated build artifact and is produced automatically before dev/build via
// tauri.conf.json's beforeDevCommand / beforeBuildCommand.
//
// Usage:  node update-src.js [path-to-source.html]
// Default source: app/index.html

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'app', 'index.html');
const OUT = path.join(__dirname, 'src', 'index.html');

// CDN URL -> local vendored copy. Applied to every occurrence.
const REWRITES = [
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'vendor/pdf.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 'vendor/pdf.worker.min.js'],
  ['https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', 'vendor/xlsx.bundle.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js'],
];

if (!fs.existsSync(SRC)) {
  console.error(`✗ Source app not found:\n    ${SRC}\n` +
    `  Expected the canonical app at app/index.html, or pass a path explicitly:\n` +
    `    node update-src.js /path/to/index.html`);
  process.exit(1);
}

let html = fs.readFileSync(SRC, 'utf8');
for (const [from, to] of REWRITES) html = html.split(from).join(to);

// Every vendored library must be present, or the offline app white-screens.
const missing = REWRITES
  .map(([, rel]) => rel)
  .filter(rel => !fs.existsSync(path.join(__dirname, 'src', rel)));
if (missing.length) {
  console.error('✗ Missing vendored libraries (add them under src/vendor/):\n  ' + missing.join('\n  '));
  process.exit(1);
}

// Refuse to ship a build that would still reach out to a CDN at runtime.
const leftover = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.exec(html);
if (leftover) {
  console.error(`✗ A CDN reference ("${leftover[0]}") was not rewritten.\n` +
    `  Add its URL to REWRITES in update-src.js so the desktop build stays offline, then re-run.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`✓ src/index.html generated from ${path.relative(process.cwd(), SRC)} (offline-ready).`);
