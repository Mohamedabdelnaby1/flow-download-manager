# Connect your browser to Flow

Flow 2.10 provides separate Chromium and Firefox companions and native-host registration for each family. Open **Browser integration**, select your browser, then choose **Set up connection**. No pairing token is needed for Native Messaging.

| Browser | Companion | Installation |
| --- | --- | --- |
| Chrome, Edge, Brave, Opera, Opera GX, Vivaldi, Chromium | Chromium | Load the prepared folder once from that browser's extensions page |
| Firefox 142+ | Firefox | Permanent installation requires a Mozilla-signed XPI; the current release includes an unsigned developer-test bundle |

## Chromium browsers

1. Select your browser in Flow and choose **Set up connection**.
2. Choose **Open extensions page**. Enable Developer mode, then **Load unpacked**.
3. Choose **Open companion folder** in Flow and select that folder in the browser.
4. Open Flow Companion in the browser toolbar and choose **Test connection**. Turn on automatic capture if you want it.

The browser-specific pages are Chrome/Chromium: `chrome://extensions`, Edge: `edge://extensions`, Brave: `brave://extensions`, Opera/Opera GX: `opera://extensions`, Vivaldi: `vivaldi://extensions`. These are local browser pages.

## Firefox: current signing boundary

The Firefox adapter and native bridge are implemented and exercised with a real temporary add-on. The included **Unsigned** ZIP is a developer-test package, not a signed permanent installer. Firefox release/beta requires Mozilla signing for permanent installation. No browser signing or security preference needs to be disabled.

For a developer test: select Firefox in Flow, prepare the connection, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` inside the Firefox companion folder. A temporary add-on disappears when Firefox closes. Allow access to the sites from which you want to send downloads.

A signed XPI with the same add-on ID can later be installed permanently without changing the desktop bridge. [Signing instructions](docs/FIREFOX-SIGNING.md). There is no published AMO listing or signed Firefox asset claimed in this release.

## Using Flow Companion

- Right-click a file or media link and choose **Download with Flow**.
- Open the popup to send a supported video page or a discovered source.
- Enable **Automatically capture browser downloads** if wanted; leave it off for manual handoff.
- The browser keeps a transfer until Flow acknowledges it. Failed handoff resumes or leaves the browser download in place.
- File types, excluded sites, temporary capture pause and Alt-click bypass remain available. Private browsing, POST requests and protected media stay in the browser.

If files are going to another download manager despite a healthy connection, disable that manager's browser capture for the test. Two managers may intercept the same download. The real-browser QA uses isolated profiles and cloned browser executables to avoid the existing IDM process intercepting its fixtures; it does not change the user's IDM preferences.

## Privacy and authorized sessions

The companion forwards the chosen URL and relevant authorized request headers/cookies to Flow on your own computer. Flow may need them to download a file from a signed-in site. Recent request metadata is bounded in browser session storage; it is not sent to an analytics service. Firefox declares the corresponding authentication, browsing and website-content data permissions. Website verification and DRM restrictions still apply.

## Native host details

Windows uses a protected per-user configuration. Chromium manifests contain the fixed extension origin; Firefox has a separate manifest containing the fixed add-on ID. The helper accepts Firefox only when both the configured manifest path and add-on ID match. Opera uses the Chrome-compatible native-host registration described by Opera.

Linux registration paths are prepared in source, including Firefox's native-messaging-hosts directory, but Linux packages and a real Linux browser run remain deferred.

Official references: [Mozilla native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging), [Firefox background pages](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Opera native messaging](https://help.opera.com/en/extensions/message-passing/), [Vivaldi extensions](https://help.vivaldi.com/desktop/appearance-customization/extensions/).
