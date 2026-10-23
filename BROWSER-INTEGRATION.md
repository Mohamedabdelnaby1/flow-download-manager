# Browser integration

## One-time setup

1. Open Flow and choose **Browser** in the toolbar.
2. Select **Set up browser integration**. This prepares the extension and registers the host for your Windows user.
3. Choose **Open extension folder** and keep its path.
4. In Chrome open `chrome://extensions`; in Edge use `edge://extensions`.
5. Enable **Developer mode**, choose **Load unpacked** and select the prepared `Flow-Companion` folder.
6. Open the extension popup and choose **Test connection**.
7. Enable automatic capture if desired. It is optional.

This is a locally loaded extension, not a Chrome Web Store listing. Keep the manifest key unchanged: it determines the ID authorized by the native host. Windows native registration supports Chrome, Edge, Brave and Chromium.

## Controls

| Control | Result |
| --- | --- |
| Right-click → Download with Flow | Manual link/media handoff |
| Alt + click | Temporarily bypass capture for that URL |
| Ctrl + Shift + click | Manually send a link |
| Pause capture for 15 min | Leave downloads in the browser temporarily |
| Site capture toggle | Exclude the page host, including a separate CDN's file |
| Show / reset video panel | Restore the panel and default placement |
| Drag grip / arrow keys when focused | Move the panel, with per-host persistence |
| Minus / close | Minimize or hide the panel on this page |
| Site panel toggle | Persistently hide the panel on that host |

## Upgrading and troubleshooting

Exit older Flow instances through their tray menu. Launch the new version, prepare integration if needed, reload the extension. Eligible open pages receive updated panel controls without a full page reload. See [upgrade and maintenance](docs/UPGRADE.md). Previously configured integration is refreshed at app startup.

Chrome cancels only after Flow acknowledges a handoff. On failure the extension attempts to resume Chrome's copy. Check that integration is enabled and the native host is registered for the same Windows user. A successful ping does not prove that a website permits downloading.

For website videos, open the dedicated page, play the media and inspect quality in Flow. Sessions and signed URLs expire. POST, blob/data, incognito and DRM downloads remain in the browser. Host/cookie/webRequest permissions support discovery and authorized session handoff. Never publish your pairing token, cookies or private URLs.

The optional authenticated HTTP fallback accepts a loopback address only. Do not expose the local service to a network.
