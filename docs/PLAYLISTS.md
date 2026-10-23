# YouTube playlists

Open **Tools → Productivity center → Video playlists**, paste a public YouTube playlist URL, then **Read playlist**. Pasting a playlist-only URL in Add Download also opens this importer. A watch URL containing both a video ID and a playlist ID still downloads the individual video.

All available entries are selected initially. Use Select all, Clear selection, or individual checkboxes. Choose Best video and audio, a 480p/720p/1080p maximum, or MP3 audio. Numbering retains the original playlist positions even if you choose only some videos. An optional folder uses the playlist title. Existing video URLs are skipped by default.

**Queue selected videos** stores the selection without starting it. **Download selected now** adds the selection and starts the chosen queue, including other pending tasks in that queue. Each video is an independent task: pause, resume, failure and removal work separately. One unavailable item does not prevent other queued items from starting.

Cancel reading stops the extractor. Inspection is bounded to five minutes and 48 MiB. The safety limit is 10,000 source entries; if a larger playlist is encountered the UI explicitly reports that the result is incomplete. Private, deleted, restricted and repeated video IDs are skipped. YouTube availability, account requirements and quality can change between inspection and download. Protected content is unsupported.

Validation uses both controlled regression fixtures and the user's public 25-video playlist. All 25 entries were inspected/imported and the first video was downloaded and decoded. This is not a claim that every entry or every YouTube playlist was fully downloaded.
