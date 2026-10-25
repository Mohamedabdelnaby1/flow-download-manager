!include WordFunc.nsh

; Check shared prerequisites before the old uninstaller or any file replacement.
!macro flowPrerequisiteCheck
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" "Release"
  ${If} $0 < 528040
    IfSilent compactMissingPrerequisite
    MessageBox MB_YESNO|MB_ICONINFORMATION "Flow requires Microsoft .NET Framework 4.8. Open Microsoft's download page? Setup will stop without replacing your existing Flow installation." IDNO compactMissingPrerequisite
    ExecShell "open" "https://dotnet.microsoft.com/download/dotnet-framework/net48"
    Goto compactMissingPrerequisite
  ${EndIf}
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ReadRegStr $1 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
    StrCpy $0 "0.0.0.0"
  ${EndIf}
  ${If} $1 != ""
    ${VersionCompare} "$1" "$0" $2
    ${If} $2 == 1
      StrCpy $0 $1
    ${EndIf}
  ${EndIf}
  ${VersionCompare} "$0" "120.0.0.0" $2
  ${If} $2 == 2
    IfSilent compactMissingPrerequisite
    MessageBox MB_YESNO|MB_ICONINFORMATION "Flow requires the shared Microsoft WebView2 Runtime. Open Microsoft's download page? Setup will stop without replacing your existing Flow installation. Flow's download and media tools are included in this package." IDNO compactMissingPrerequisite
    ExecShell "open" "https://developer.microsoft.com/microsoft-edge/webview2/"
    Goto compactMissingPrerequisite
  ${EndIf}
  Goto compactPrerequisitesReady
  compactMissingPrerequisite:
    SetErrorLevel 1633
    Quit
  compactPrerequisitesReady:
!macroend

!include "${PROJECT_DIR}\build\installer.nsh"

; Never terminate another instance or its downloads to make an upgrade fit.
!macro customCheckAppRunning
  System::Call 'kernel32::SetEnvironmentVariable(t "FLOW_INSTALL_TARGET", t "$INSTDIR")'
  compactFlowRetry:
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -Command "$$ErrorActionPreference=1; try { $$target=$$env:FLOW_INSTALL_TARGET; if (-not $$target) { exit 2 }; if (Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and ($$_.ExecutablePath -eq (Join-Path $$target Flow.exe) -or $$_.ExecutablePath -eq (Join-Path $$target runtime\node.exe)) }) { exit 1 }; exit 0 } catch { exit 2 }"'
  Pop $0
  ${If} $0 != 0
    IfSilent compactFlowBusy
    MessageBox MB_RETRYCANCEL|MB_ICONINFORMATION "Exit Flow from its tray menu before updating. Running downloads will not be terminated by this installer." IDRETRY compactFlowRetry
    compactFlowBusy:
    SetErrorLevel 1618
    Quit
  ${EndIf}
!macroend

!macro customInstall
  ; WebView2 is a shared Windows prerequisite, not a removed Flow tool.
  ; The preview checks it before launching, keeping the old library intact.
!macroend
