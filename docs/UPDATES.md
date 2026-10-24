# Desktop update notifications

Flow checks the public GitHub Releases API about ten seconds after desktop startup, then every six hours while it remains running, including in the tray. A newer stable release opens an independent update window with the installed version, new version, release notes and **Download from GitHub**.

The button opens the verified release page in the default browser. Choose Setup or Portable, finish active downloads and exit Flow from its menu before installing. Flow does not silently download, execute or install an update.

**Help → Check for updates** checks on demand, including when automatic checks are disabled. The update window also provides:

- **Remind me tomorrow**: defer automatic reminders for 24 hours.
- **Skip this version**: suppress that version; later newer versions can still notify.
- **Check automatically**: persistently enable or disable background checks.

Closing an automatically opened window does not cause repeated popups for that version during the next 24 hours. Offline failures and GitHub request limits remain quiet in the background; a manual check explains the failure and offers retry. The window follows English/Arabic, system appearance and text scale.

## Publish an update that reaches installed users

1. Increase the three-part version in `package.json`, the root package entries in `package-lock.json`, and `extension/manifest.json`. Keep visible version labels in sync.
2. Build and test the Windows editions.
3. Create a GitHub Release such as `v2.6.0`, attach `Flow-2.6.0-Setup.exe` and/or `Flow-2.6.0-Portable.exe`, and wait for uploads to complete.
4. Publish it as the latest stable release. Drafts, prereleases and releases without a ready Windows executable are not offered.

A source commit or tag without a published Release does not contain an installable application and does not trigger an update notification. The app must be running to check; it does not add a separate Windows service. People using Flow 2.5.2 or earlier must install 2.5.3 once to receive this feature.

## Request and link handling

Checks use the fixed public repository endpoint without a GitHub login, token, download history or browser cookies. Only the Flow version is included in the User-Agent. Requests time out and bound response size. Release notes are rendered as escaped plain text. The download action accepts only the fixed repository's verified release page, rather than links supplied in release notes or renderer arguments.
