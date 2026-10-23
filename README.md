<div align="center">

<img src="docs/hero.svg" alt="Flow — Downloads, under your control" width="100%">

# Flow Download Manager

**A Windows download manager with browser handoff, an encrypted local library, and tools for the whole download workflow.**

![Windows](https://img.shields.io/badge/Windows-x64-1975ca?style=flat-square)
![Version](https://img.shields.io/badge/version-2.5.1-1975ca?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-45-293744?style=flat-square)
![Realm](https://img.shields.io/badge/Realm-local%20%26%20encrypted-5f4bb6?style=flat-square)
![Languages](https://img.shields.io/badge/English%20%2F%20Arabic-293744?style=flat-square)

[**Download for Windows**](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/latest) · [Features](FEATURES.md) · [Browser setup](BROWSER-INTEGRATION.md) · [Development](docs/DEVELOPMENT.md) · [Report a problem](https://github.com/Mohamedabdelnaby1/flow-download-manager/issues/new/choose)

</div>

![Flow desktop in English](docs/screenshots/desktop-light.png)

## Built around the actual workflow

Send a file from the browser. Confirm its destination in a separate desktop window. Pause, resume, organize and verify it. Flow keeps the task, its partial data and the surrounding tools in one local system.

Created by **mohamed abdelnaby** — [Facebook](https://www.facebook.com/mohamedabdelnaby190).

## Download

| Edition | Best for | Download |
| :--- | :--- | :--- |
| **Installer** | Shortcuts, Start menu and a standard uninstall entry | [Flow-2.5.1-Setup.exe](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/download/v2.5.1/Flow-2.5.1-Setup.exe) |
| **Portable launcher** | Launch without running the installer | [Flow-2.5.1-Portable.exe](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/download/v2.5.1/Flow-2.5.1-Portable.exe) |
| **Browser companion** | Chrome, Edge, Brave and Chromium | [Flow-Companion-2.5.1.zip](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/download/v2.5.1/Flow-Companion-2.5.1.zip) |
| **Source bundle** | Source, tests, docs and screenshots | [Flow-2.5.1-Source.zip](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/download/v2.5.1/Flow-2.5.1-Source.zip) |

Windows x64. Executables are unsigned. Portable skips installation but still stores data in your Windows profile; enabling native browser integration registers a host for your user. It is not a zero-footprint USB edition. Verify files using the release's [SHA256SUMS.txt](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/download/v2.5.1/SHA256SUMS.txt).

## What you can do

| Download | Organize | Control |
| :--- | :--- | :--- |
| Segmented HTTP/HTTPS with safe range validation | Favorite and recent folders | Per-file, global and shared queue HTTP limits |
| Pause, resume and persistent checkpoints | Batch rename with preview and guarded undo | Schedules, quotas and traffic profiles |
| FTP transfer and byte-offset resume | Tags, compound search and saved views | Rules by host and extension |
| Website quality selection and audio merging | Recovery bin for tasks and partial data | Capture snooze and site exclusions |
| Unencrypted HLS/DASH assembly | Missing-file checks and duplicate candidates | SHA-256 verification and URL rescue |
| Public YouTube playlist selection | Selective configuration backup | Media conversion, trim and resolution limits |

English by default, with optional Arabic RTL. **System, Light and Dark appearance**, live system changes, 80–150% text scaling and independently resizable/minimizable tool windows.

### Browser handoff you can control

- Native Messaging connects to Flow and can launch the app when needed.
- Confirmation and progress open in separate desktop windows.
- Chrome cancels its copy only after Flow acknowledges handoff; failed handoffs resume Chrome's download.
- Pause capture for 15 minutes, exclude a site or bypass a link with **Alt + click**.
- Drag, minimize, close or reset the floating video panel; position persists per host.
- Fragment URLs and signed duplicates are filtered. Website videos use readable titles and a quality picker.

[Set up the extension →](BROWSER-INTEGRATION.md)

## A closer look

<table>
<tr><td width="50%"><img src="docs/screenshots/desktop-dark.png" alt="Dark desktop"><br><b>Dark appearance</b><br>Follow Windows or choose your palette.</td><td width="50%"><img src="docs/screenshots/settings.png" alt="Appearance settings"><br><b>Your interface</b><br>Language, appearance and text scaling.</td></tr>
<tr><td><img src="docs/screenshots/library.png" alt="Folders and storage"><br><b>Library and storage</b><br>Destinations and disk capacity within reach.</td><td><img src="docs/screenshots/rename.png" alt="Batch rename"><br><b>Prepare a batch</b><br>Preview filenames before applying changes.</td></tr>
<tr><td><img src="docs/screenshots/productivity.png" alt="Productivity tools"><br><b>Rules and traffic</b><br>Organize repetitive work and bandwidth.</td><td><img src="docs/screenshots/smart-tools.png" alt="Library health"><br><b>Inspect and recover</b><br>File presence, integrity and failed downloads.</td></tr>
</table>

Real desktop captures with demonstration records. They do not prove universal website support or a live personal-browser installation. [Gallery →](docs/SCREENSHOTS.md)

## Get started

1. Download an edition from [Releases](https://github.com/Mohamedabdelnaby1/flow-download-manager/releases/latest).
2. Choose **Add URL**, or prepare integration from **Browser** in the toolbar.
3. Inspect the link, choose destination/quality, then **Start download** or **Download later**.
4. Use **Options → General** for English/Arabic, System/Light/Dark and text size.

Closing the main window keeps Flow in the tray. Use **Tasks → Exit** or the tray's **Exit** to quit. Before upgrading, exit older versions, then reload the extension and affected browser tabs.

## Build and develop

```powershell
npm ci
npm run native
npm test
npm start
```

Build both Windows editions with `npm run dist`. Development requires Node.js 22.12+; Node 22 is the tested build line. Windows .NET Framework's compiler builds the native host. End users need no separate Node.js or Python installation. [Development guide →](docs/DEVELOPMENT.md)

## Architecture

```mermaid
flowchart LR
  B[Chromium extension] -->|Native Messaging| N[Windows native host]
  N -->|Authenticated loopback| S[Local service]
  U[Electron windows] -->|Validated IPC| S
  S --> E[Download engine]
  S --> R[(Encrypted local Realm)]
  E --> H[HTTP / HTTPS / FTP]
  E --> V[yt-dlp + FFmpeg]
  S --> T[Library / rules / media tools]
```

HTML/CSS/JavaScript UI, sandboxed renderers, context isolation and a bounded preload API. Realm stores tasks/settings locally; desktop keys use the OS secure store. [Architecture and data handling →](docs/ARCHITECTURE.md)

## Validation and boundaries

See [validation](VALIDATION.md) for current local results, earlier evidence and unverified scenarios. Flow does not decrypt DRM, provide torrents, sync across devices or promise every website. Live authenticated Facebook downloads and a personal Chrome/Edge extension installation remain unverified. Transport-specific speed limits are explained in [limitations](docs/LIMITATIONS.md).

## Project information

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Research](RESEARCH-AND-UPGRADES.md) · [Third-party notices](THIRD-PARTY-NOTICES.md) · [Copyright](COPYRIGHT.md)

Flow is independent. It contains no Tonec IDM binaries and claims no affiliation with IDM.

<div align="center"><sub>Flow · Crafted by <a href="https://www.facebook.com/mohamedabdelnaby190">mohamed abdelnaby</a></sub></div>
