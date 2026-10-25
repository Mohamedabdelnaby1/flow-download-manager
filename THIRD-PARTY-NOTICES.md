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


## Optional Compact Preview host

The compact Windows edition uses the complete official Node.js 22.14.0 Windows x64 executable, without recompiling or trimming ICU, inspector or runtime features. Its MIT license and bundled dependency notices are included as `runtime/LICENSE.txt`. Upstream: https://nodejs.org/dist/v22.14.0/ and https://github.com/nodejs/node/tree/v22.14.0 . SHA-256: `33b1bc1a8aca11fd5a4f2699e51019c63c0af30cf437701d07af69be7706771b`.

Microsoft.Web.WebView2 SDK 1.0.4314.35 assemblies and loader retain Microsoft's distribution license and notices under `licenses/`. The Evergreen WebView2 Runtime is a shared system prerequisite distributed by Microsoft, not bundled in Flow's compact download size. https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4314.35 .

The complete official unpacked `yt-dlp_win.zip` release replaces the duplicate standalone extractor in compact packages. All distribution files are verified against `vendor/yt-dlp-unpacked.json`; dependency functionality is retained. The Electron packages continue to include the standalone extractor.

## aria2 distribution

Flow 2.6 includes aria2 1.37.0 as a separate executable, licensed GPL-2.0-or-later with its OpenSSL exception and notices. Windows binary provenance, AUTHORS, COPYING, LICENSE.OpenSSL and build README are in `vendor/aria2/`. Corresponding upstream source: https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0.tar.xz . Linux builds use the distribution aria2 package and bundle its linked libraries with copyright files and version provenance under `vendor/aria2/`. Flow original application code remains MIT; do not remove third-party license/source obligations.
