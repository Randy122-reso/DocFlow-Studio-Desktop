; DocFlow Studio — NSIS additions.
; electron-builder already registers fileAssociations. These macros make sure
; stale ProgIDs from previous portable runs are cleaned up on uninstall.

!macro customInstall
  WriteRegStr HKCU "Software\Classes\DocFlowStudio.md" "" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\DocFlowStudio.md\DefaultIcon" "" "$INSTDIR\DocFlow Studio.exe,0"
  WriteRegStr HKCU "Software\Classes\DocFlowStudio.md\shell\open\command" "" '"$INSTDIR\DocFlow Studio.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\DocFlowStudio.md"
!macroend
