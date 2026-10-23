# Validation — Flow 2.5.3

Checks dated 2026-10-23. These results cover the listed cases, not every website or Windows computer.

| Check | Result | Evidence |
| --- | --- | --- |
| Engine, Realm, network, recovery, playlist, handoff, media and update logic | **141 passed, 0 failed** | [Engine tests](docs/validation/engine-tests-v2.5.3.txt) |
| Corrupt recovery state, all tool windows, zero-byte removal, connection cancellation and full playlist UI | **30 passed**, final packaged app | [Reliability UI](docs/validation/reliability-v2.5.3.json) |
| Independent update window, Help command, trusted link, reminders, preferences, language and offline states | **20 passed**, final packaged app | [Update UI](docs/validation/updates-v2.5.3.json) |
| Menu exclusivity/dismissal, desktop windows and browser panel lifecycle | **38 passed**, final packaged app | [Interaction checks](docs/validation/interaction-v2.5.3.json) |
| Final portable English/system appearance and scale | **39 passed** | [Portable appearance](docs/validation/appearance-portable-v2.5.3.json) |
| Real installed-profile upgrade | State restored; existing download and preferences preserved; automatic GitHub check ran | [Installed upgrade](docs/validation/installed-upgrade-v2.5.3.json) |
| Runtime source/package parity | **50 matching runtime files**, matching metadata/native bridge | [Parity](docs/validation/source-runtime-parity-v2.5.3.json) |
| Live YouTube playlist | **25 inspected and imported; first MP4 completed and decoded**, 15,376,117 bytes | [Live playlist](docs/validation/live-playlist-v2.5.3.json) |
| Live GitHub API release discovery | Published stable release and ready Windows assets validated | [Live GitHub](docs/validation/live-github-updates-v2.5.3.json) |

The new recovery regression fixtures retain malformed raw records while exposing usable entries safely. Tests include a task disappearing during asynchronous removal, a 404 at zero bytes, a server holding the connection open, and cancelling YouTube extraction during deletion. Playlist tests cover 250 entries, original numbering, duplicates, cancellation and explicit truncation rather than silently applying the former 100/200 limits.

The 25-video playlist was completely inspected and imported in an isolated library. The first video was fully downloaded and decoded with FFmpeg; the remaining 24 were not fully downloaded. UI playlist previews use controlled data. Update UI tests simulate later versions and stub the external browser action; the live API test separately uses the public GitHub endpoint. Notifications for a future published release cannot be claimed as an observed event before that release exists.

Interaction checks use a real Chromium renderer and controlled Chrome API fixtures for panel lifecycle. Existing personal-Chrome handoff, cold native-host startup and maintenance repair were validated in 2.5.2; those reports remain under their original version and are not counted as new 2.5.3 live runs. The previous native IDM interceptor still blocks extensionless attachments on this machine; direct-file handoff succeeded. Authenticated Facebook downloads and a fresh Chrome/Edge install remain unverified.

Executables remain unsigned. [Limitations](docs/LIMITATIONS.md). Further final distribution/installed-profile checks are recorded in the release verification file.
