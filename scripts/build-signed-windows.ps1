param([Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$CertificateThumbprint)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$cert=Get-Item -LiteralPath "Cert:\CurrentUser\My\$CertificateThumbprint"
if(!$cert.HasPrivateKey -or $cert.NotAfter -le (Get-Date)){throw 'The signing certificate needs an available private key and a valid expiry date.'}
$tools=@(Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)
if(!$tools.Count){throw 'Install the Windows SDK Signing Tools first.'}
$signTool=$tools[0].FullName
$payload=@((Join-Path $project 'native\FlowNativeHost.exe'),(Join-Path $project 'vendor\yt-dlp.exe'),(Join-Path $project 'vendor\aria2\aria2c.exe'),(Join-Path $project 'node_modules\ffmpeg-static\ffmpeg.exe'))
foreach($file in $payload){
 if(!(Test-Path -LiteralPath $file)){throw "Missing bundled executable: $file"}
 if((Get-AuthenticodeSignature -LiteralPath $file).Status -ne 'Valid'){
  & $signTool sign /sha1 $CertificateThumbprint /s My /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $file
  if($LASTEXITCODE -ne 0){throw 'Signing a bundled executable failed.'}
 }
 if((Get-AuthenticodeSignature -LiteralPath $file).Status -ne 'Valid'){throw 'Windows did not validate the signed payload. Check the certificate chain.'}
}
# Authenticode changes executable bytes. Keep both the upstream and signed hashes.
$provenanceFile=Join-Path $project 'vendor\aria2\PROVENANCE.json'
$provenance=Get-Content -LiteralPath $provenanceFile -Raw | ConvertFrom-Json
if(!$provenance.PSObject.Properties['unsignedBinarySHA256']){$provenance | Add-Member unsignedBinarySHA256 $provenance.binarySHA256}
$provenance.binarySHA256=(Get-FileHash -LiteralPath (Join-Path $project 'vendor\aria2\aria2c.exe') -Algorithm SHA256).Hash.ToLowerInvariant()
$provenance | ConvertTo-Json | Set-Content -LiteralPath $provenanceFile -Encoding utf8
$env:FLOW_SIGNING_THUMBPRINT=$CertificateThumbprint
Push-Location $project
try{
 & node node_modules/electron-builder/cli.js --win portable nsis --config build/windows-signed.cjs --publish=never
 if($LASTEXITCODE -ne 0){throw 'Signed Windows build failed.'}
 & (Join-Path $PSScriptRoot 'verify-windows-signatures.ps1') -ReleaseDirectory (Join-Path $project 'release') -RequireSigned
}finally{Pop-Location;Remove-Item Env:\FLOW_SIGNING_THUMBPRINT -ErrorAction SilentlyContinue}
