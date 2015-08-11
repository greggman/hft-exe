# This installs two files, app.exe and logo.ico, creates a start menu shortcut, builds an uninstaller, and
# adds uninstall information to the registry for Add/Remove Programs

# To get started, put this script into a folder with the two files (app.exe, logo.ico, and license.rtf -
# You'll have to create these yourself) and run makensis on it

# If you change the names "app.exe", "logo.ico", or "license.rtf" you should do a search and replace - they
# show up in a few places.
# All the other settings can be tweaked by editing the !defines at the top of this script
!define APPNAME "HappyFunTimes"
!define COMPANYNAME "Greggman"
!define DESCRIPTION "The Party Game Platform"
# These three must be integers
!define VERSIONMAJOR %(versionMajor)s
!define VERSIONMINOR %(versionMinor)s
!define VERSIONBUILD %(versionPatch)s
# These will be displayed by the "Click here for support information" link in "Add/Remove Programs"
# It is possible to use "mailto:" links in here to open the email client
!define HELPURL "http://superhappyfuntimes.net/support" # "Support Information" link
!define UPDATEURL "http://superhappyfuntimes.net/updates" # "Product Updates" link
!define ABOUTURL "http://superhappyfuntimes.net/" # "Publisher" link
# This is the size (in kB) of all the files copied into "Program Files"
!define INSTALLSIZE %(installSizeKB)s

RequestExecutionLevel user ;Require admin rights on NT6+ (When UAC is turned on)

#InstallDir "$PROGRAMFILES\${COMPANYNAME}\${APPNAME}"
InstallDir "$LOCALAPPDATA\${COMPANYNAME}\${APPNAME}"

# rtf or txt file - remember if it is txt, it must be in the DOS text format (\r\n)
LicenseData "%(licenseFile)s"
# This will be in the installer/uninstaller's title bar
Name "${COMPANYNAME} - ${APPNAME}"
Icon "%(iconPath)s"
outFile "%(outFile)s"

!include LogicLib.nsh
!include "EnvVarUpdate.nsh"
!include "WinVer.nsh"

# Just three pages - license agreement, install location, and installation
page license
page directory

Page instfiles

#!macro VerifyUserIsAdmin
#UserInfo::GetAccountType
#pop $0
#${If} $0 != "admin" ;Require admin rights on NT4+
#        messageBox mb_iconstop "Administrator rights required!"
#        setErrorLevel 740 ;ERROR_ELEVATION_REQUIRED
#        quit
#${EndIf}
#!macroend

#function .onInit
#        setShellVarContext all
#        !insertmacro VerifyUserIsAdmin
#functionEnd

section "install"
        ExpandEnvStrings $3 %COMSPEC%
        ExecWait '"$3" /C "$INSTDIR\bin\hft.cmd stop"'
        Sleep 3000

        # Files for the install directory - to build the installer, these should be in the same directory as the install script (this file)
        setOutPath $INSTDIR

        # Files added here should be removed by the uninstaller (see section "uninstall")
        %(filesToInstall)s

        setOutPath $INSTDIR

        # Uninstaller - See function un.onInit and section "uninstall" for configuration
        writeUninstaller "$INSTDIR\uninstall.exe"

        # Start Menu
        SetShellVarContext current
        CreateShortCut "$STARTMENU\Programs\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\start.js$\" --app-mode --show=how" "$INSTDIR\logo.ico"
        #CreateShortcut "$SMPrograms\MyApp.lnk" "$InstDir\MyApp.exe"
        #CreateDirectory "$STARTMENU\Programs\${COMPANYNAME}"
        #CreateShortCut "$STARTMENU\Programs\${COMPANYNAME}\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\server\server.js$\" --app-mode" "$INSTDIR\logo.ico"
        #CreateShortCut "$STARTMENU\Programs\${COMPANYNAME}\${APPNAME}-Uninstall.lnk" "$INSTDIR\uninstall.exe"        createDirectory "$SMPROGRAMS\${COMPANYNAME}"
        #createShortCut "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\server\server.js$\" --app-mode" "$INSTDIR\logo.ico"

        # Registry information for add/remove programs
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayName" "${COMPANYNAME} - ${APPNAME} - ${DESCRIPTION}"
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayIcon" "$\"$INSTDIR\logo.ico$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "Publisher" "$\"${COMPANYNAME}$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "HelpLink" "$\"${HELPURL}$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "URLUpdateInfo" "$\"${UPDATEURL}$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "URLInfoAbout" "$\"${ABOUTURL}$\""
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayVersion" "$\"${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}$\""
        WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
        WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "VersionMinor" ${VERSIONMINOR}
        # There is no option for modifying or repairing the install
        WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoModify" 1
        WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoRepair" 1
        # Set the INSTALLSIZE constant (!defined at the top of this script) so Add/Remove Programs can accurately report the size
        WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "EstimatedSize" ${INSTALLSIZE}

        ${EnvVarUpdate} $0 "PATH" "A" "HKCU" "$INSTDIR\bin"
        #${EnvVarUpdate} $0 "PATH" "A" "HKLM" "$INSTDIR\bin"
        ExpandEnvStrings $0 %COMSPEC%

        # I think this step run in the context of admin? so it doesn't work
        ExecWait '"$0" /C "$INSTDIR\bin\hft.cmd init"'

sectionEnd

#Section -AdditionalIcons
#    ${If} ${AtLeastWin7}
#         CreateShortCut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\server\server.js$\" --app-mode" "$INSTDIR\logo.ico"
#    ${Else}
#         CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\server\server.js$\" --app-mode" "$INSTDIR\logo.ico"
#         CreateShortCut "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}.lnk" "$INSTDIR\node.exe" "$\"$INSTDIR\server\server.js$\" --app-mode" "$INSTDIR\logo.ico"
#         CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\Uninstaller.exe"
#    ${EndIf}
#SectionEnd


# Uninstaller

function un.onInit
        SetShellVarContext current

        #Verify the uninstaller - last chance to back out
        MessageBox MB_OKCANCEL "Permanantly remove ${APPNAME}?" IDOK next
                Abort
        next:
#        !insertmacro VerifyUserIsAdmin
functionEnd

section "uninstall"

        # Remove Start Menu launcher
        delete "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}.lnk"

        # Remove files
        %(filesToDelete)s
        delete $INSTDIR\logo.ico

        # Try to remove the Start Menu folder - this will only happen if it is empty
        rmDir "$SMPROGRAMS\${COMPANYNAME}"

        # Always delete uninstaller as the last action
        delete $INSTDIR\uninstall.exe

        # Try to remove the install directory - this will only happen if it is empty
        rmDir $INSTDIR

        # Remove uninstaller information from the registry
        DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}"
sectionEnd

