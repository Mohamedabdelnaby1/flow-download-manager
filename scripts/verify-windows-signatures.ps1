param([string]$ReleaseDirectory=(Join-Path $PSScriptRoot '..\release'),[switch]$RequireSigned)
$ErrorActionPreference='Stop'
$files=@(Get-ChildItem -LiteralPath $ReleaseDirectory -Filter '*.exe' -File)
$unpacked=Join-Path $ReleaseDirectory 'win-unpacked'
if(Test-Path -LiteralPath $unpacked){$files+=@(Get-ChildItem -LiteralPath $unpacked -Recurse -File | Where-Object Extension -in @('.exe','.dll','.node'))}
if(!$files.Count){throw 'No Windows packages were found.'}
$receipt=@($files | ForEach-Object {$signature=Get-AuthenticodeSignature -LiteralPath $_.FullName;[pscustomobject]@{name=$_.FullName.Substring((Resolve-Path $ReleaseDirectory).Path.Length+1);status=[string]$signature.Status;publisher=$signature.SignerCertificate.Subject;thumbprint=$signature.SignerCertificate.Thumbprint;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$receipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $ReleaseDirectory 'Windows-Signatures.json') -Encoding utf8
if($RequireSigned -and @($receipt | Where-Object status -ne 'Valid').Count){throw 'A package or executable payload has no valid trusted signature. Do not publish it as signed.'}
$receipt | Select-Object name,status,publisher
