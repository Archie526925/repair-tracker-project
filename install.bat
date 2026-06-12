@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title 報修追蹤系統 - 一鍵安裝

echo.
echo ============================================
echo    報修追蹤系統 - 一鍵安裝程式
echo ============================================
echo.

:: Check admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [錯誤] 請以系統管理員身份執行
    echo 右鍵 install.bat ^> 以系統管理員身份執行
    pause
    exit /b 1
)

:: === Step 1: Node.js ===
echo [1/6] 檢查 Node.js...
where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do echo         已安裝: %%v
    goto :have_node
)
echo         未安裝，下載中...
set "NODE_MSI=node-v20.18.1-x64.msi"
if not exist "%TEMP%\%NODE_MSI%" (
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/%NODE_MSI%' -OutFile '%TEMP%\%NODE_MSI%' -UseBasicParsing"
)
msiexec /i "%TEMP%\%NODE_MSI%" /qn /norestart
timeout /t 8 /nobreak >nul
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
echo         安裝完成

:have_node

:: === Step 2: pnpm ===
echo [2/6] 檢查 pnpm...
where pnpm >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%v in ('pnpm -v') do echo         已安裝: v%%v
    goto :have_pnpm
)
echo         安裝 pnpm...
call npm install -g pnpm
echo         安裝完成

:have_pnpm

:: === Step 3: Git ===
echo [3/6] 檢查 Git...
where git >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%v in ('git --version') do echo         %%v
    goto :have_git
)
echo         未安裝，下載中...
set "GIT_EXE=Git-2.45.2-64-bit.exe"
if not exist "%TEMP%\%GIT_EXE%" (
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/%GIT_EXE%' -OutFile '%TEMP%\%GIT_EXE%' -UseBasicParsing"
)
"%TEMP%\%GIT_EXE%" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
timeout /t 10 /nobreak >nul
set "PATH=%PATH%;C:\Program Files\Git\cmd"
echo         安裝完成

:have_git

:: === Step 4: Get project ===
echo [4/6] 下載專案...
set "INSTALL_DIR=C:\repair-tracker-project"

if exist "%INSTALL_DIR%" (
    echo         更新現有安裝...
    cd /d "%INSTALL_DIR%"
    git pull
) else (
    if exist "%~dp0artifacts\api-server" (
        echo         從本地複製...
        xcopy "%~dp0*" "%INSTALL_DIR%\" /E /I /Y /Q
    ) else (
        echo         從 GitHub 複製...
        git clone https://github.com/Archie526925/repair-tracker-project.git "%INSTALL_DIR%"
    )
)
cd /d "%INSTALL_DIR%"

:: === Step 5: Build ===
echo [5/6] 安裝相依套件（3-5 分鐘）...
call pnpm install --no-frozen-lockfile
if %errorLevel% neq 0 ( echo [錯誤] 安裝失敗 & pause & exit /b 1 )

echo         建置中...
call pnpm --filter @workspace/api-zod build
call pnpm --filter @workspace/db build
call pnpm --filter @workspace/api-spec build
call pnpm --filter @workspace/api-client-react build
call pnpm --filter @workspace/api-server build
call pnpm --filter @workspace/repair-tracker build
echo         建置完成

:: === Step 6: Configure ===
echo [6/6] 設定環境...

if not exist "artifacts\api-server\.env" (
    powershell -Command "$s = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }); Set-Content -Path 'artifacts\api-server\.env' -Value \"PORT=3000`nDATABASE_URL=./repair_tracker.db`nJWT_SECRET=$s`nTZ=Asia/Taipei\" -Encoding UTF8"
    echo         .env 已建立
)

:: start.bat
(
echo @echo off
echo cd /d C:\repair-tracker-project
echo start "Repair API" cmd /c "cd artifacts\api-server ^&^& node --enable-source-maps dist\index.mjs"
echo timeout /t 3 /nobreak ^>nul
echo start "Repair Frontend" cmd /c "cd artifacts\repair-tracker ^&^& npx vite preview --host 0.0.0.0 --port 5173"
echo timeout /t 2 /nobreak ^>nul
echo start http://localhost:5173
) > "%INSTALL_DIR%\start.bat"

:: Desktop shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('CommonDesktopDirectory') + '\報修追蹤系統.lnk'); $sc.TargetPath = 'C:\repair-tracker-project\start.bat'; $sc.WorkingDirectory = 'C:\repair-tracker-project'; $sc.Save()"

:: Firewall
netsh advfirewall firewall add rule name="RepairAPI-3000" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="RepairFE-5173" dir=in action=allow protocol=tcp localport=5173 >nul 2>&1

echo.
echo ============================================
echo    安裝完成！
echo ============================================
echo    位置: C:\repair-tracker-project
echo    啟動: 桌面捷徑「報修追蹤系統」
echo    帳號: admin / 密碼: admin123
echo    網址: http://localhost:5173
echo ============================================
echo.
echo 正在啟動...
call "%INSTALL_DIR%\start.bat"
pause
