# Startup, tray and transfer stability

## Windows startup

Enable **Options â†’ General â†’ Launch Flow when the computer starts**. Flow registers the stable `electron.app.Flow` Run value with its permanent executable and `--background`. For Portable, the target is the original Portable.exe launcher, never its temporary extraction directory. Keep that launcher at its registered location. Move it, open it again and re-enable startup to update the registration.

Startup registration is verified before the preference is saved. Close to the system tray and Minimize to the system tray are independent options, enabled by default. **Tasks â†’ Exit** or tray **Exit** intentionally closes the engine and saves checkpoints. Closing a window does not pause a transfer. Windows Startup apps can disable registration; reconciliation respects a known explicit disabled entry.

Hover the tray icon for transferred bytes, total bytes and aggregate rate. Its menu opens recent/active transfer windows. Active taskbar buttons also show progress. These require the process to be running; no Windows service is installed.

## Idle interface recovery

Flow uses software rendering for its two-dimensional UI by default. Advanced users can explicitly opt into hardware acceleration with `--flow-hardware-acceleration`. This is a compatibility choice, not proof that a GPU driver caused a particular historical failure.

Each main/tool renderer is monitored for termination and unresponsiveness. A sustained hang receives an eight-second grace period; then only the renderer is replaced. Downloads and Realm remain in the main process. Up to three automatic recoveries are allowed per five minutes, followed by a local recovery page and a manual retry button. Tray Open recreates a destroyed main window. Diagnostic logs rotate at 2 MiB with two retained archives. Fatal main-process exceptions are logged through the exception monitor; they are not silently swallowed.

Disabling Chromium timer throttling also changes its visibility semantics, so Flow uses native show/hide/minimize events to stop hidden renderer polling. Visible idle snapshots do not repeatedly rebuild unchanged DOM. Libraries display at most 200 rows per page.

## Interrupted HTTP transfers

The engine checks HTTP status before range validation. Temporary overload (including 429/503) reduces connection count, honors bounded Retry-After and requeues segments. Server hints are bounded and expire. Productive reconnects do not consume one cumulative retry budget across an entire long file. Transport/range problems can retry with HTTP/1 and one connection. Every accepted range still has to match its requested offset and total size; changed files are rejected. Saved parts are preserved on terminal failure.

Receive-idle monitoring excludes time deliberately spent waiting for bandwidth limits. Cached limit configuration is refreshed within 500 ms. Speed depends on server limits, available bandwidth and the site; no faster-than-IDM claim is made.

## Validation boundaries

Regression fixtures cover real transfers interrupted repeatedly, temporary HTTP overload, exact final SHA-256, minimize/focus changes, deliberately terminated/hung renderers, tray restoration and a large library. A packaged idle soak covers its recorded duration; it is not a claim of days of uptime or all hardware compatibility. Windows registration and a launch with its quiet arguments can be verified without rebooting the user's machine.

Official API references: [Electron app startup](https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows), [renderer recovery](https://www.electronjs.org/docs/latest/api/web-contents#contentsforcefullycrashrenderer), [visibility semantics](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility).

## Video tools, sounds and cancellation

The extractor is bundled outside ASAR and verified against the pinned SHA-256 before use. If missing or corrupt, Flow restores that exact official release to the local profile and verifies the response before using it. A slow connection can take several minutes; cancellation of a waiting download remains available. No browser cookies or stored request credentials are attached to the repair request.

Three original short PCM WAV sounds ship with the app. Empty sound fields select the built-in default; custom WAV paths can be reset. Event playback falls back to the built-in sound if a custom file is missing. Playback uses the Windows sound API through a hidden bounded helper, rather than opening an external media player. Windows mute/output-device settings still apply.

Transfer windows expose Cancel with an inline confirmation. Confirming stops the task, removes its temporary parts and closes that transfer window; completed disk files remain. Pause retains partial data. Normal removal from the main library retains its recovery-bin behavior.

Clicking the tray icon restores the last transfer explicitly minimized or sent there. Open Flow in the tray context menu always opens the main library.
