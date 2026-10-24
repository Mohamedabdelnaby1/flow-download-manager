# Linux packaging - deferred

**Linux packages are deferred at the author's request. The 2.6.0 public release contains Windows editions only.** The work below is preparatory and is retained for a future Linux release. The clean Linux dependency install succeeded, but the integration gate exposed an HLS processing failure; packaging and packaged desktop verification did not run. Do not treat the following build/setup instructions as a verified Linux release.

The planned formats are DEB, RPM and AppImage. The automated desktop gate runs the actual packaged application on Ubuntu 24.04 with an X11 virtual display. Wayland, physical audio devices and other distributions need separate testing; ARM/Flatpak builds are not supplied.

## Install and start

- Debian/Ubuntu: open the DEB in your package installer, or use `sudo apt install ./Flow-2.6.0-linux-amd64.deb`.
- Fedora/RPM-based distributions: open the RPM, or use `sudo dnf install ./Flow-2.6.0-linux-x86_64.rpm`.
- AppImage: allow execution in file properties, then open it. Keep it in a permanent location before enabling startup or browser integration. FUSE availability depends on the distribution; `--appimage-extract-and-run` is an alternative if FUSE is absent.

Use Options → General → Start with system to create a per-user XDG autostart entry. It launches quietly with `--background`; turning it off removes Flow's entry. Some GNOME desktops require an AppIndicator extension to display tray icons. Launch Flow again to reopen its resident instance.

## Browser integration

In Flow, choose Browser → Prepare integration. It copies the companion and registers owner-only native-host manifests for Google Chrome, Chromium, Brave and Edge under your XDG configuration directory. Load the shown companion folder from your browser's extensions page with Developer mode enabled. The host uses the bundled Electron runtime as Node; it does not require system Node/Python. AppImage registration uses the permanent AppImage launcher.

Browser installations confined by Flatpak/Snap may not be able to access a native host outside their sandbox. This release targets conventional browser packages. Firefox/Safari companions are not included.

## Media, torrent and sounds

The Linux package bundles the pinned, SHA-256-verified Linux yt-dlp executable, Linux FFmpeg and aria2. Linux aria2 shared libraries and their copyright notices are included by the build job. A Windows executable is never substituted for the Linux video engine.

DEB/RPM sound playback uses desktop WAV tools: `paplay`, then `pw-play`, then `aplay`. An AppImage on a minimal system may need `pulseaudio-utils`, `pipewire-bin` or `alsa-utils` for sounds. A missing audio output produces a useful error rather than blocking the download engine.

## Local data

The Realm library is encrypted. With an available system secret store, Electron protects its key with that store. Without a secure backend, Linux uses a private owner-only key file; this fallback does not protect against someone who can read the same user's files. The browser bridge configuration is owner-only. Neither file belongs in a bug report or repository.

## Build

On a Linux x64 machine with Node 22.14+, packaging dependencies and aria2 installed:

```sh
npm ci
npm run prepare:linux
npm test
npm run dist:linux -- --publish never
xvfb-run -a node scripts/linux-package-qa.cjs
```

The workflow uploads the three packages plus `Linux-Verification.json`. Publishing to Releases is a separate step after every platform gate passes.
