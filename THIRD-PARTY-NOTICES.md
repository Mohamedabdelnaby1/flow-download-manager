# Third-party components

Flow is an independent implementation. It does not include or link to Tonec IDM binaries or branding.

Dependencies retain their original licenses in node_modules and in the packaged application:

- Realm JS 20.2.0: Apache-2.0 — https://github.com/realm/realm-js
- Electron 45.0.0: MIT plus Chromium notices in LICENSES.chromium.html — https://github.com/electron/electron
- basic-ftp 6.2.3: MIT — https://github.com/patrickjuchli/basic-ftp
- cheerio 1.2.0: MIT — https://github.com/cheeriojs/cheerio
- http2-wrapper 2.2.1: MIT — https://github.com/szmarczak/http2-wrapper
- proxy-agent 6.5.0 and its dependencies: original MIT licenses — https://github.com/TooTallNate/proxy-agents
- ffmpeg-static 5.3.0: GPL-3.0-or-later — https://github.com/eugeneware/ffmpeg-static

The Windows FFmpeg executable supplied by ffmpeg-static is FFmpeg 6.1.1 essentials, built by Gyan.dev with GPL/version3 enabled. Its corresponding license and build README are included alongside ffmpeg.exe as ffmpeg.exe.LICENSE and ffmpeg.exe.README. Upstream release and source information: https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1 and https://www.gyan.dev/ffmpeg/builds/ . Retain these notices and the corresponding source/license obligations when redistributing the binary.

Flow is provided as editable project source. No commercial publisher signing certificate is included.


## yt-dlp — 2026.10.21

The independently executed official Windows utility is distributed in vendor/yt-dlp.exe. Its release metadata and verified SHA-256 are in vendor/yt-dlp.json. The upstream project is https://github.com/yt-dlp/yt-dlp and corresponding release sources are available at https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.21 and https://github.com/yt-dlp/yt-dlp/tree/2026.10.21 .

The project source is Unlicense. The official bundled executable includes third-party components and the combined executable is GPLv3+. Full upstream notices and GPL text accompany it in vendor/yt-dlp-THIRD-PARTY-LICENSES.txt and vendor/GPL-3.0.txt. It runs as a separate process; Flow source is provided with this delivery. EJS scripts are bundled by the official utility. Electron supplies the Node runtime; no separate runtime download is used.
