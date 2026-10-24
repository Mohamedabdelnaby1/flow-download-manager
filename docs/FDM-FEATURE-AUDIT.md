# FDM feature review and Flow 2.6

Reviewed on 24 October 2026 against the [official FDM features](https://www.freedownloadmanager.org/features.htm) and [feature voting page](https://www.freedownloadmanager.org/vote.htm). The voting catalog is dynamic; its inline `FEATURE_CATALOG` contained 22 entries. This is a product capability audit, not a speed benchmark. Current FDM and its legacy 3.9 features are described separately on its site.

## Voting catalog: every item accounted for

| FDM topic | Flow status | Where / boundary |
| --- | --- | --- |
| More torrent controls | Added in 2.6 | Tools → Torrents: upload cap, seeding time, peer limit, file selection. Defaults require no tuning. |
| More torrent information | Added in 2.6 | Files, piece count, peer count and tracker hosts under optional details. |
| Relocation progress | Added in 2.6 | Tools → Move or rename: streamed copy, bytes, speed, cancellation and verification before removing the original. |
| Android TV | Outside this desktop release | No Android TV package is advertised. |
| Recovery bin | Already present | Tools → Restore a removed task. Keeps completed files and partial data. |
| SHA-512 | Added in 2.6 | Tools → Check a file; SHA-256 remains available. |
| Safari | Outside this release | Companion targets Chromium browsers on Windows/Linux. |
| Android file-based URL import | Desktop equivalent present | Batch URLs and link workbench; no Android application. |
| Duplicate-task cleanup | Added in 2.6 | Preview, keep the completed/most advanced copy, move selected repeats to recovery. |
| Case-insensitive sorting | Added in 2.6 | Natural name sorting groups mixed case and numbered names. |
| Linux Flatpak/RPM | Deferred | Preparation for RPM, DEB and AppImage retained; no Linux packages released. A Flatpak sandbox/portal integration is not shipped. |
| Apple Silicon | Outside this release | No macOS binary is advertised. |
| Independent Add window | Already present | Desktop download confirmation stays independent of the main library. |
| Rename existing tasks | Extended in 2.6 | Queued batch rename already present; completed files now rename on disk. Pause active transfers first. |
| Fonts | Added in 2.6 | Tools → Personalize; installed-font choices plus existing 80–150% scaling. Missing fonts use a system fallback. |
| Raspberry Pi / ARM | Not shipped | Linux packages are deferred, including ARM. |
| History retention | Added in 2.6 | Optional 7/30/90-day cleanup to recovery, disabled by default. Files stay on disk. |
| Selective ZIP extraction | Added in 2.6 | Tools → Pick files from ZIP; exact ranges and CRC validation, bounded selection. Standard ZIP, no encryption/ZIP64/multipart. |
| Website archiving | Already present | Site grabber: depth/type/scope filters, saved offline pages and local link rewriting. |
| Custom columns | Added in 2.6 | Tools → Personalize. Name and status stay visible. |
| URL gathering | Already present | Browser page link picker plus site grabber. |
| Yield slow tasks | Added in 2.6 | Optional queue setting, off by default; keeps parts and retries after a cooldown. Window focus never triggers it. |

## Current and legacy FDM capabilities

- Segmentation, resume, queues, schedules, traffic modes and categorized folders already exist in Flow.
- Torrent/magnet support, peer information, selective files and bounded seeding use the separately bundled aria2 engine in 2.6.
- Multiple mirrors now support a single verified transfer. Publisher SHA-256 is required, so mismatched mirrors cannot produce an accepted file silently.
- Phone control is a local-network web interface, not an Android app or a cloud relay. Pair with a six-digit code, add links, pause/resume HTTP tasks, then disconnect all devices from Flow.
- Website extraction and media conversion already use yt-dlp and FFmpeg. Third-party executable add-ons are not installed by this release.
- Playback before completion and a public file-comment service are not provided. Completed files open in the user's normal player.
- English and Arabic are supported. We do not claim parity with FDM's full language/platform list.

## Ease of use

One **Tools** button and **Ctrl+K** find task-oriented cards. Default torrent settings stop seeding on completion. Automated cleanup and slow-task yielding are off until selected. Protocol details and numerical controls stay inside optional sections. Desktop shutdown is an explicit queue option, with a cancellable one-minute countdown after successful completion and no other active transfers.

## Browser fixes

The small Flow button appears only beside a visible, sourced video. Hidden players, old cached media, notification sounds and off-screen elements do not create the panel. Drag either the small grip or the button itself; use × to dismiss. Position is remembered per site. The extension runs in matching child frames and discovers open shadow-root players; media is filtered by frame and cleared on navigation.

The private course-player screenshot is insufficient to determine its exact delivery format. The update improves embedded-player discovery and offers a user-triggered generic extraction attempt. It does not bypass DRM or promise downloads from every authenticated course site.

## Evidence

Source tests, packaged desktop checks, actual installed upgrade and public release asset verification are separate gates. See [validation](../VALIDATION.md). Linux runner results identify the exact tested distribution/display; they are not a claim that every Linux desktop was exercised.
