; Author credit is shown on the installer welcome, wizard footer and finish page.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Flow ${VERSION}"
  !define MUI_WELCOMEPAGE_TEXT "Flow Download Manager$\r$\n$\r$\nCreated by mohamed abdelnaby$\r$\nfacebook.com/mohamedabdelnaby190$\r$\n$\r$\nThis wizard will install Flow on your computer. Click Next to continue."
  !insertmacro MUI_PAGE_WELCOME
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
