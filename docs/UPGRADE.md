# Upgrade and maintenance

1. Exit every older Flow instance with **Tasks → Exit** or the tray's **Exit**. Closing the main window only hides it.
2. Run **Flow-2.6.0-Setup.exe**. Existing registered installations receive **Repair / update**, **Reinstall**, and **Uninstall** choices. Repair and reinstall keep the existing location and scope; they replace application files while preserving the local library, settings and downloaded files. Uninstall opens the registered application's uninstaller.
3. Start Flow. Existing browser setup refreshes its stable companion folder and native-host configuration.
4. In `chrome://extensions`, reload **Flow Companion**. Unpacked browser extensions need this one browser reload; simply running a new desktop file cannot replace code already running in Chrome. Updated content scripts remove obsolete overlays from eligible open tabs.
5. Test the connection. Both the desktop and companion should show **2.6.0** in integration status. If an old desktop is still resident, the new companion explains how to exit it and keeps Chrome's own transfer.

New profiles use English and System appearance. Existing preferences are kept; change them in **Options → General**. The panel's grip moves it, **−** minimizes it and **×** hides it. **Show / reset video panel** in the toolbar popup restores it without a page reload. Position is stored per site.

Portable launches without installation but uses the Windows profile for data; it is not a zero-footprint USB package. Move a portable executable only while Flow is stopped, then reopen it so the native host learns its location.

Maintenance was exercised with the same NSIS page code in an isolated fixture. A real same-version installed repair kept one Windows registration and the library. A clean-machine uninstall and authenticated Facebook transfer were not verified.

Use one download manager for browser capture. Another manager can intercept an attachment before Chrome exposes it to Flow. If IDM still opens after its extension is disabled, disable browser integration in IDM's General options and restart the browser. A broken IDM installation may need its own repair; Flow does not modify or uninstall another manager. See [IDM's integration options](https://www.internetdownloadmanager.com/support/options.html).
