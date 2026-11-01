# System audit — Flow 2.10.0

This was a source and running-application audit, performed on 1 November 2026. It covered the shared services, loaded UI scripts, stylesheet cascade, window routing, browser setup and phone-control resources. It did not treat every old function or repeated CSS selector as safe to delete.

## Confirmed defects and corrections

| Finding | Correction and evidence |
| --- | --- |
| Ctrl+K had two active handlers and could open both Tools and Productivity. From a tool window it could replace that window's contents. | One handler routes to the Tools window. Runtime regression covers both entry points. |
| About displayed a hard-coded 2.6.0 version. | Both languages display the actual running version. |
| The phone-control HTML requested design assets the server refused. | Explicit public asset allowlist includes linked CSS/JS and bundled fonts. The regression crawls those dependencies; state still requires authentication and traversal does not expose files. |
| Companion-folder validation retained Firefox selection, but opening the folder defaulted back to Chrome. | Both operations use the saved selection; explicit overrides still work. |
| Tajawal appeared in the font menu but backend validation rejected it. | Saving Tajawal succeeds and survives service reopening. |
| Routine snapshots replaced the sidebar and footer DOM even when their content had not changed. | Compare the generated content before replacing nodes. Keyboard focus survives idle refreshes; changed counts still render and disconnected status recovers. Live progress refreshes remain enabled. |
| Rebuilding the download form could accumulate dialog-close listeners. | A single lifecycle listener cleans up an active download form; unrelated dialog closes do not cancel inspection. |
| Two loaded but unreferenced legacy rendering functions, an unused hard-coded Chrome host branch, and an unloaded stylesheet remained. | Removed only those confirmed unused paths. The active queue renderer, shared action wrappers and intentional style layers remain. |
| Realm could fail before startup error handling was active. | Load native service dependencies inside the protected startup path. Windows policy refusal receives a distinct bilingual explanation and no restart loop. Compact startup stops waiting when its backend exits. |

## Verification

- **272 service/source regressions** cover data integrity, transfer recovery, cancellation, queues, browser handoff, guarded desktop actions, updates and appearance preferences. Final CI evidence is linked from [Validation](../VALIDATION.md).
- **163 running-UI checks** inspect **76 screen states** in English and Arabic: workspace, all 21 tool destinations, nine settings tabs and seven additional window types. They check identifier uniqueness, document overflow, shortcut routing, actual version and refresh stability.
- Separate interaction suites cover appearance (50), tool destinations (42), design-system behavior (57) and download/completion interactions (15).
- Four startup checks inject a native loader refusal into the real Electron entry point. This tests Flow's response; it does **not** claim a real Windows application-control policy was bypassed or that an unsigned package became trusted.
- Actual isolated Firefox and Opera Native Messaging/download tests are recorded separately in [browser integration](../BROWSER-INTEGRATION.md).

## Boundaries

The DOM audit found no duplicate identifiers or document-wide horizontal overflow in the tested states. That does not prove every future or data-dependent state is defect-free. Stylesheets contain deliberate layered overrides; a wholesale cascade rewrite was not performed. Live third-party website access, universal speed improvement, permanent Firefox installation, Windows reboot behavior and signed-publisher acceptance are not implied by these checks. Mozilla signing and a trusted Windows signing identity remain external prerequisites.

