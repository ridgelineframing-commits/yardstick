# Yardstick

**PDF markup & plan takeoff for residential construction — by Ridgeline.**

Open a plan PDF, set the scale, and trace rooms, doors, windows, plumbing,
electrical, and structure straight onto the drawing. Yardstick tallies areas,
lineal footage, fixture counts, and a material takeoff, then exports to Excel,
a marked-up PDF, or DXF. It runs fully offline as a native Windows app.

---

## Architecture

Yardstick is a **single self-contained HTML file** wrapped in a thin
[Tauri v2](https://tauri.app) desktop shell. There is no framework, bundler, or
backend — the app is plain HTML/CSS/JS driving an SVG overlay on a canvas.

```
┌─────────────────────────────────────────────────────────┐
│  Tauri shell (src-tauri/)  — native WebView + NSIS setup  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  src/index.html  — the entire app (UI + logic)       │  │
│  │  src/vendor/     — pdf.js · xlsx · jsPDF (offline)    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

| Path | Role |
|------|------|
| `src/index.html` | The whole application: UI, calibration, tracing, auto room-detect, PDF text scan, and all exporters. |
| `src/vendor/` | Bundled third-party libs so the app works with no internet: `pdf.min.js` + `pdf.worker.min.js` (render plans), `xlsx.bundle.js` (Excel export), `jspdf.umd.min.js` (PDF export). |
| `src-tauri/` | Tauri config, Rust entry point (`main.rs` — just opens the WebView), icons, and the NSIS bundle target. |
| `update-src.js` | Syncs the web authoring copy of the app into `src/index.html`, rewriting CDN `<script>` URLs to the offline `vendor/` copies. |

### Source of truth

The app is authored as a web page (`../Yardstick_Takeoff_v3.html`, kept outside
this repo). `npm run update-src` copies it into `src/index.html` and swaps its
CDN script tags for the local `vendor/` copies. **`src/index.html` is therefore a
generated artifact** — apply lasting changes to the web authoring copy and re-run
`update-src`, or they will be overwritten on the next sync. (See
[Recommendations](#recommendations) for bringing this in-repo.)

---

## Develop

```bash
npm install
npm run dev            # opens the app in a native window (hot-reloads on save)
```

## Build the Windows installer

Requires Node.js, Rust, and the MSVC C++ Build Tools. See
[`README-BUILD.md`](README-BUILD.md) for the full one-time setup.

```bash
npm run update-src     # refresh src/index.html from the web authoring copy
npm run build          # compile + package the .exe installer
```

The installer lands at:

```
src-tauri/target/release/bundle/nsis/Yardstick_<version>_x64-setup.exe
```

That single `.exe` installs Yardstick (taskbar + Start-menu entry, ruler icon)
and runs offline.

To cut a release, bump `version` in both `package.json` and
`src-tauri/tauri.conf.json` (and `src-tauri/Cargo.toml`) before building.

---

## Recommendations

Ideas for further development, roughly in priority order:

1. **Bring the app source in-repo.** Today `src/index.html` is generated from a
   file outside version control, so the committed artifact can silently drift.
   Make the authored source live here (e.g. `app/index.html` with CDN tags, kept
   under git) and let `update-src` vendor it into `src/` at build time.
2. **CI to build the installer.** A GitHub Actions workflow on a Windows runner
   that runs `update-src` + `tauri build` and attaches the `.exe` to a release
   removes the manual per-machine build.
3. **Single-source the version.** It's set in three files; derive two from one.
4. **Code signing.** An Authenticode certificate clears the Windows SmartScreen
   "unknown publisher" warning for customers.
5. **Trim unused Rust deps.** `src-tauri/Cargo.toml` declares `serde` /
   `serde_json` that `main.rs` doesn't use; drop them once verified on a build
   machine.
6. **Auto-update + licensing.** Tauri's updater plugin plus a license-key check
   (e.g. Lemon Squeezy) is the standard indie-app distribution path.
