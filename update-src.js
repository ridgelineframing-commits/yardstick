#!/usr/bin/env node
// Sync the standalone Yardstick web app into the desktop shell.
//
// Yardstick is authored as a single HTML file that loads pdf.js / xlsx / jsPDF
// from public CDNs. The desktop build must run fully offline, so this script
// copies that file into src/index.html and rewrites every CDN <script> URL to
// the copy bundled under src/vendor/.
//
// Usage:  node update-src.js [path-to-source.html]
// Default source: ../Yardstick_Takeoff_v3.html (the web authoring copy).

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'Yardstick_Takeoff_v3.html');
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
    `  Pass the path explicitly:  node update-src.js /path/to/Yardstick_Takeoff_v3.html`);
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

fs.writeFileSync(OUT, html);
console.log(`✓ src/index.html refreshed from ${path.relative(process.cwd(), SRC)} (offline-ready).`);
