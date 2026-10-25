# Validation - Flow 2.7.1 maintenance

Checks dated 25 October 2026. This update changes Windows browser-configuration replacement and version metadata; the 2.7 interface and transfer implementation are unchanged.

| Gate | Result | Evidence |
| --- | --- | --- |
| Windows source suite in both package jobs | **250 passed, 0 failed** per job | [Complete CI](https://github.com/Mohamedabdelnaby1/flow-download-manager/actions/runs/40188878790), [Compact CI](https://github.com/Mohamedabdelnaby1/flow-download-manager/actions/runs/40188880958) |
| Existing protected configuration reproduction and focused error/security checks | Failed before fix; **31 passed** after fix | [Regression](docs/validation/bridge-regression-v2.7.1.json) |
| Exact GitHub-built normal installer on the actual existing installation | Updated in the same machine-wide location; **one registration**, two library records and two completed-file SHA-256 values preserved | [Installed upgrade](docs/validation/installed-upgrade-v2.7.1.json) |
| Same installed payload: browser repair, native handoff, startup and tray | Existing configuration replaced twice; real framed Native Messaging handshake; preferences/startup/tray retained | [Installed upgrade](docs/validation/installed-upgrade-v2.7.1.json) |
| Exact downloaded compact setup payload | **3,135 hashes match; 10 preservation checks** | [Payload](docs/validation/compact-payload-v2.7.1.json) |
| Same compact payload: native startup, sounds, browser reopening and verified bytes | **14 passed** | [Integration](docs/validation/compact-integration-v2.7.1.json) |

The installed maintenance exercise used the real normal installer, retained an encrypted library backup, and did not interrupt active downloads. The first immediate health response preceded tray initialization; the later browser/startup check verified the tray was ready. Windows was not rebooted. Compact extraction emitted the NSIS executable-tail warning; every manifest-listed file matched.

The full 170-check interface and compact portable lifecycle suites below describe 2.7.0, whose UI and portable-launcher code are unchanged by this focused fix. They are not presented as newly repeated 2.7.1 checks. The build commit is `10258e6b10e115b7047aa98f2dbced8d5524c662`; later documentation/evidence changes do not alter production code. Executables remain unsigned; Compact Preview remains optional.

[How to update an installed copy](docs/UPDATING.md)

---

# Validation - Flow 2.7.0

Checks dated 25 October 2026. The complete Windows edition is retained; Compact Preview is an additional optional host. Results describe bounded scenarios, not universal device, website or performance parity.

| Gate | Result | Evidence |
| --- | --- | --- |
| Windows source regressions, independently in both build jobs | **249 passed, 0 failed** in each | [Complete CI](https://github.com/Mohamedabdelnaby1/flow-download-manager/actions/runs/40179855302), [Compact CI](https://github.com/Mohamedabdelnaby1/flow-download-manager/actions/runs/40179857065) |
| Exact downloaded complete portable: limits/pins and actual tool destinations | **14 + 42 passed** | [Controls](docs/validation/complete-workspace-v2.7.0.json), [Tool windows](docs/validation/complete-tool-windows-v2.7.0.json) |
| Same complete payload: menus, customization, tools and appearance | **38 + 6 + 25 + 45 passed** | [Interactions](docs/validation/complete-interactions-v2.7.0.json), [Customization](docs/validation/complete-customization-v2.7.0.json), [Tools](docs/validation/complete-tools-v2.7.0.json), [Appearance](docs/validation/complete-appearance-v2.7.0.json) |
| Exact downloaded compact setup payload | **3,135 file hashes match; 10 preservation checks passed** | [Payload](docs/validation/compact-payload-v2.7.0.json) |
| Same compact payload: all 21 tools, tray restoration and process recovery | **63 passed** | [Native UI](docs/validation/compact-ui-v2.7.0.json) |
| Same compact payload: startup, sound, Native Messaging and interface reopening | **14 passed**, real transfer verified | [Integration](docs/validation/compact-integration-v2.7.0.json) |
| Exact downloaded compact portable | **6 passed**, 8 MiB transfer survived whole-interface termination | [Portable](docs/validation/compact-portable-v2.7.0.json) |
| Earlier compact candidate, isolated real installation identity | **11 passed**: upgrade, encrypted library/settings, repair, uninstall, rollback | [Installed exercise](docs/validation/compact-upgrade-v2.7.0.json) |
| Bounded compact minimized run | **6 passed**, six minutes and 48 MiB verified | [Background](docs/validation/compact-background-v2.7.0.json) |
| Compact media path, supplied public YouTube video | 134,937,326 bytes, full FFmpeg decode | [Media](docs/validation/compact-video-v2.7.0.json) |

The 170 complete-edition UI checks ran against the extracted exact GitHub portable payload, with isolated profiles. Tools and appearance used fresh profiles to avoid test-fixture interference. Compact UI/integration checks used the extracted exact GitHub setup payload; its portable launcher was also exercised directly. Extraction emitted the usual 7-Zip NSIS executable-tail warning; every manifest-listed compact file matched its SHA-256 value.

The isolated installer exercise used an earlier compact candidate and a separate QA application identity. It did not replace the author's real installation or browser registration. Final release payload checks are distinct from that upgrade exercise. Windows was not rebooted, prerequisite-missing virtual machines were not exercised, and no controlled speed comparison with IDM was performed. Executables remain unsigned.

Both build workflows used production commit `be5d1f629e84fef65042a85183ac2bb6d1265351`. Later documentation, gallery and evidence changes do not alter the built production code. Exact sizes, SHA-256 values and final source commit are recorded in the release verification asset. Public release state and asset completeness are verified separately from local checks.

[Compact prerequisites and remaining gates](docs/COMPACT-WINDOWS-PREVIEW.md) · [Known boundaries](docs/LIMITATIONS.md)

---

# Historical validation - Flow 2.6.1 foundation update

Source checks: **231 passed, 0 failed** ([report](docs/validation/engine-tests-v2.6.1.txt)). Real desktop error-assistant checks: **12 passed**, covering visible English/Arabic cards, collapsed diagnostics, explicit browser repair, local redacted reports, renderer rejection handling, and simple connection-health/rescue controls ([report](docs/validation/errors-v2.6.1.json)). Existing source desktop tools flow: **25 passed** ([report](docs/validation/tools-source-v2.6.1.json)). Packaged release verification is recorded in the accompanying release verification asset.

The real Windows native host consumed configuration protected by the new built-in DPAPI configuration path, validated the extension origin, and completed an authorized local fixture download. Automatic link rescue completed from saved bytes, rejected weak identity, rejected different bytes despite a forged same size/ETag, and cancelled when the task was removed.

Windows 7, 8 and 8.1 cannot run this Electron 45 edition. Installer and portable guards are compiled into the Windows release. No Windows 7 virtual-machine run was performed; the guard is not a claim of Windows 7 compatibility. [Electron support boundary](https://www.electronjs.org/blog/windows-7-to-8-1-deprecation-notice).

New independent-engine, full in-app update, richer media/bundle/watch/subscription/sync features are separate ongoing work. Linux packages remain deferred.

---

# Validation - Flow 2.6.0

Checks dated 24 October 2026. Windows x64 is the release target. These results cover the cases below; they do not prove universal website or hardware compatibility. Linux packages are deferred.

| Gate | Result | Evidence |
| --- | --- | --- |
| Clean Windows dependency install | Successful `npm ci` from regenerated official package metadata | Lockfile checked in; dependency tests below |
| Engine, Realm, transport, recovery, media, updates and new tools | **198 passed, 0 failed** | [Source tests](docs/validation/engine-tests-v2.6.0.txt) |
| Frozen packaged Tools flow, simple Add form, phone pairing, shutdown cancellation and compact media button | **25 passed** | [Portable Tools checks](docs/validation/tools-portable-v2.6.0.json) |
| Recovery state, native windows and zero-byte task removal | **30 passed** | [Packaged reliability](docs/validation/reliability-v2.6.0.json) |
| Trusted update destination, reminders, skip, language and offline state | **20 passed** | [Packaged updates](docs/validation/updates-v2.6.0.json) |
| Desktop handoff and browser-panel lifecycle | **38 passed** | [Packaged interactions](docs/validation/interaction-v2.6.0.json) |
| Final portable appearance, language, system palette and sound controls | **45 passed** | [Portable appearance](docs/validation/appearance-portable-v2.6.0.json) |
| Final desktop gallery, languages and native forms | **39 passed** | [Desktop gallery checks](docs/validation/desktop-v2.6.0.json) |
| Earlier candidate: focus/minimize/tray, renderer recovery, real transfer and ten-minute soak | **35 passed** | [Lifecycle](docs/validation/lifecycle-v2.6.0.json) |
| Earlier candidate: supplied YouTube link, extractor repair and sound playback | **13 passed** | [Live media checks](docs/validation/video-package-v2.6.0.json) |
| Installed upgrade, retained preferences, quiet startup and tray | Healthy **2.6.0** | [Installed upgrade](docs/validation/installed-upgrade-v2.6.0.json) |
| Source/runtime code and assets | **70 files match**, native Windows bridge matches | [Parity](docs/validation/source-runtime-parity-v2.6.0.json) |

## What was exercised

New source tests transfer real bytes through the bundled torrent engine using a controlled web seed, use two mirror URLs with SHA-256 verification, selectively extract a ZIP file without transferring the large unused entry, reject ZIP traversal/encryption/symlinks and CRC failures, verify SHA-512 against disk changes, move/cancel/rename completed files, clean duplicate/old records into recovery, and test pairing/origin/session revocation for local phone control. Shutdown commands are intercepted in unit tests; the desktop countdown is cancelled in UI tests. The test machine is never deliberately shut down.

A real Chromium renderer runs the complete companion content script with fixture Chrome APIs. It checks hidden video plus stale media, open shadow roots, compact button size, menu toggling and persistent dismissal. Background request tests check frame association and SPA navigation cleanup. The private course-site screenshot cannot identify that customer's exact player/session; no claim of a successful private-site transfer is made.

The supplied public YouTube URL `https://www.youtube.com/watch?v=peIksHiel34` was fully downloaded at the chosen test quality (48,947,231 bytes), decoded with FFmpeg, and hashed. Bundled extractor recovery and all three packaged event sounds completed. This is a media-path test, not proof of every YouTube video or a repeated full-playlist transfer.

The final GitHub-built installer preserved one completed task in the user library across the upgrade. Existing language, theme, text scale, connection count and folder preferences were preserved, and the stable startup launcher/tray were checked after initialization. Separate recovery fixtures cover malformed and interrupted task data. Windows was not rebooted.

## Limits and release verification

- Executables are unsigned. No controlled benchmark establishes a speed advantage over IDM.
- The idle soak is ten minutes, not days of uptime or every graphics driver.
- Personal Chrome sessions, every authenticated site, DRM and browser sandbox packages are not universally verified. Reload the unpacked companion after upgrading.
- ZIP64, encrypted/multipart ZIP and selective entries beyond the documented limits are unsupported.
- Torrent web-seed transfer and piece checks were exercised; arbitrary public swarms/private trackers depend on peers and network conditions.
- Phone control is opt-in over a trusted local network and uses HTTP. It is not a cloud relay or a native Android app.
- Linux work is retained but packaging is deferred. There are no Linux assets in this release.

The release includes a verification JSON and SHA256SUMS. Public GitHub upload status, exact asset sizes/digests, final source commit/tag and update discovery are checked separately from local builds. A pushed commit or an unpublished draft is not a finished release.

[Earlier 2.5.4 evidence](docs/validation/engine-tests-v2.5.4.txt) remains available for historical context.

## Video-startup and companion-button follow-up

Fresh public-session tests of the exact supplied YouTube video and the Facebook Reel in the reported screenshot completed and fully decoded both MP4 files. Inspection was 4.3 s / 2.2 s, first transfer progress followed within 4.1 s / 1.6 s, and transfers completed while the main window was minimized. Each inspection-plus-transfer used exactly one extraction. These are observations on one connection; they do not establish superiority over IDM or guaranteed website speeds. [Development evidence](docs/validation/video-flow-development-v2.6.0.json).

The updated button retains a readable label in both sizes, has only two visible controls, and keeps movement/hide/reset in its options menu. A desktop UI regression specifically verifies that editing the URL cancels an obsolete metadata job through the real desktop bridge.

The final rebuilt package also completed the two exact video URLs while minimized, with one extraction per video and full-file decoding: [Packaged video evidence](docs/validation/video-flow-v2.6.0.json). Its interface/recovery/update/appearance regression checks were repeated after these changes. The ten-minute lifecycle/repair-and-sound reports above describe the earlier 2.6.0 candidate; those specific subsystems were unchanged by this follow-up.

## GitHub-built release binaries

Both Windows editions were built and uploaded by the [successful Windows workflow](https://github.com/Mohamedabdelnaby1/flow-download-manager/actions/runs/40110481341), after **198 source tests passed** on the Windows runner. The exact uploaded files were downloaded and matched the workflow SHA-256 receipt. The final portable passed Tools (25), interactions (38), and appearance (45) checks locally. The exact uploaded installer upgraded the user installation with its one completed task, preferences, stable startup and tray preserved. Both exact supplied public videos completed and fully decoded using the downloaded build.

[Remote package/source comparison](docs/validation/remote-runtime-parity-v2.6.0.json) checks all 70 production source/UI/extension files with CRLF/LF normalization, and compares the bundled tools/native bridge byte for byte. [Build provenance](docs/validation/windows-build-provenance-v2.6.0.json) records the build commit; later documentation/evidence-only commits do not change production code.
