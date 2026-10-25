# Compact Windows candidate: preservation comes first

This is an optional Windows preview, not a replacement for the complete
Electron edition. The accepted download-size target is approximately 69 MB. A smaller file must
not remove tools, media capabilities, languages, saved downloads or preferences.

## What the candidate contains

- The existing HTML/CSS/JavaScript interface and browser extension.
- The existing Node download services, encrypted Realm library and torrent engine.
- The complete official Node 22.14.0 executable, including its locale support.
- The existing complete FFmpeg binary and aria2 binary.
- The official unpacked yt-dlp distribution, with every file checked against the
  bundled SHA-256 manifest. Its standalone duplicate is excluded.
- A Windows Forms/WebView2 host. WebView2 is a **shared system prerequisite**.
  It is not bundled in the reported installer size. The host currently explains
  a missing runtime and opens Microsoft's installation page.

No codec, extractor dependency, Windows tool or application language was removed
to obtain the smaller package. Apple Realm build files are excluded from this
Windows-only candidate. Android Realm development archives are also omitted;
the actual Windows Realm native addon is retained.

## Evidence recorded locally on 25 October 2026

- 245 existing and new service regression tests passed.
- All 21 tool destinations opened and rendered in the native host.
- A staged-package scenario completed 63 steps, including saved pins/limits,
  drop basket, minimizing and restoring the actual download window from the
  tray, renderer termination and shared browser-process termination.
- A controlled 12 MiB transfer completed byte-for-byte after the entire UI
  process was killed; reopening attached to the same backend process.
- A copy of an isolated Electron QA profile opened with its encrypted library,
  completed record and saved preferences. The user's real profile was not used.
- 38 Electron menu/browser-panel interaction checks passed in Arabic and English.
- 14 native integration checks passed: first/second launch with Unicode paths,
  isolated startup enable/disable, all three built-in sounds, actual framed Native
  Messaging handoff, automatic interface reopening and a byte-exact transfer.
- A real installer exercise completed 11 checks using a separate QA application
  identity: full Electron installation, real transfer, compact upgrade, encrypted
  library/settings preservation, verified pre-migration backup, repair, uninstall
  and rollback to the complete Electron edition. The author's real installation
  and browser registration were not changed.
- The compact portable launcher completed six checks, including an 8 MiB transfer
  after termination of its entire UI, retained runtime files and reconnection to
  the same engine without overwriting active files.
- A bounded six-minute minimized/idle run completed a 48 MiB transfer and restored
  the responsive interface. This is not an all-night or all-hardware guarantee.
- The exact public YouTube reproduction URL `peIksHiel34` supplied real quality
  choices, downloaded a 134,937,326-byte video at Best available, and passed a
  complete FFmpeg decode without using browser cookies or stored credentials.
- An actual NSIS preview installer was produced: 61,502,297 bytes, SHA-256
  `26b5747ad3231f267ec0ec42e18cc4ed16b9682eb27da6ac5f08e87bb95d0c78`.
  This identifies that exact candidate, not any later rebuild.

The host checks for a live library owner before opening Realm. Before the first
native opening of an existing library, it verifies an encrypted library/key
backup in `MigrationBackups`. Downloaded files and partial files stay in place.

## Release gate

Do not publish this candidate as the default update yet. These checks remain:

- First launch on machines missing WebView2 or .NET Framework prerequisites.
- Broader native clipboard, torrent/file-selection and media-workflow parity on
  additional machines. Service-level torrent selection/recovery tests pass.
- Longer idle/minimized runs, comparative transfer performance and resource usage
  across different devices. A short controlled run does not prove equal speed.
- Trusted signing, once the author supplies a certificate or signing service.

The current installer is unsigned. Reduced size does not resolve Smart App
Control publisher verification.

The Electron edition is retained as the compatibility choice. The optional
compact files are explicitly named `Compact-Preview` and do not replace the
normal `Setup.exe`/`Portable.exe` assets. No claim of complete parity, universal
website support or unchanged performance is justified by the checks above.

Microsoft documentation:
[WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
and [process recovery](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-related-events).
