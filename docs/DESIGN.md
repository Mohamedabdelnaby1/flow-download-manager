# Interface design

Flow 2.5.4 uses a Material-inspired interface built in local HTML/CSS/JavaScript. The design layer loads after the complete desktop stylesheet.

Sage green is the primary action color. Muted blue, lilac, rose, amber and teal identify file categories and tools. Light mode uses white cards and soft gray-green surfaces; dark mode uses navy charcoal and mint accents. Status is always written as text as well as color.

The toolbar emphasizes New download and the major workspaces. Resume, pause and remove appear when a file is selected; every command remains available in menus. Technical transfer connections and saved paths expand on demand.

Below 900 CSS pixels the categories become a drawer with no reserved column. Short windows use a tighter header and keep a scrollable file table. Large libraries render up to 200 rows per page. English and Arabic layouts use the same components; focus indicators and reduced-motion preferences are preserved.

See [screenshots](SCREENSHOTS.md) and [validation](../VALIDATION.md) for tested cases and limits.
