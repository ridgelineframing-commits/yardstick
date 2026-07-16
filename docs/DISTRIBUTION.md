# Distribution: auto-update & licensing

The two pieces of turning Yardstick into a sellable product. Neither is wired up
yet — both need accounts/keys that are business decisions. This is the
implementation plan; each is independent and can be added on its own.

---

## Auto-update (Tauri updater plugin)

Lets an installed copy detect a new release, download it, and self-install —
so customers don't re-download manually. Fits the existing GitHub-release flow
from [`.github/workflows/build.yml`](../.github/workflows/build.yml).

### One-time: generate an update signing keypair

Separate from the Authenticode cert in [`SIGNING.md`](SIGNING.md) — this key
signs the *update manifest* so clients only accept genuine updates.

```bash
npm run tauri signer generate -- -w ~/.tauri/yardstick-updater.key
```

- **Public key** → `tauri.conf.json` (committed, below).
- **Private key + password** → GitHub secrets `TAURI_SIGNING_PRIVATE_KEY` and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Never commit these.

### Config (`src-tauri/tauri.conf.json`)

```jsonc
"bundle": {
  "createUpdaterArtifacts": true          // emits the .sig alongside the .exe
},
"plugins": {
  "updater": {
    "pubkey": "<public key from above>",
    "endpoints": [
      "https://github.com/ridgelineframing-commits/yardstick/releases/latest/download/latest.json"
    ]
  }
}
```

### Rust (`src-tauri`)

```toml
# Cargo.toml
[dependencies]
tauri-plugin-updater = "2"
```

```rust
// main.rs
tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .run(tauri::generate_context!())
    .expect("error while running Yardstick");
```

Then trigger a check — either from Rust on startup, or from the app UI via the
`@tauri-apps/plugin-updater` JS API (add the capability/permission for it).

### CI

Add the signing secrets to the `windows` job's build step so `tauri build`
produces the signed updater artifacts:

```yaml
      - name: Build installer
        run: npm run build
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

On a `v*` tag, publish the `-setup.exe`, its `.sig`, and a `latest.json`
pointing at them. The `latest.json` manifest looks like:

```json
{
  "version": "1.1.0",
  "notes": "What changed",
  "pub_date": "2026-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<contents of the .sig file>",
      "url": "https://github.com/ridgelineframing-commits/yardstick/releases/download/v1.1.0/Yardstick_1.1.0_x64-setup.exe"
    }
  }
}
```

`tauri-apps/tauri-action` can generate and attach this automatically if you
switch the release step to it.

---

## Licensing (Lemon Squeezy)

Standard indie path: the storefront handles checkout, tax, and delivery, and
issues a license key per sale that the app validates.

### Store setup

1. Create the product in Lemon Squeezy and enable **License keys**.
2. On purchase the customer receives a key like `XXXX-XXXX-XXXX-XXXX`.

### In-app gate

Yardstick is a single HTML page that already persists to `localStorage`, so the
gate lives in [`app/index.html`](../app/index.html):

1. **First launch** — prompt for the license key, then activate it:
   `POST https://api.lemonsqueezy.com/v1/licenses/activate`
   with `license_key` and an `instance_name` (e.g. the machine name).
   On success store `instance_id` + a `licensed` flag.
2. **Later launches** — optionally
   `POST /v1/licenses/validate` to confirm it's still active, with an **offline
   grace period** (construction laptops aren't always online) so a failed
   network call doesn't lock a paid user out.
3. **Trial** — optionally allow N days or watermark exports before a key is
   entered.

### Notes

- A client-side check is bypassable by a determined user. For a pro tool at this
  price point a light gate is usually enough; if stronger protection is wanted,
  validate server-side and hand back a signed token the app verifies.
- Activation requires network on **first** launch — the offline promise applies
  to the takeoff work, not to initial activation. Say so in the purchase flow.
- Keep the license UI in `app/index.html` (the source of truth); it flows into
  the desktop build automatically via `update-src.js`.

## References

- Tauri v2 updater: <https://v2.tauri.app/plugin/updater/>
- Lemon Squeezy license API: <https://docs.lemonsqueezy.com/api/license-api>
