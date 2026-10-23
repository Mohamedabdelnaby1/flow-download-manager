@echo off
cd /d "%~dp0"
if not exist "node_modules\electron\path.txt" (
  echo Installing Flow dependencies...
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd start
if errorlevel 1 pause
