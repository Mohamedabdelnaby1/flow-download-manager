# Architecture and data handling

One Node service is shared by desktop windows, browser handoff and local tools. Renderers have no direct Node access: context isolation and sandboxing are enabled, the preload exposes bounded actions, and the main process validates the sender and page origin.

The loopback service validates Host/origin, bounds request bodies and separates UI-session authentication from extension authentication. Native Messaging allows only the stable companion origin. The C# bridge stores its token with Windows DPAPI and launches Flow without inherited logging pipes.

Realm stores downloads, embedded segments, queues, settings, events and grabber projects. Desktop encryption keys use the OS secure store. Web development mode uses a local key file instead and does not provide the desktop's OS-protected key storage. Never publish either key.

The engine validates file validators/ranges, persists offsets and avoids final-file replacement until processing succeeds. Pending browser confirmations are excluded from queue pumping. Maintenance locks coordinate rescue, deletion and other mutations.

FFmpeg and yt-dlp run as separate utilities. DRM is rejected. Data stays local except for requests to selected sources; there is no application analytics backend or cloud sync.

Diagnostic exports omit filenames, paths, URLs, cookies, authorization, tokens and raw errors. Configuration exports intentionally include chosen folder paths/hosts but omit secrets and executable settings. They do not back up downloads, partial data or Realm keys.
