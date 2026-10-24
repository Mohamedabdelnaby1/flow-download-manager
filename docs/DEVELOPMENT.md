# Development and building

## Requirements

Windows x64, Node.js 22.12+ and npm. Node 22 is the tested build line. The native host uses Windows .NET Framework's `Framework64/v4.0.30319/csc.exe`. Network access is needed for npm, Electron, Realm and FFmpeg dependency downloads.

```powershell
npm ci
npm run native
npm test
npm start
```

`npm run web` starts the same Node/Realm service with a browser UI. It is not a standalone static website and lacks some desktop capabilities. The default address is `127.0.0.1:17863`; stop another Flow instance before using the same port.

## Build

```powershell
npm run dist
```

Outputs: `release/Flow-2.5.4-Setup.exe` and `release/Flow-2.5.4-Portable.exe`. `npm run pack` creates an unpacked app. Runtime/dependencies are pinned in the lockfile; `npmRebuild: false` preserves the Realm distribution used here.

The official independent `vendor/yt-dlp.exe` has version, SHA-256 and licenses in `vendor/`. Verify hashes and update notices when replacing it. Electron supplies the JavaScript runtime; FFmpeg comes from `ffmpeg-static`. End users need no separate Node or Python installation.

## Verification

```powershell
node scripts/verify-source.cjs
npm test
npm audit --omit=dev
```

Tests use isolated temporary databases and local HTTP/FTP fixtures. They check actual bytes, pause/resume, errors, authorized handoff, quotas, rescue and media. Windows native tests need the compiled host. Local tests do not prove live website or personal-browser behavior.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/electron.cjs`, `src/windows.cjs` | Main process, tray, IPC and tool windows |
| `src/service.cjs`, `src/server.cjs` | Validated actions and authenticated local service |
| `src/engine.cjs`, `src/network.cjs` | Transfers, segments, validation and transport |
| `src/store.cjs` | Encrypted Realm schemas and settings |
| `src/library.cjs`, `src/smart.cjs` | Organization, recovery, integrity and rescue |
| `src/power.cjs`, `src/automation.cjs`, `src/workshop.cjs` | Link tools, rules, traffic and media |
| `src/video.cjs`, `src/grabber.cjs` | Website extraction and static site capture |
| `ui/`, `extension/`, `native/`, `test/` | Shared UI, browser companion, C# bridge and tests |

Never commit runtime databases, keys, browser profiles, host configuration, session data, downloads or release executables. Put binaries in GitHub Releases. Release verification scripts are provided for local Windows use; do not interpret their presence as a successful GitHub Actions run.
