# Validation — Flow 2.5.1

Local checks dated 2026-10-23. These results cover the cases listed, not every website or computer.

| Check | Result | Evidence |
| --- | --- | --- |
| Engine, Realm, handoff, FTP, recovery, rules, media and preferences | **113 passed, 0 failed** | [Engine tests](docs/validation/engine-tests.txt) |
| Packaged desktop English, theme and window workflows | **39 passed** | [Packaged workflows](docs/validation/desktop-workflows.json) |
| Final portable executable, same workflow suite | **39 passed** | [Portable workflows](docs/validation/portable-workflows.json) |
| Floating video panel and real YouTube quality inspection | **14 passed** | [Panel checks](docs/validation/video-panel.json) |
| Extension popup, including system appearance | **10 passed** | [Popup checks](docs/validation/extension-popup.json) |
| Source/runtime parity | **54 matching files** | [Parity](docs/validation/source-package-parity.json) |
| Production dependencies | **0 known advisories** at check time | [Audit](docs/validation/dependency-audit.json) |
| Installer archive integrity | **Passed**; expected NSIS trailing-data warning | [Archive check](docs/validation/installer-archive.json) |

The 39 workflow checks are repeated against unpacked and portable execution; they are not 78 distinct features. They cover English defaults and errors, Arabic/English switching while preserving a form draft, system appearance across five open windows, explicit palette overrides, confirmation/minimize, scheduler, batch, About attribution, drop basket and 640×440 layout at 150% scaling.

The 24 browser UI checks run in packaged Chromium using controlled Chrome API fixtures. One supplied YouTube Shorts URL was inspected with the actual bundled extractor. A live extension installed in a personal Chrome/Edge profile and authenticated Facebook downloads remain unverified. Installer CRC checks do not replace a clean-machine install/uninstall test. Dependency audit is not a full security audit.

## Earlier evidence

Release 2.5.0 had 109 automated tests, 92 desktop-tool workflow checks and successful download/audio-video decoding for two user-supplied YouTube examples. These historical counts are not presented as fresh 2.5.1 download or tool-suite runs. See [limitations](docs/LIMITATIONS.md).
