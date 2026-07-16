# Yardstick Desktop — build a Windows .exe installer

This folder turns `Yardstick_Takeoff_v3.html` into a real installable Windows app
(taskbar icon, Start-menu entry, works fully offline — the pdf.js / Excel / PDF
libraries are bundled in `src/vendor/`, no internet needed at runtime).

## One-time setup (about 15 minutes)

1. **Node.js** — install from https://nodejs.org (LTS).
2. **Rust** — install from https://rustup.rs (accept defaults).
3. **Microsoft C++ Build Tools** — https://visualstudio.microsoft.com/visual-cpp-build-tools/
   → check "Desktop development with C++" during install. (Rust needs this on Windows.)

## Build

Open a terminal in this folder (`Yardstick-Desktop`) and run:

    npm install
    npm run update-src     # copies the latest ../Yardstick_Takeoff_v3.html into the app
    npm run build

First build takes ~5–10 min (Rust compiles everything once); later builds are fast.

The installer lands in:

    src-tauri\target\release\bundle\nsis\Yardstick_1.0.0_x64-setup.exe

That single .exe is what you hand to a customer. Double-click installs Yardstick
with the ruler icon, and it runs offline.

## Day-to-day

Whenever the HTML app changes, just:

    npm run update-src
    npm run build

To test without building an installer: `npm run dev` (opens the app in a window).

## Selling it (when ready)

- **Lemon Squeezy** (~5% + fees) or **Gumroad** (~10%) — upload the setup .exe,
  they handle checkout, sales tax, and delivery. Lemon Squeezy also has a
  license-key API: generate a key per sale, and the app can check it on first
  launch. That's the standard indie-app path.
- Bump `version` in `src-tauri/tauri.conf.json` + `Cargo.toml` for each release.
- Optional later: code-signing certificate (~$100–300/yr) removes the Windows
  SmartScreen "unknown publisher" warning.
