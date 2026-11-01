# Windows publisher verification

Windows application control may block unsigned Flow installers **or a native module loaded after launch**. A checksum verifies downloaded bytes against a known hash; it does not establish publisher trust. Current public and candidate 2.10.0 packages are unsigned.

## A blocked `realm.node` at startup

The message “An Application Control policy has blocked this file” naming `node_modules/realm/prebuilds/node/realm.node` means Windows refused executable code in the database module. It is not evidence of a corrupt library. Signing only the setup EXE is insufficient: internal EXE/DLL/`.node` payloads also need validation. Flow 2.10 catches this startup loading error and shows a specific explanation without a restart loop. Compact Preview reports the same policy refusal if its backend cannot start.

This error text alone cannot identify whether Smart App Control or an organization-managed policy caused the block. A device administrator can review the Windows Code Integrity log and applicable policy. A trusted signed build is the distribution path; managed devices may additionally require administrator approval. Reinstalling the identical unsigned package, moving it, or publishing a new checksum does not establish trust. Flow does not modify Windows security settings or offer a bypass.

## What the maintainer needs

Obtain a code-signing identity from a trusted certificate provider, or set up Microsoft Artifact Signing after its identity and eligibility checks. A self-signed certificate does not solve distribution trust. Costs and eligibility depend on the provider. Never put private keys, passwords or certificate exports in this repository or a support report.

The prepared local path uses an installed Current User code-signing certificate with an accessible private key and Windows SDK Signing Tools. Hardware-backed identities can work through their installed provider. Run in a **disposable clean release checkout**, after dependencies and the native helper are prepared:

```powershell
./scripts/build-signed-windows.ps1 -CertificateThumbprint <your certificate thumbprint>
```

The script signs untrusted bundled executable payloads with SHA-256 and a timestamp, retains already valid third-party signatures, records the unsigned and signed aria2 fingerprints, and builds both Windows editions with mandatory signing. It then checks the installer, portable launcher and every executable/DLL/native module in the unpacked application. `release/Windows-Signatures.json` records exact output hashes and publisher identities. The signed build fails if credentials are missing or Windows cannot validate any executable payload. Certificate authorization remains the maintainer's responsibility; valid signatures do not guarantee acceptance by every security product.

This path is prepared but **has not been executed with a trusted certificate**. Artifact Signing requires its separate service identity configuration; it is not silently substituted by this certificate-store script. Do not publish a release as signed until the receipt passes and installation is tested on a Smart App Control enabled machine. Flow does not disable Windows security or ask ordinary users to do so.

References: [Microsoft signing guidance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control), [test every loaded binary](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/test-your-app-with-smart-app-control), [Smart App Control FAQ](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions).
