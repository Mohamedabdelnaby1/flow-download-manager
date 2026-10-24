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

The installed user library contained zero tasks before and after the upgrade. Existing language, theme, text scale, connection count and folder preferences were preserved, and the stable startup launcher/tray were checked after initialization. This does not independently prove migration of a populated personal library; separate recovery fixtures cover those data operations. Windows was not rebooted.

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
