// Pulls the latest Yardstick_Takeoff_v3.html from the folder above and
// rewrites the CDN script tags to the offline vendor/ copies.
const fs = require('fs');
const path = require('path');
let h = fs.readFileSync(path.join(__dirname, '..', 'Yardstick_Takeoff_v3.html'), 'utf8');
h = h.replace('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'vendor/pdf.min.js');
h = h.replace('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', 'vendor/xlsx.bundle.js');
h = h.replace('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js');
h = h.replace('pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";', 'pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";');
if (/cdnjs|jsdelivr/.test(h)) { console.error('WARNING: a CDN reference was not rewritten — check the script tags.'); }
fs.writeFileSync(path.join(__dirname, 'src', 'index.html'), h);
console.log('src/index.html refreshed from ../Yardstick_Takeoff_v3.html');
