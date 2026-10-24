# Everyday tools

Open **Tools** in the toolbar, or press **Ctrl+K**. Type what you want to do and choose a card. Most tasks need one link or one file; technical settings stay under **Advanced options**.

| I want to… | Choose | Do this |
| --- | --- | --- |
| Download several links | Add several links | Paste one URL per line, inspect, then add selected results. |
| Download a playlist | Download a playlist | Paste the playlist link, choose videos and quality, then start. |
| Use a magnet/torrent | Torrents & magnet links | Paste a magnet link or choose a `.torrent` file, then Start. Files save in your Downloads folder. |
| Send a link from my phone | Send from your phone | Connect both devices to trusted Wi-Fi, enable sharing, open the shown address and enter the code. Stop sharing to disconnect devices. |
| Get one file from a ZIP | Pick files from a ZIP | Paste the archive link, Show files, select what you need and choose a folder. Unsupported entries stay disabled. |
| Move a finished file | Move or rename a file | Choose the file and destination. Watch progress or cancel; the original remains until verification succeeds. |
| Rename a finished file | Move or rename a file | Choose Rename, enter the new name and Save. Existing destination files are not overwritten. |
| Remove repeated tasks | Remove duplicate tasks | Preview first, then move selected repeats to recovery. Disk files stay in place. |
| Restore a removed task | Restore a removed task | Select Restore in the recovery bin. Partial data stays available. |
| Check a file | Check a file | Choose the completed file and Compute. For a publisher comparison, paste its fingerprint and choose SHA-256 or SHA-512. |
| Refresh an expired URL | Refresh an expired link | Pause the task and paste a fresh link to the same file. Flow checks the saved ranges before accepting it. |
| Make a smaller media copy | Convert or trim media | Select a completed media file, choose a format and start. Your original stays untouched. |
| Change list columns or font | Personalize your list | Tick the fields you use and choose a font. Name and status remain visible. |

## Advanced downloads

Torrents use default upload limits and stop seeding at completion. Open a torrent's Files & details section for its files, piece count and trackers. Pause before changing the selected files. Torrent participation shares pieces with peers during transfer. Settings for upload, seeding time and peer limits affect new transfers.

Mirror downloads take multiple links for the same file plus the publisher's SHA-256 fingerprint. This is intended for users who have verified distribution mirrors; it is not needed for an ordinary download.

Optional history cleanup moves old completed records to recovery after 7/30/90 days, leaving disk files untouched. Optional slow-task yielding frees a queue slot only when another file is waiting; it retains partial data and retries later. Both options are off by default.

## After a queue completes

Choose **Shut down computer** under When the queue finishes, then save. After all items succeed and other transfers/processes are idle, Flow shows a cancellable one-minute countdown. Cancelling or closing that window keeps the computer on. New active work cancels the countdown. The system may ask for permission or block shutdown; Flow does not force-close unsaved applications.

Phone control works over HTTP on your local trusted network while enabled. Pairing codes expire after ten minutes; sessions last up to twelve hours and are revoked when sharing stops or Flow exits. No router port forwarding or cloud account is required. It controls ordinary library downloads; torrent controls remain in the desktop tool.
