# Windows publisher verification

Smart App Control may block unsigned Flow installers because it cannot verify the publisher. This is separate from a Flow runtime error. A checksum verifies a downloaded file against a known hash; it does not establish publisher trust. Current public 2.6.0 and candidate 2.6.1 packages are unsigned.

## What the maintainer needs

Obtain a code-signing identity from a trusted certificate provider, or set up Microsoft Artifact Signing after its identity and eligibility checks. A self-signed certificate does not solve distribution trust. Costs and eligibility depend on the provider. Never put private keys, passwords or certificate exports in this repository or a support report.

The prepared local path uses an installed Current User code-signing certificate with an accessible private key and Windows SDK Signing Tools. Hardware-backed identities can work through their installed provider. Run in a **disposable clean release checkout**, after dependencies and the native helper are prepared:

```powershell
./scripts/build-signed-windows.ps1 -CertificateThumbprint <your certificate thumbprint>
```

The script signs untrusted bundled executable payloads with SHA-256 and a timestamp, retains already valid third-party signatures, records the unsigned and signed aria2 fingerprints, and builds both Windows editions with mandatory signing. It then checks the installer, portable launcher and every executable/DLL/native module in the unpacked application. `release/Windows-Signatures.json` records exact output hashes and publisher identities. The signed build fails if credentials are missing or Windows cannot validate any executable payload. Certificate authorization remains the maintainer's responsibility; valid signatures do not guarantee acceptance by every security product.

This path is prepared but **has not been executed with a trusted certificate**. Artifact Signing requires its separate service identity configuration; it is not silently substituted by this certificate-store script. Do not publish a release as signed until the receipt passes and installation is tested on a Smart App Control enabled machine. Flow does not disable Windows security or ask ordinary users to do so.

References: [Microsoft signing guidance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control), [Smart App Control FAQ](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions).
