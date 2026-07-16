# Code signing (Windows)

Unsigned installers trigger the Windows **SmartScreen "unknown publisher"**
warning, which scares off customers and, at higher SmartScreen reputation
thresholds, blocks the install outright. Signing the `.exe` with an Authenticode
certificate attaches a verified publisher identity and removes the warning
(reputation still builds over the first few hundred downloads with an OV cert;
an EV cert clears SmartScreen immediately).

This is **not enabled yet** — it needs a certificate, which is a paid purchase
tied to Ridgeline's legal identity. This doc is the runbook for turning it on.

## 1. Get a certificate

Pick one:

| Option | Cost | SmartScreen | Notes |
|--------|------|-------------|-------|
| **Azure Trusted Signing** | ~$10/mo | Good reputation, fast | Microsoft-managed, no cert file to guard. **Recommended** for a small ISV. Requires a 3+ year old org or individual verification. |
| **OV certificate** (Sectigo, DigiCert…) | ~$100–300/yr | Builds over time | Traditional `.pfx` file (or hardware token on newer OV). |
| **EV certificate** | ~$250–600/yr | Cleared immediately | Ships on a hardware token / cloud HSM; hardest to automate in CI. |

Requires a registered business identity (Ridgeline Construction) matching the
`identifier`/publisher used in the app.

## 2. Configure Tauri

Signing is driven by `bundle.windows` in `src-tauri/tauri.conf.json`. Add **one**
of the following (leave signing out entirely until a cert exists — an empty/bad
block fails the build).

### Azure Trusted Signing (recommended)

```jsonc
"bundle": {
  "windows": {
    "signCommand": "trusted-signing-cli -e https://<region>.codesigning.azure.net -a <account> -c <cert-profile> %1"
  }
}
```

Install `trusted-signing-cli` on the runner (`cargo install trusted-signing-cli`)
and authenticate with the Azure credentials below. Tauri passes each artifact
path in place of `%1`.

### Certificate file / thumbprint

```jsonc
"bundle": {
  "windows": {
    "certificateThumbprint": "A1B2C3…",   // thumbprint of the installed cert
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

`timestampUrl` is important — it keeps already-signed installers valid after the
certificate itself expires.

## 3. Wire secrets into CI

Add to `.github/workflows/build.yml`'s `windows` job. **Never commit the cert or
its password** — only reference GitHub Actions secrets.

### Azure Trusted Signing

Store `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` as repo
secrets, then before the build step:

```yaml
      - name: Install signing CLI
        run: cargo install trusted-signing-cli
      - name: Build installer
        run: npm run build
        env:
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
```

### Certificate file (`.pfx`)

Store the cert as a base64 secret (`WINDOWS_CERT_BASE64`) plus its password
(`WINDOWS_CERT_PASSWORD`), then import it before building:

```yaml
      - name: Import signing certificate
        shell: pwsh
        run: |
          $bytes = [Convert]::FromBase64String("${{ secrets.WINDOWS_CERT_BASE64 }}")
          Set-Content cert.pfx -Value $bytes -AsByteStream
          Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My `
            -Password (ConvertTo-SecureString "${{ secrets.WINDOWS_CERT_PASSWORD }}" -AsPlainText -Force)
          Remove-Item cert.pfx
```

(`certificateThumbprint` in the config must match the imported cert.)

## 4. Verify

After a signed build, right-click the `.exe` → **Properties → Digital
Signatures** should list "Ridgeline …". Or on the runner:

```powershell
Get-AuthenticodeSignature .\Yardstick_*-setup.exe | Format-List
```

## References

- Tauri v2 Windows code signing: <https://v2.tauri.app/distribute/sign/windows/>
- Azure Trusted Signing: <https://learn.microsoft.com/azure/trusted-signing/>
