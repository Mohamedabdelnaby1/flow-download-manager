$ErrorActionPreference = 'Stop'
$flowRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe /optimize+ /platform:anycpu /reference:System.Web.Extensions.dll /reference:System.Security.dll "/out:$flowRoot\native\FlowNativeHost.exe" "$flowRoot\native\FlowNativeHost.cs"
if ($LASTEXITCODE -ne 0) { throw 'Native host compilation failed' }
