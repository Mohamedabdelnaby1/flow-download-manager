# Validation — Flow 2.5.2

Checks dated 2026-10-23. These results cover the listed cases, not every website or Windows computer.

| Check | Result | Evidence |
| --- | --- | --- |
| Engine, Realm, handoff, FTP, recovery, rules, media and preferences | **116 passed, 0 failed** | [Engine tests](docs/validation/engine-tests-v2.5.2.txt) |
| Reported menu, panel and desktop-window regressions against the final packaged app | **38 passed** | [Interaction checks](docs/validation/interaction-v2.5.2.json) |
| English/system appearance suite against the final portable launcher | **39 passed** | [Portable appearance](docs/validation/appearance-portable-v2.5.2.json) |
| Real native host starts a closed packaged desktop | **Passed**; main hidden, separate confirmation visible | [Cold start](docs/validation/cold-start-v2.5.2.json) |
| Existing personal Chrome companion update and YouTube handoff | **Passed**; 29 video format choices, close/reset and real mouse dragging | [Live Chrome](docs/validation/live-chrome-v2.5.2.json) |
| Real Chrome direct-file transfer with required cookie/referrer | **Completed; 4,320,130 bytes, SHA-256 matches** | [Live file](docs/validation/live-file-v2.5.2.json) |
| Production package audit | **0 known advisories** at check time | [Dependency audit](docs/validation/dependency-audit-v2.5.2.json) |
| Maintenance page branches using the production NSIS include and an isolated uninstaller fixture | **Repair, reinstall and uninstall routing passed** | [Maintenance fixture](docs/validation/maintenance-v2.5.2.json) |
| Real same-version installed repair | **One registration before and after**, same path, library retained | [Installed repair](docs/validation/installed-repair-v2.5.2.json) |
| Source/runtime parity | **48 matching runtime files**, matching native host | [Parity](docs/validation/source-runtime-parity-v2.5.2.json) |

The 38 interaction checks include a real Chromium renderer with controlled Chrome API fixtures for panel lifecycle tests. The separate live-Chrome check uses the existing personal browser and the registered Native Messaging host. The cold-start test uses an isolated profile and a local HTTP file fixture. YouTube format inspection is not a fresh full-video transfer/decode test. Authenticated Facebook transfers and a fresh Chrome/Edge install remain unverified. The extensionless attachment test remains blocked by an existing IDM native interceptor, even with its Chrome extension disabled and after a browser restart; direct-link handoff completed successfully.

Maintenance branch tests invoke a dummy uninstaller that only records its invocation. They do not prove real removal on a clean machine. The actual installed-repair check preserved the existing library; it did not uninstall the user's files.

Executables remain unsigned. Earlier 2.5.1/2.5.0 evidence is retained in `docs/validation` and the changelog, with its original version; old results are not counted as new 2.5.2 runs. [Limitations](docs/LIMITATIONS.md).
