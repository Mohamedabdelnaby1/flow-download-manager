# Feature guide

## Download engine

- HTTP/HTTPS range probing with GET fallback, redirects and HTTP/2.
- Dynamic segments, persistent checkpoints, retries, pause and resume.
- Content-Range, ETag, Last-Modified and received-length validation before combining remote data.
- FTP passive transfers and resume at saved local byte offsets.
- Per-file, aggregate and shared queue HTTP bandwidth limits; scheduling, priorities and rolling quotas.
- External scanner using argument arrays rather than shell command interpolation.
- ZIP central-directory preview through HTTP ranges, excluding ZIP64 and multipart archives.

## Browser integration

Chromium Manifest V3 companion, Windows Native Messaging and authenticated loopback fallback. Context menus, selected links, page link picker, authorized cookie/referrer handoff and optional automatic capture. Snooze capture for 15 minutes or exclude a site. Chrome cancels only after desktop acknowledgement. POST, blob/data, incognito downloads and excluded types remain in the browser.

The floating video panel supports pointer dragging, keyboard positioning, per-host persistence, minimize, close, reset and site hiding. Discovery filters byte-range fragments and signed duplicates. Separate video tracks may still need audio merging.

## Video and media

Bundled yt-dlp selects website formats and merges audio/video with FFmpeg. Public YouTube playlist inspection is bounded to 200 items; selection to 100. Best, audio-only and maximum 480p/720p/1080p options are available. Direct unencrypted HLS/DASH streams can be assembled. Protected media is rejected.

The workshop converts completed local media to MP3, M4A, MP4 or WebM, trims time ranges and limits video height. It reports progress, supports cancellation and preserves originals. One job runs at a time.

## Library and recovery

- Up to 30 favorite folders and 20 recent destinations, plus actual disk capacity inspection.
- Rename queued/paused tasks using `{name}`, `{n}`, `{host}`, `{ext}`, literal replacement and number padding. Preview, collision detection and guarded undo.
- Up to 12 tags per task, at most 40 characters each.
- Compound search: `host:`, `ext:`, `status:`, `tag:`, `min:`, `max:`, `queue:`, words and quoted phrases.
- Up to 30 saved views in the sidebar.
- Recovery bin bounded to 500 records, with no automatic purge. Restore retained tasks and partial bytes. Permanent bin removal preserves completed disk files.
- Duplicate URL guard, file presence checks, stored-hash duplicate candidates and fresh SHA-256 verification.
- URL rescue checks size, validators and samples from saved segments before replacing an incomplete HTTP task's URL.

## Productivity and desktop

Inspect up to 200 URLs with bounded concurrency, numeric expansion and deduplication. Ordered host/extension rules set folder, category, queue, priority, filename prefix and speed. Preview/import/export rules. Traffic profiles include normal, browsing, metered and custom, plus a weekly calendar and overnight periods.

English default, Arabic RTL, System/Light/Dark, 80–150% scaling, separate native windows, minimize, tray, floating drop basket and integrated creator signature. Optional keep-awake runs only while downloads are active. Selective backups omit secrets and restore related groups in one Realm transaction; imported schedules remain disabled until manually enabled.

See [limitations](docs/LIMITATIONS.md) and [validation](VALIDATION.md) for exact scope.
