# Build Yardstick for Windows

## One-time setup

Install:

1. Node.js LTS
2. Rust using rustup
3. Microsoft C++ Build Tools with “Desktop development with C++”

## Verify and build

From the repository root:

```powershell
npm install
npm run verify
npm run agent:check
npm run build
```

The build command regenerates the offline `src/` bundle before Tauri compiles
the installer. The versioned result is:

`src-tauri\target\release\bundle\nsis\Yardstick_1.1.0_x64-setup.exe`

For a quick native development run, use `npm run dev`.

## Release notes

- Change the version only in `package.json`; Tauri reads it from there.
- Test a fresh install and uninstall on Windows before distributing.
- Code-sign the installer before customer distribution to reduce SmartScreen
  warnings. See `docs/SIGNING.md`.
