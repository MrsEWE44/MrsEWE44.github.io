@echo off
rem ============================================================
rem  One-click build + commit + push blog to GitHub Pages
rem  - step 1: hexo clean && hexo generate (local build check)
rem  - step 2: git add -A
rem  - step 3: git commit
rem  - step 4: git push (temporary proxy http://127.0.0.1:7897)
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

rem ---- step 1: local build ----
echo [1/4] Build static site (hexo clean ^&^& hexo generate)
where node >nul 2>nul
if errorlevel 1 (
  echo [WARN] node not found, skip local build.
  goto :build_ok
)
call npm run clean >nul 2>nul
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed. Fix the error before pushing.
  exit /b 1
)
:build_ok

echo [2/4] git add -A
git add -A
if errorlevel 1 (
  echo [ERROR] git add failed.
  exit /b 1
)

echo [3/4] git commit -m "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 (
  echo [INFO] Nothing to commit, pushing anyway.
)

echo [4/4] git push (temporary proxy %PROXY%)
git -c http.proxy=%PROXY% -c https.proxy=%PROXY% push origin main
if errorlevel 1 (
  echo [ERROR] Push failed. Check network / proxy / auth.
  exit /b 1
)

echo.
echo [DONE] Pushed to GitHub. Actions will auto-deploy.
exit /b 0
