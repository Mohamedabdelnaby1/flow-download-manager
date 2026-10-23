# Research and product decisions

Flow prioritizes a locally stored workflow: handoff, clear confirmation, recovery, organization and integrity. It is independent from IDM and claims neither complete parity nor universal superiority.

## Feedback informing the tools

- [IDM workflow discussion](https://www.reddit.com/r/software/comments/1peonii/windows_does_internet_download_manager_still_do/): capture controls, destination handling and interaction friction.
- [Batch rename request](https://www.reddit.com/r/software/comments/k0o9fd/looking_for_download_manager_with_batch_rename/): prepare predictable names before downloading.
- [Missing downloads](https://www.reddit.com/r/software/comments/1uxhi1e/internet_download_manager_missing_downloads/): distinguish stored completion from files still present on disk.
- [Expired-link discussion](https://www.reddit.com/r/FreeDownloadManager/comments/1p50wc2/whenever_link_expires_the_download_completely/): preserve parts and validate a replacement URL.

These are individual reports, not a representative survey or proof of a universal competitor deficiency. Product behavior changes. Primary references: [IDM release notes](https://www.internetdownloadmanager.com/news.html) and [AB Download Manager changelog](https://github.com/amir1376/ab-download-manager/blob/master/CHANGELOG.md).

## Implemented responses

Favorite/recent folders, rename preview, saved search, file presence checks, fresh hashes, sampled URL rescue, recovery bin, capture snooze, per-site controls, movable panel, separate windows and system appearance use the same local service/database. [Features](FEATURES.md), [validation](VALIDATION.md) and [limitations](docs/LIMITATIONS.md) define actual scope.

Torrent, DRM bypass, remote phone control and cloud sync are not implemented or advertised. Future work should start with reproducible workflows and measured failures.
