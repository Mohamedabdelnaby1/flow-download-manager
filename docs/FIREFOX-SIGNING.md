# Firefox signing and permanent installation

Status for 2.10: the Firefox adapter is implemented, its generated package passes Mozilla's web-ext lint, and a real temporary add-on completes authenticated local handoff. A Mozilla-signed XPI has not been produced because an authorized Mozilla Add-ons account/API credential is not available in this session.

## Sign through the Developer Hub

1. Sign in to the [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/).
2. Submit the Firefox **Unsigned** ZIP for **self-distribution / unlisted** signing. Keep its existing add-on ID: `flow-companion@mohamedabdelnaby1.github.io`.
3. Describe the extension accurately: URLs, page/media information and relevant authorized session headers go to the local Flow application to perform the download. There is no third-party analytics service.
4. Download the signed XPI after Mozilla validation and any requested review. The local lint result is not a guarantee of store approval.
5. Install the signed XPI in Firefox through Add-ons -> Install Add-on From File. Prepare browser integration in Flow once, then Test connection.

## Optional command-line signing

Set `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` locally using your AMO API credentials. Do not paste credentials into chat, commit them, or put them in command-line arguments. Run `scripts/sign-firefox.ps1` from Windows. It generates the Firefox variant, uses pinned web-ext 10.8.0 and requests unlisted signing, with credentials read from the environment. It writes the returned XPI under `release/firefox-signed`.

The script does not disable Firefox signature verification or automatically change a public GitHub release. After signing, verify the ID/version and publish the signed XPI with its checksum and updated release verification.

[Mozilla signing overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) · [web-ext sign](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) · [Browser setup](../BROWSER-INTEGRATION.md)
