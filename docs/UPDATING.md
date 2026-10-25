# Updating your installed Flow

**Choose Setup to update an installation.** Portable opens a separate executable;
it does not replace the installed application. Publishing a GitHub release does
not install it on your computer. The current in-app update notice opens the
official download page.

1. Finish your active downloads, then choose **Exit Flow** from the tray menu.
2. Download **Setup** for the edition you want from the official release.
3. Run it. When an existing installation is detected, choose **Repair / update**.
   The installer keeps its location and installation scope. A machine-wide
   installation can require Windows administrator approval.
4. Open Flow and check the version in **About**. Your library, settings and
   completed files are retained. The installer does not need you to uninstall
   Flow first.

The complete and compact Setup packages use the same installation identity.
Switching editions replaces that installation; it is not intended to create a
second registered app. Compact Preview checks its shared prerequisites before
replacing files and backs up an existing encrypted library before its first use.
It remains an optional preview. [Edition details](COMPACT-WINDOWS-PREVIEW.md).

## If Flow appears twice

Two taskbar/tray icons can mean an installed copy plus a separately opened
portable or development copy. They do not by themselves prove two installations.
Windows can also show both a per-user shortcut and an all-users shortcut.

Check **Windows Settings → Apps → Installed apps** for registered Flow entries,
and check a shortcut's **Properties → Target**. Do not delete your download folder
or application data to remove an extra icon. Exit the separate copy, keep the
shortcut to the installed location and run Setup to update that installation.

Version 2.7.1 also fixes reconnecting the existing protected browser configuration
under Windows PowerShell. Reload the unpacked companion if Chrome still has its
previous files loaded, then use **Test connection** in the extension.
