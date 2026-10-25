# Known boundaries

Flow's feature descriptions refer to implemented behavior, not a guarantee for every website, device or network.

| Area | Current boundary |
| --- | --- |
| Platform | Windows 10/11 x64. No Windows 7/8/8.1 support. Linux packages are deferred; no macOS release is supplied. |
| Signing | Windows executables are currently unsigned. Trusted publisher signing needs a certificate or configured signing service. A SHA-256 checksum does not establish publisher identity. |
| Compact Preview | An optional host using shared Microsoft WebView2 and .NET Framework 4.8. Those prerequisites are outside the compact download size. Keep the complete Electron edition for compatibility. Short local checks do not establish identical speed or behavior on every computer. |
| Portable | Skips application installation but stores data in the Windows profile. Browser integration registers a per-user native host. The compact portable launcher retains a versioned runtime cache for its independent engine; this is not a zero-footprint USB application. |
| Browser setup | The companion needs one manual Load unpacked step because it is not listed in a browser store. Native Messaging checks and fixture-based panel tests do not prove every personal browser profile. |
| Website videos | Site availability, signed URLs, authentication, geographic restrictions and extractor changes can affect support. Flow does not decrypt DRM. Successful public YouTube checks do not prove authenticated Facebook or every course platform. |
| Torrents and mirrors | The bundled aria2 engine supports transfers, file selection and piece information. Availability and speed depend on peers, seeds, trackers and source servers. Flow does not supply torrent content or promise a speed multiplier. |
| Transfer limits | Simultaneous-file admission includes direct tasks, queues, torrents and mirrors. Torrent peer count is separate from HTTP connections. HTTP tasks support per-file/global/shared-queue bandwidth caps. FTP limiting is unavailable. Direct FFmpeg streams reject configured speed/quota restrictions. Website videos take their limit at start and do not share the HTTP queue's aggregate bandwidth pool. |
| Recovery | Expired-link rescue needs a saved source page, strong file identity and matching partial-byte samples; other cases require manual review. A publisher checksum should be verified after completion. Recovery cannot recreate a completed file physically deleted from disk. |
| Archives | Selective ZIP preview needs range support and excludes ZIP64, multipart and encrypted entries. General automatic ZIP/7Z/RAR extraction is not included. |
| Media tools | One workshop job runs at a time. Trimming currently processes an already downloaded file. Subtitle/audio-track selection and direct time-range downloads are future work. |
| Configuration backups | Exclude files, partials, keys, passwords and scanner/proxy secrets. Imported schedules remain disabled until explicitly enabled. Cross-device sync is not implemented. |
| Updates | Release notifications and a trusted GitHub download-page button are implemented. Unattended download/install, waiting-for-transfers update orchestration and automatic rollback are not. |
| Other workflows | Playlist subscriptions, watched link folders and reliable file-update subscriptions are not included yet. The site grabber inspects static HTML rather than running a complete browser crawler. |

Another download manager can intercept a browser request before Flow receives it. In an older live test, an IDM native interceptor continued taking extensionless attachments after its Chrome extension was disabled; direct ZIP handoff succeeded. Keep this access condition separate from the result of a Flow transfer test.

See [validation](../VALIDATION.md) for the exact distinction between source tests, packaged UI checks, installed upgrade exercises, controlled transfers and public release verification. No Windows 7 VM or clean machine without WebView2/.NET was tested.
