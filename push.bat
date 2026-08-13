@echo off
rem ============================================================
rem  One-click commit & push blog to GitHub Pages
rem  - uses a temporary proxy http://127.0.0.1:7897 (push only)
rem  - auto stages all changes (incl. new files)
rem  - does NOT modify your git config
rem  Usage:  push.bat [commit message]
rem ============================================================
setlocal
cd /d "%~dp0"

if not exist ".git" (
  echo [ERROR] Not a git repository. Run this script in the blog root.
  exit /b 1
)

rem ---- check proxy port ----
set PROXY=http://127.0.0.1:7897
powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',7897)" >nul 2>nul
if errorlevel 1 (
  echo [WARN] Proxy port 7897 is unreachable. Please start your proxy first.
  exit /b 1
)

rem ---- commit message ----
set MSG=%~1
if "%MSG%"=="" set MSG=update %date%

echo [1/3] git add -A
git add -A
if errorlevel 1 (
  echo [ERROR] git add failed.
  exit /b 1
)

echo [2/3] git commit -m "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 (
  echo [INFO] Nothing to commit, pushing anyway.
)

echo [3/3] git push (temporary proxy %PROXY%)
git -c http.proxy=%PROXY% -c https.proxy=%PROXY% push origin main
if errorlevel 1 (
  echo [ERROR] Push failed. Check network / proxy / auth.
  exit /b 1
)

echo.
echo [DONE] Pushed to GitHub. Actions will auto-deploy.
exit /b 0
