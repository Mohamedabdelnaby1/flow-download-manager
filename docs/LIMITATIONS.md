# Known limitations

- Windows x64 is the packaged target; no macOS/Linux binaries are supplied.
- Executables are unsigned; no publisher certificate is supplied.
- Portable skips installation but uses Windows profile storage. Browser setup registers a per-user host.
- The extension needs manual developer-mode loading. Live installation in a personal Chrome/Edge profile and authenticated Facebook downloads remain unverified.
- Site support changes with sessions, signed URLs, restrictions and extractor updates. Two successful YouTube examples do not establish universal support.
- No DRM bypass, torrent engine, phone remote control or cross-device sync.
- HTTP/HTTPS files support per-file/global/shared-queue speed caps. FTP limiting is unavailable. Direct FFmpeg streams reject configured speed/quota restrictions. Website videos take the program/file limit at start and do not share HTTP queue aggregate limiting.
- Rescue checks validators and saved-byte samples, not complete file identity. Verify a publisher checksum after finishing.
- Recovery cannot restore a completed file physically deleted from disk. Changing the partial folder may require restoring its old location first.
- Configuration backups exclude files, partials, keys, passwords and scanner/proxy secrets. Imported schedules stay disabled until manually enabled.
- ZIP preview needs ranges and excludes ZIP64/multipart archives. Site grabber reads static HTML rather than running a full browser crawler.
- One workshop job at a time. Media without audio cannot produce meaningful audio output.
- Installer archive validation is not a clean-machine install/uninstall test. Dependency audit covers known package advisories, not the entire product's security.
