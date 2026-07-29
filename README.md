# Yardstick

PDF takeoff and plan markup for residential construction, by Ridgeline.

Open a plan PDF, set its scale, and trace rooms, openings, fixtures, electrical,
and structural items directly over the drawing. Yardstick totals quantities and
areas, compares traced areas with plan-stated areas, and exports Excel, DXF, or
a marked-up PDF. The Windows app and installed PWA work offline.

## What is new in 1.1

- Guided Open → Scale → Review → Export workflow.
- Undo/redo, selected-item inspector, clearer mobile controls, keyboard focus
  treatment, accessible drawers and dialogs, and non-blocking status messages.
- A local QA Copilot that finds missing scale, invalid opening sizes, duplicate
  points, naming problems, area outliers, and traced-versus-stated discrepancies.
  Findings never modify a takeoff without an explicit user action.
- Safer imported-job normalization, corrected feet/inches parsing, render-race
  cancellation, automatic PDF fit, and a restrictive desktop content policy.
- Modular, tested core and QA logic plus an optional Cloudflare Agent endpoint
  for project-scoped review history.

## Web app

The GitHub Pages workflow publishes the generated offline bundle from `src/`.
After the first visit, its service worker keeps the app shell available offline:

https://ridgelineframing-commits.github.io/yardstick/

## Project layout

| Path | Role |
| --- | --- |
| `app/index.html` | Main application UI and drawing engine. |
| `app/core.js` | Parsing, formatting, cloning, and imported-job normalization. |
| `app/qa-agent.js` | Deterministic, local QA review and safe proposals. |
| `src/` | Generated offline bundle; do not edit directly. |
| `src-tauri/` | Tauri v2 Windows shell and installer configuration. |
| `agent/` | Optional Cloudflare Agent API for durable review history. |
| `tests/` | Node tests for core behavior, QA, syntax, and bundle integrity. |
| `update-src.js` | Builds `src/` and rewrites third-party scripts to vendored copies. |

## Develop and verify

```powershell
npm install
npm run verify
npm run agent:check
npm run dev
```

`npm run verify` generates the offline bundle and runs the tests. The application
does not send plans to the optional agent: only a structured takeoff snapshot is
accepted. Before exposing that endpoint publicly, configure authentication and
the allowed origin described in `agent/README.md`.

## Build the Windows installer

Install Node.js, Rust, and the Microsoft C++ Build Tools, then run:

```powershell
npm run build
```

The installer is written to:

`src-tauri/target/release/bundle/nsis/Yardstick_<version>_x64-setup.exe`

`package.json` is the version source of truth. Code signing is still recommended
before public distribution; see `docs/SIGNING.md`.
