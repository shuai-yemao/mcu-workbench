#ifndef APP_VERSION
  #define APP_VERSION "0.1.0"
#endif

#define APP_NAME "ProductionTools"
#define APP_DISPLAY_NAME "Production Tools"
#define APP_ID "{12345678-1234-1234-1234-1234567890AB}"

[Setup]
; Replace this placeholder AppId before shipping a real product.
AppId={#APP_ID}
AppName={#APP_DISPLAY_NAME}
AppVersion={#APP_VERSION}
AppPublisher=Your Team
AppPublisherURL=https://example.invalid
DefaultDirName={autopf}\{#APP_DISPLAY_NAME}
DefaultGroupName={#APP_DISPLAY_NAME}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename={#APP_NAME}_{#APP_VERSION}_setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "..\dist\{#APP_NAME}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#APP_DISPLAY_NAME}"; Filename: "{app}\{#APP_NAME}.exe"
Name: "{group}\Uninstall {#APP_DISPLAY_NAME}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#APP_DISPLAY_NAME}"; Filename: "{app}\{#APP_NAME}.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\{#APP_NAME}.exe"; Description: "Launch {#APP_DISPLAY_NAME}"; Flags: nowait postinstall skipifsilent
