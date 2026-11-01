param([string]$OutputDirectory)
$ErrorActionPreference='Stop'
$flowProject=Split-Path $PSScriptRoot -Parent
if(-not $env:WEB_EXT_API_KEY -or -not $env:WEB_EXT_API_SECRET){throw 'Set WEB_EXT_API_KEY and WEB_EXT_API_SECRET locally using your Mozilla Add-ons API credentials. Do not share them in chat or commit them.'}
if(-not $OutputDirectory){$OutputDirectory=Join-Path $flowProject 'release\firefox-signed'}
$flowFirefoxSource=Join-Path $flowProject 'release\firefox-companion'
& node (Join-Path $PSScriptRoot 'package-firefox.cjs') $flowFirefoxSource
if($LASTEXITCODE -ne 0){throw 'Firefox bundle preparation failed.'}
# web-ext reads the credentials from its environment, not the command line.
& npm.cmd exec --yes --cache (Join-Path $flowProject 'release\signing-cache') --package web-ext@10.8.0 -- web-ext --no-config-discovery sign --source-dir $flowFirefoxSource --artifacts-dir $OutputDirectory --channel unlisted
if($LASTEXITCODE -ne 0){throw 'Mozilla signing did not finish. Review the returned status and any pending review in the Add-ons Developer Hub.'}
