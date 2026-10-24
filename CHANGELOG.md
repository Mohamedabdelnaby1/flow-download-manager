# Changelog

## 2.6.0

- Reuse fresh in-memory video inspection for transfer, share concurrent inspections, and cancel obsolete URL inspections.
- Bounded parallel HLS/DASH fragments, HTTP chunking, explicit connecting/processing phases and continuous byte-based speed when an extractor omits instantaneous speed.
- Fall back to an available video source when a site omits resolution metadata.
- Readable Download/Flow browser button with one options menu, direct dragging and persistent per-site placement; remove the permanent grip/minimize/close row.

- Searchable task-first Tools hub and Ctrl+K; advanced controls stay collapsed.
- Torrents/magnets through bundled aria2, file selection, peer/piece/tracker information and bounded seeding.
- Verified multi-source mirrors and paired local-network phone control.
- Selective standard ZIP extraction with exact byte ranges and CRC validation.
- Completed-file relocation with progress, speed, cancellation and verification; completed-file rename.
- SHA-512, previewed duplicate-task cleanup, natural case-insensitive sorting, optional history retention, fonts and list columns.
- Optional slow-download queue yielding, independent of window focus.
- Successful queue completion can request computer shutdown after a cancellable countdown; Flow product branding replaces the Electron label.
- Compact draggable browser button, visible-player gating, child-frame sources and open shadow-root discovery.
- Preparatory Linux build workflow, XDG autostart and native bridge retained for future work. Linux packages are deferred and are not part of this release.
- See docs/FDM-FEATURE-AUDIT.md for every reviewed FDM voting item and explicit platform boundaries.


## 2.5.4 — 2026-10-24

- Restore a missing/corrupt video extractor from the pinned official release after SHA-256 verification; add packaged real-video checks.
- Include three built-in event WAV sounds with direct playback and custom-path reset/fallback.
- Add explicit transfer cancellation with confirmation and preserve completed disk files.
- Tray clicks reopen the last minimized transfer; add actual speed history and differentiated metric surfaces.
- Fixed Windows startup pointing to a deleted portable extraction executable. Use the permanent launcher and `--background`, with verified registration and an explicit startup toggle.
- Close/minimize to tray options, live tray size/rate tooltip, per-download tray entries and native taskbar progress. Explicit Exit still stops the app.
- Renderer crash/hang recovery, trusted recovery page with bounded retries, destroyed-main restoration from the tray, rotating diagnostic logs and software rendering compatibility.
- Main/transfer minimization and focus changes leave the native download engine running. Hidden renderers stop polling using explicit native visibility events; unchanged snapshots retain their DOM.
- Paginated large download libraries, cached limiter settings and serialized asynchronous queue pumping.
- Adaptive HTTP connection reduction, `Retry-After` handling, conservative HTTP/1 fallback, bounded range-confirmation retries, progress-aware reconnect budgets and a receive watchdog that excludes intentional throttling.
- Completed files cannot become failed because a notification/callback throws; duplicate shutdown is safe.
- Compact transfer/completion material surfaces, collapsed connection details, readable size/rate/progress, tray action and Arabic/English/system appearance.

## 2.5.3 — 2026-10-23

- Fixed incomplete legacy recovery records breaking the global state, tools and task deletion. Original malformed records remain retained in Realm.
- Prevented incomplete recovery entries after a task disappears during asynchronous removal.
- Added absolute HTTP connection/header deadlines, cancellable site inspection and a no-progress video watchdog. Connecting tasks show their actual state instead of an unexplained 0%.
- Full YouTube playlist inspection and bulk import (up to 10,000 entries with an explicit truncation warning), select all/clear, duplicate skipping, original numbering, playlist folders, quality selection and immediate queue start.
- Playlist-only URLs entered in Add Download open the playlist importer; legacy playlist.mp4 tasks fail with an actionable explanation.

- Stable GitHub release checks at startup and every six hours while Flow is running.
- Independent update popup with versions, escaped release notes and a verified GitHub download-page button.
- Manual Help-menu check, 24-hour reminders, per-version skip and a persisted automatic-check preference.
- English/Arabic and system appearance for update states, with quiet background network failures.
- MIT license is included in new packaged editions; third-party licenses remain unchanged.

## 2.5.2 — 2026-10-23

- Exclusive menus with outside, Escape, command and blur dismissal, plus keyboard navigation.
- Independent confirmation/progress windows raised briefly above the browser, with a live progress title.
- Removal of legacy panels during companion updates; lifecycle cleanup prevents repeated observers and listeners.
- Filtered UI sounds, watch-page quality selection, actual connected build information and obsolete-desktop handoff rejection.
- Existing-install maintenance choices with stable path/scope and preserved local data.
- Real personal-Chrome handoff, 29 YouTube format choices, panel hide/reset/drag and same-version installed repair verified.

## 2.5.1 — 2026-10-23

- English defaults for new profiles, preserving existing language choices.
- System/Light/Dark appearance, with live system tracking in open windows and the drop basket.
- English browser popup/options, video panel, labels and notices; popup/options follow system appearance.
- English presentation of built-in service messages, library diagnosis, tray and completion notifications.
- English documentation, current screenshots and publication checks.

## 2.5.0 — 2026-10-23

- Favorite/recent folders, capacity inspection, batch rename preview and guarded undo.
- Tags, compound search, saved views, recovery bin and selective configuration restore.
- Duplicate URL guard, capture snooze and site exclusions.
- Shared HTTP queue bandwidth, optional keep-awake and redacted diagnostics.
- Remote-change validation, interruptible retry, safer final-copy pause and login HTML rejection.
- Integrated creator signature and installer/About attribution.

## Earlier development

The 2.x development series introduced independent windows, Native Messaging, the draggable panel, quality selection, rescue/integrity tools, rules, traffic profiles, playlists and conversion. This repository begins with consolidated 2.5.1 source; it does not claim to preserve unpublished development history.
