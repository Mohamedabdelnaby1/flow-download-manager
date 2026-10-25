param(
 [string]$NodeExecutable=(Get-Command node -ErrorAction Stop).Source,
 [string]$DependenciesPath,
 [string]$CachePath,
 [string]$StagePath,
 [switch]$StageOnly
)
$ErrorActionPreference='Stop'
$flowSource=Split-Path $PSScriptRoot -Parent
if(-not [Environment]::Is64BitOperatingSystem){throw 'Compact Windows builds require a 64-bit Windows machine.'}
if(-not $DependenciesPath){$DependenciesPath=Join-Path $flowSource 'node_modules'}
if(-not $CachePath){$CachePath=Join-Path $flowSource 'release-compact\build-cache'}
if(-not $StagePath){$StagePath=Join-Path $flowSource ('release-compact\stage-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
$CachePath=[IO.Path]::GetFullPath($CachePath)
$StagePath=[IO.Path]::GetFullPath($StagePath)
if(Test-Path -LiteralPath $StagePath){throw 'Use a new stage directory. Existing application files will not be overwritten.'}
New-Item -ItemType Directory -Path $CachePath -Force|Out-Null
function Get-VerifiedAsset([string]$Url,[string]$File,[string]$Sha){
 if(Test-Path -LiteralPath $File){if((Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() -eq $Sha){return};throw "Cached asset failed verification: $File"}
 $temporary=$File+'.download'
 & curl.exe -4 --fail --location --connect-timeout 20 --max-time 300 $Url --output $temporary
 if($LASTEXITCODE -ne 0){throw "Could not download the official build asset: $Url"}
 if((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha){throw "Asset checksum mismatch: $Url"}
 Move-Item -LiteralPath $temporary -Destination $File
}
$sdkArchive=Join-Path $CachePath 'webview2-1.0.4314.35.zip'
Get-VerifiedAsset 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4314.35/microsoft.web.webview2.1.0.4314.35.nupkg' $sdkArchive '90778deb1b77e36292828b4b5833c9255c27533f40e0ddd55891ae718944edc4'
$sdk=Join-Path $CachePath 'webview2-1.0.4314.35'
if(-not(Test-Path -LiteralPath $sdk)){Expand-Archive -LiteralPath $sdkArchive -DestinationPath $sdk}
$extractorArchive=Join-Path $CachePath 'yt-dlp-2026.10.21.zip'
Get-VerifiedAsset 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.21/yt-dlp_win.zip' $extractorArchive 'a981b50fff6e437576d1c3c8df0680af572028ca12dff5e49435d9d33c98294b'
$extractor=Join-Path $CachePath 'yt-dlp-2026.10.21'
if(-not(Test-Path -LiteralPath $extractor)){Expand-Archive -LiteralPath $extractorArchive -DestinationPath $extractor}
$nodeLicense=Join-Path $CachePath 'Node-LICENSE.txt'
Get-VerifiedAsset 'https://raw.githubusercontent.com/nodejs/node/v22.14.0/LICENSE' $nodeLicense '1474fea5eff88dc92763acca3ca1f54b51fa153be1529eae74ace35957aea9ce'
if((Get-FileHash -LiteralPath $NodeExecutable -Algorithm SHA256).Hash.ToLowerInvariant() -ne '33b1bc1a8aca11fd5a4f2699e51019c63c0af30cf437701d07af69be7706771b'){
 $NodeExecutable=Join-Path $CachePath 'node-22.14.0.exe'
 Get-VerifiedAsset 'https://nodejs.org/dist/v22.14.0/win-x64/node.exe' $NodeExecutable '33b1bc1a8aca11fd5a4f2699e51019c63c0af30cf437701d07af69be7706771b'
}
$shell=Join-Path $CachePath ('shell-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $shell|Out-Null
foreach($file in @('lib\net462\Microsoft.Web.WebView2.Core.dll','lib\net462\Microsoft.Web.WebView2.WinForms.dll','runtimes\win-x64\native\WebView2Loader.dll')){Copy-Item -LiteralPath (Join-Path $sdk $file) -Destination $shell}
Copy-Item -LiteralPath (Join-Path $flowSource 'src\desktop-actions.json') -Destination (Join-Path $shell 'actions.json')
$bridge=(Get-Content -LiteralPath (Join-Path $flowSource 'native\webview-bridge.js') -Raw).Replace('/*FLOW_ACTIONS*/[]',(Get-Content -LiteralPath (Join-Path $shell 'actions.json') -Raw))
[IO.File]::WriteAllText((Join-Path $shell 'bridge.js'),$bridge,(New-Object Text.UTF8Encoding($false)))
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Net.Http.dll /reference:System.Security.dll /reference:System.Web.Extensions.dll "/reference:$shell\Microsoft.Web.WebView2.Core.dll" "/reference:$shell\Microsoft.Web.WebView2.WinForms.dll" "/win32manifest:$flowSource\native\FlowWebView.manifest" "/win32icon:$flowSource\build\icon.ico" "/out:$shell\Flow.exe" "$flowSource\native\FlowWebView.cs" "$flowSource\native\FlowTaskbar.cs"
if($LASTEXITCODE -ne 0){throw 'Compact desktop compilation failed.'}
$configuration=Join-Path $CachePath ('stage-'+[Guid]::NewGuid().ToString('N')+'.json')
@{target=$StagePath;dependencies=[IO.Path]::GetFullPath($DependenciesPath);sdk=$sdk;shell=$shell;node=$NodeExecutable;nodeLicense=$nodeLicense;extractor=$extractor}|ConvertTo-Json|Set-Content -LiteralPath $configuration -Encoding UTF8
& $NodeExecutable (Join-Path $PSScriptRoot 'stage-compact.cjs') $configuration
if($LASTEXITCODE -ne 0){throw 'Compact payload staging failed.'}
if(-not $StageOnly){
 New-Item -ItemType Directory -Path (Join-Path $StagePath 'resources') -Force|Out-Null
 & $NodeExecutable (Join-Path $DependenciesPath 'electron-builder\cli.js') --projectDir $flowSource --config build/windows-compact.cjs --prepackaged $StagePath --win nsis --publish never
 if($LASTEXITCODE -ne 0){throw 'Compact installer build failed.'}
}
Write-Output "Preserved complete runtime staged at: $StagePath"
