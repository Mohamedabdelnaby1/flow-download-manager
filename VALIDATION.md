# Validation أ¢â‚¬â€‌ Flow 2.5.4

Checks dated 2026-10-24. These results cover the listed cases, not every website or Windows computer.

| Check | Result | Evidence |
| --- | --- | --- |
| Engine, Realm, network, recovery, playlist, media, updates, cancellation, sounds and extractor repair | **170 passed, 0 failed** | [Source tests](docs/validation/engine-tests-v2.5.4.txt) |
| Recovery state, tool windows, zero-byte removal and playlist UI | **30 passed**, packaged | [Reliability](docs/validation/reliability-v2.5.4.json) |
| Update window, trusted link, reminders, preferences and offline state | **20 passed**, packaged | [Updates](docs/validation/updates-v2.5.4.json) |
| English/Arabic menus, desktop handoff and companion panel lifecycle | **38 passed**, packaged | [Interactions](docs/validation/interaction-v2.5.4.json) |
| Exact user YouTube video, bundled extractor, verified official restoration, full MP4 decode and built-in sound playback | **13 passed**, packaged | [Live package tools](docs/validation/video-package-v2.5.4.json) |
| Full Material interface, English/Arabic, system light/dark and compact 150% scale | **43 passed**, packaged | [Appearance](docs/validation/appearance-v2.5.4.json) |
| Final Portable launcher, themes, scale and bundled-sound settings | **45 passed** | [Portable appearance](docs/validation/appearance-portable-v2.5.4.json) |
| Installed upgrade and quiet startup | Healthy 2.5.4; preferences retained; stable startup path repaired | [Installed upgrade](docs/validation/installed-upgrade-v2.5.4.json) |
| Runtime and native bridge parity | **60 matching runtime files** | [Parity](docs/validation/source-runtime-parity-v2.5.4.json) |
| Quiet startup, tray restoration, native visibility, real transfer through focus/minimize/crash/hang, cancellation, 2,000-record pagination and 10-minute idle soak | **35 passed**, packaged | [Lifecycle](docs/validation/lifecycle-v2.5.4.json) |

Lifecycle checks use an 8 MiB local HTTP fixture and compare the final SHA-256 after deliberately terminating and hanging renderers. Both the exact minimized transfer window and the main window can be restored. Closing all windows keeps the service resident; destroying the main window is recoverable through the tray. The idle soak lasted 600 seconds; this does not prove days of uptime or all driver compatibility.

Source tests exercise temporary 429/503 overload, repeated productive disconnections, wrong range metadata, cancellation during inspection, safe shutdown, direct sound playback configuration, and recovery of a missing/corrupt extractor with checksum rejection. Repair requests use a pinned official GitHub release URL, no browser cookies or saved authorization headers. The exact user video (488 seconds) downloaded as a 48,947,231-byte MP4 and fully decoded with FFmpeg. The missing-extractor case downloaded its pinned official release, checked the SHA-256 and installed it in the isolated profile. All three packaged WAV sounds played through the Windows helper; this confirms successful playback execution, not subjective loudness on every output device. Final installer/portable checks are recorded separately in release verification.

The Material-inspired UI is checked using the complete production stylesheet order, English/Arabic layouts, live system themes and compact windows at 150% text scale. Demonstration screenshot records are not claims that example URLs were transferred.

The user's earlier 25-video playlist was completely inspected/imported in 2.5.3; only the first MP4 was fully downloaded and decoded. That historical evidence remains [here](docs/validation/live-playlist-v2.5.3.json). The current update preserves those features; it does not claim a new full 25-video transfer.

Interaction tests use real Chromium and controlled Chrome API fixtures. Personal Chrome handoff, native cold start and maintenance results from 2.5.2 remain historical. Existing IDM interception can still prevent extensionless attachment capture. Authenticated Facebook downloads and a clean-machine install/uninstall remain unverified.

No controlled comparison against IDM was performed. Local throughput tests measure fixture overhead only; internet performance depends on the server, connection and site. Executables remain unsigned. [Limitations](docs/LIMITATIONS.md).

The actual user library was empty at the final installed upgrade (0 records before and after). No active transfers were interrupted. The encrypted profile was backed up locally before installation. This proves that upgrade path and preference/startup checks; existing-record preservation is covered by the isolated recovery tests and the historical 2.5.3 upgrade. Windows was not rebooted.
