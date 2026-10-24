; Reject unsupported systems before copying files or creating shortcuts.
!macro customInit
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_OK|MB_ICONSTOP "Flow Download Manager requires Windows 10 or Windows 11 (64-bit). Windows 7, 8 and 8.1 are not supported. No application files have been installed." /SD IDOK
    SetErrorLevel 1633
    Quit
  ${EndIf}
!macroend

; Author credit is shown on the installer welcome, wizard footer and finish page.
!macro customWelcomePage
  !include nsDialogs.nsh
  !include WordFunc.nsh
  Var flowExistingPath
  Var flowExistingVersion
  Var flowMaintenanceMode
  Var flowRepairRadio
  Var flowReinstallRadio
  Var flowUninstallRadio
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Flow ${VERSION}"
  !define MUI_WELCOMEPAGE_TEXT "Flow Download Manager$\r$\n$\r$\nCreated by mohamed abdelnaby$\r$\nfacebook.com/mohamedabdelnaby190$\r$\n$\r$\nThis wizard will install Flow on your computer. Click Next to continue."
  !insertmacro MUI_PAGE_WELCOME
  Page custom FlowMaintenancePage FlowMaintenanceLeave

  Function FlowMaintenancePage
    ReadRegStr $flowExistingPath HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    ReadRegStr $flowExistingVersion HKCU "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ${If} $flowExistingPath == ""
      ReadRegStr $flowExistingPath HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
      ReadRegStr $flowExistingVersion HKLM "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ${EndIf}
    ${If} $flowExistingPath == ""
      Abort
    ${EndIf}
    IfFileExists "$flowExistingPath\Uninstall Flow.exe" 0 flowNoMaintenance
    StrCpy $INSTDIR $flowExistingPath
    ${VersionCompare} "$flowExistingVersion" "${VERSION}" $0
    ${If} $0 == 1
      MessageBox MB_ICONEXCLAMATION|MB_OK "Flow $flowExistingVersion is already installed. This package is ${VERSION}. Use the same or a newer installer to maintain it."
      Quit
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Maintain Flow" "Choose how to maintain the existing installation."
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateLabel} 0 0 100% 14u "Installed: Flow $flowExistingVersion — application location:"
    Pop $0
    ${NSD_CreateText} 0 17u 100% 14u "$flowExistingPath"
    Pop $0
    ${NSD_AddStyle} $0 ${ES_READONLY}
    ${NSD_CreateRadioButton} 0 42u 100% 16u "Repair / update application files to ${VERSION}"
    Pop $flowRepairRadio
    ${NSD_CreateRadioButton} 0 65u 100% 16u "Reinstall Flow ${VERSION} in the existing location"
    Pop $flowReinstallRadio
    ${NSD_CreateRadioButton} 0 88u 100% 16u "Uninstall the existing Flow application"
    Pop $flowUninstallRadio
    ${NSD_Check} $flowRepairRadio
    ${NSD_CreateLabel} 0 117u 100% 45u "Repair and reinstall replace application files. Your library, settings and downloaded files are kept. Exit Flow from its tray menu before continuing. No second installation will be created."
    Pop $0
    nsDialogs::Show
    Return
    flowNoMaintenance:
      StrCpy $flowExistingPath ""
      Abort
  FunctionEnd

  Function FlowMaintenanceLeave
    ${NSD_GetState} $flowUninstallRadio $0
    ${If} $0 == ${BST_CHECKED}
      MessageBox MB_OKCANCEL|MB_ICONQUESTION "Open the Flow uninstaller? Your downloaded files and library will be kept." IDCANCEL flowStayMaintenance
      ExecWait '"$flowExistingPath\Uninstall Flow.exe"' $0
      ${If} $0 != 0
        MessageBox MB_ICONEXCLAMATION|MB_OK "Uninstall was cancelled or could not finish. Exit Flow and try again."
        Abort
      ${EndIf}
      Quit
    ${EndIf}
    StrCpy $flowMaintenanceMode "repair"
    ${NSD_GetState} $flowReinstallRadio $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $flowMaintenanceMode "reinstall"
    ${EndIf}
    StrCpy $INSTDIR $flowExistingPath
    Return
    flowStayMaintenance:
      Abort
  FunctionEnd
!macroend

!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    ; Maintenance keeps the registration scope as well as the directory.
    ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $0 != ""
      StrCpy $isForceCurrentInstall "1"
    ${Else}
      ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $0 != ""
        StrCpy $isForceMachineInstall "1"
      ${EndIf}
    ${EndIf}
  !endif
!macroend

; Runs immediately before installing, even if the directory page was visited.
!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_PRE FlowDirectoryPre
  !insertmacro MUI_PAGE_DIRECTORY
  Function FlowDirectoryPre
    ${If} $flowExistingPath != ""
      StrCpy $INSTDIR $flowExistingPath
      Abort
    ${EndIf}
  FunctionEnd
  Page custom FlowKeepExistingLocation
  Function FlowKeepExistingLocation
    ${If} $flowExistingPath != ""
      StrCpy $INSTDIR $flowExistingPath
    ${EndIf}
    Abort
  FunctionEnd
!macroend

!macro customHeader
  BrandingText "Flow ${VERSION} | mohamed abdelnaby"
!macroend

!define MUI_FINISHPAGE_TEXT "Flow has been installed.$\r$\n$\r$\nCreated by mohamed abdelnaby"
!define MUI_FINISHPAGE_LINK "mohamed abdelnaby - Facebook"
!define MUI_FINISHPAGE_LINK_LOCATION "https://www.facebook.com/mohamedabdelnaby190"

!macro customUnInstall
  ; Remove native registration; keep Realm and saved downloads.
  DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\local.flow.companion"
  DeleteRegKey HKCU "Software\Microsoft\Edge\NativeMessagingHosts\local.flow.companion"
  DeleteRegKey HKCU "Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\local.flow.companion"
  DeleteRegKey HKCU "Software\Chromium\NativeMessagingHosts\local.flow.companion"
!macroend
