Unicode true
!include LogicLib.nsh
!include FileFunc.nsh
!include WinVer.nsh
!include x64.nsh
!include "${PROJECT_DIR}\build\compact-installer.nsh"
Name "Flow Download Manager"
OutFile "${OUTPUT_FILE}"
Icon "${PROJECT_DIR}\build\icon.ico"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
CRCCheck on
SilentInstall silent
AutoCloseWindow true
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Flow Download Manager"
VIAddVersionKey "FileDescription" "Flow Download Manager Portable"
VIAddVersionKey "LegalCopyright" "mohamed abdelnaby"
VIAddVersionKey "FileVersion" "${VERSION}"
Var flowCache
Var flowParameters
Var flowExtractionMutex
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONINFORMATION "Flow requires 64-bit Windows 10 or Windows 11."
    Quit
  ${EndIf}
  SetRegView 64
  !insertmacro customInit
FunctionEnd
Section
  StrCpy $flowCache "$LOCALAPPDATA\Flow\PortableRuntime\${VERSION}-${PAYLOAD_ID}"
  System::Call 'kernel32::CreateMutexW(p 0, i 0, w "Local\FlowPortableExtract-${PAYLOAD_ID}") p.r0'
  StrCpy $flowExtractionMutex $0
  System::Call 'kernel32::WaitForSingleObject(p r0, i 60000) i.r1'
  ${If} $1 != 0
  ${AndIf} $1 != 128
    MessageBox MB_OK|MB_ICONINFORMATION "Flow's portable files are still being prepared. Try opening Flow again."
    SetErrorLevel 1618
    Quit
  ${EndIf}
  IfFileExists "$flowCache\.complete" 0 portableExtract
  !include "${PRESENCE_CHECKS}"
  Goto portableLaunch
  portableExtract:
    ; A damaged cache must never be repaired over a running independent engine.
    System::Call 'kernel32::SetEnvironmentVariable(t "FLOW_PORTABLE_TARGET", t "$flowCache")'
    nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -Command "$$ErrorActionPreference=1; try { $$target=$$env:FLOW_PORTABLE_TARGET; if (Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and ($$_.ExecutablePath -eq (Join-Path $$target Flow.exe) -or $$_.ExecutablePath -eq (Join-Path $$target runtime\node.exe)) }) { exit 1 }; exit 0 } catch { exit 2 }"'
    Pop $0
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONINFORMATION "Exit Flow from its tray menu before repairing these portable files. Running downloads have been kept."
      SetErrorLevel 1618
      Goto portableDone
    ${EndIf}
    SetOutPath "$flowCache"
    ClearErrors
    File /r "${PAYLOAD_DIR}\*.*"
    ${If} ${Errors}
      MessageBox MB_OK|MB_ICONINFORMATION "Flow could not prepare its portable files. Check free disk space and try again. Your library has been kept."
      SetErrorLevel 1603
      Goto portableDone
    ${EndIf}
    FileOpen $0 "$flowCache\.complete" w
    FileWrite $0 "${PAYLOAD_ID}"
    FileClose $0
  portableLaunch:
    System::Call 'kernel32::SetEnvironmentVariable(t "PORTABLE_EXECUTABLE_FILE", t "$EXEPATH")'
    System::Call 'kernel32::SetEnvironmentVariable(t "PORTABLE_EXECUTABLE_DIR", t "$EXEDIR")'
    ${GetParameters} $flowParameters
    ; Optional registry probes can leave NSIS's error flag set even when launch succeeds.
    ClearErrors
    Exec '"$flowCache\Flow.exe" $flowParameters'
    ${If} ${Errors}
      MessageBox MB_OK|MB_ICONINFORMATION "Flow could not open. Reopen it to try again. Your library and saved download parts have been kept."
      SetErrorLevel 1603
    ${EndIf}
  portableDone:
    System::Call 'kernel32::ReleaseMutex(p $flowExtractionMutex)'
    System::Call 'kernel32::CloseHandle(p $flowExtractionMutex)'
    ; Keep the runtime in its versioned cache while downloads continue independently.
SectionEnd
