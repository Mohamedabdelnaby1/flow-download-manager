# Companion and transfer audit — 2.11

This update addresses browser handoff and actual transfer execution. It does not claim that every server accepts ranges or that every website permits video extraction.

## Use it

Open Flow Companion and paste a file, video or playlist URL. For recognized video pages choose Best video, Up to 1080p, Up to 720p or Audio only. Flow's confirmation retains the selection. Discovered sources can be refreshed and searched. Site capture/panel controls remain under one expandable section. Diagnostics copies a connection report without reading the pairing token or cookies.

Update Flow and reload the installed companion after installing 2.11. Chromium browsers use the regular ZIP. Firefox has a separate unsigned test ZIP; permanent Firefox installation still needs Mozilla signing. Browser IDs and native host identities remain stable.

## Simple by default

The popup shows a link input and detected sources. Video preferences appear only for a video; site capture and connection reports stay inside optional controls. Settings use two main groups rather than numbered cards. Neutral surfaces, visible boundaries and outlined secondary controls keep the groups distinct. The primary teal action is separated from small blue/amber media-type markers. Companion text, muted status and the primary action exceed 4.5:1 contrast in the default light and dark palettes. The floating video button has one download action and one small options menu, with three quick video/audio preferences.

Confirmation shows the link, inspection result and quality; file naming, save location and advanced settings expand when needed. Progress shows the file, percentage, bytes, speed and remaining time. One Details action reveals graphs, connection blocks, speed controls and file settings. Completion keeps direct Open file, folder access and the draggable file card. Native windows are smaller, with the same Light/Dark/AMOLED and RTL behavior.

## What changed

| Confirmed issue | Behavior in 2.11 |
| --- | --- |
| Filename determination waited for desktop work. | Chromium's filename callback is released immediately. |
| Flow availability was tested after pausing a browser download. | Availability is checked first. A connection failure leaves the browser receiving its original transfer. |
| Overlapping creation/filename events or a restarted worker could repeat capture. | One capture job per browser download plus bounded durable acknowledgements. |
| Browser cleanup failure after desktop acknowledgement could restart a duplicate copy. | An accepted handoff is retained and cleanup failure is reported separately. |
| Paused downloads or CDN links on excluded source sites could be intercepted. | User pauses and source-site exclusions are respected. |
| Quick quality/queue choices did not reach the final handoff. | Quality and Download later are carried through. |
| Ordinary click interception could replace page behavior and lose browser request semantics. | Automatic capture follows actual browser downloads. Explicit Ctrl+Shift sending remains opt-in. |
| Social-page mutations repeatedly scanned thousands of elements. | Shadow-root discovery is bounded and throttled; reinjection has one lifecycle. |
| Old source lists, menus and badges survived navigation/player changes. | Navigation results are invalidated, menus close, badges clear and request headers expire. |
| YouTube home/feed/channel pages were treated as video pages. | Video actions use video/Shorts/embed/playlist routes. |
| A CDN's rounded range response was mistaken for a small complete file. | The probe validates Content-Range and uses its complete size. |
| A transient connection reduction could restrict later files for a day. | Temporary hints expire; healthy transfers regain connections within user caps. |
| Detached snapshots rewrote unchanged records. | Only changed worker records are persisted. |
| Progressive site videos used sequential HTTP chunks. | A verified bundled downloader uses parallel HTTP ranges, with actual progress and resumable parts. |
| External downloader RPC could keep its helper alive after completion. | Terminal download states close that private helper and propagate failures promptly. |
| Merged stream names could count audio bytes twice. | Downloader files and progress hooks use the same format identity. |
| Repeated extractor self-extraction added startup work. | Both Windows packages prepare and verify the complete official directory distribution at build time. |

## Encrypted session recovery

A real installed-profile check exposed a temporary Windows lock when replacing an old encrypted engine session. Replacement now retries bounded sharing/access failures without deleting the prior session. If engine reconnection still fails, the library, interface and tray remain available; a later download can reconnect after the lock releases.

The regression uses a real Windows read handle that denies replacement, checks the preserved encrypted metadata, releases it, then completes a byte-identical 2 MiB download without restarting the desktop. [Reproduce the exercise](../scripts/run-engine-session-recovery-qa.cjs). This does not override Windows access controls or publisher policies.

## Evidence and limits

The controlled independent-engine benchmark downloaded the same 8 MiB with one and eight connections while the window was minimized. The exact installed release measured 16,439 ms versus 2,453 ms, **6.7× in that fixture**, with exact byte equality. The fixture deliberately caps each connection at 8 KiB per 10 ms. This measures working parallelism, not a universal internet speed multiplier.

An authenticated 16 MiB site-video fixture reached eight actual simultaneous HTTP requests, reported live intermediate progress and produced matching bytes. Separate real-tool regressions pause and resume the video and check that saved bytes are not counted twice against the quota. Those controlled byte fixtures test transport. A separate generated video/audio fixture is downloaded, merged and fully decoded with FFmpeg, with quota usage equal to the two source streams. Neither fixture proves public-site access. The pinned Windows extractor is official 2026.10.26.

[Validation](../VALIDATION.md) lists release-specific results. Real Firefox and Opera runs cover browser handoff, native authentication and browser fallback. The additional popup/panel suite uses controlled browser API fixtures; it is not presented as a substitute for real-browser integration.

Small files may finish with fewer connections. A server that ignores ranges remains on one safe connection. Website throttling, account verification, DRM, disk speed and the user's connection still constrain performance. Site-extracted HLS/DASH uses native fragment concurrency; directly captured manifests retain their existing FFmpeg path. Windows packages remain unsigned, Linux packages remain deferred, and a signed Firefox XPI is not supplied.

Protocol references: [Chrome downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads), [yt-dlp downloaders and fragment concurrency](https://github.com/yt-dlp/yt-dlp#download-options), [aria2 RPC](https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface).
