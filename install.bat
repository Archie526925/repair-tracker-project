@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title 報修追蹤系統 - 一鍵安裝

echo.
echo ============================================
echo    報修追蹤系統 - 一鍵安裝程式
echo ============================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [錯誤] 請以系統管理員身份執行
    echo 右鍵此檔案 ^> 以系統管理員身份執行
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\repair-tracker-project"

:: === Step 1: Node.js ===
echo [1/5] 檢查 Node.js...
where node >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do echo         已安裝: %%v
    goto :have_node
)
echo         未安裝，下載中（約 1 分鐘）...
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
echo [2/5] 安裝 pnpm...
where pnpm >nul 2>&1
if %errorLevel% equ 0 goto :have_pnpm
call npm install -g pnpm >nul 2>&1
:: Refresh PATH so pnpm can be found
set "PATH=%PATH%;%APPDATA%\npm"
where pnpm >nul 2>&1
if %errorLevel% neq 0 (
    :: Try the npm global bin path directly
    for /f "tokens=*" %%i in ('npm config get prefix') do set "NPM_PREFIX=%%i"
    set "PATH=%PATH%;%NPM_PREFIX%"
)

:have_pnpm

:: === Step 3: 下載專案 ===
echo [3/5] 下載專案...

if exist "%INSTALL_DIR%" (
    echo         專案已存在，更新中...
    cd /d "%INSTALL_DIR%"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/Archie526925/repair-tracker-project/archive/refs/heads/main.zip' -OutFile '%TEMP%\repo.zip' -UseBasicParsing; Expand-Archive -Path '%TEMP%\repo.zip' -DestinationPath '%TEMP%\' -Force"
    xcopy "%TEMP%\repair-tracker-project-main\*" "%INSTALL_DIR%\" /E /Y /Q
    rmdir /s /q "%TEMP%\repair-tracker-project-main" 2>nul
    del "%TEMP%\repo.zip" 2>nul
) else if exist "%~dp0artifacts\api-server" (
    echo         從本地複製...
    xcopy "%~dp0*" "%INSTALL_DIR%\" /E /I /Y /Q
) else (
    echo         從 GitHub 下載...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/Archie526925/repair-tracker-project/archive/refs/heads/main.zip' -OutFile '%TEMP%\repo.zip' -UseBasicParsing; Expand-Archive -Path '%TEMP%\repo.zip' -DestinationPath 'C:\' -Force"
    ren "C:\repair-tracker-project-main" "repair-tracker-project"
    del "%TEMP%\repo.zip" 2>nul
)

cd /d "%INSTALL_DIR%"

:: === Step 4: Build ===
echo [4/5] 安裝相依套件（3-5 分鐘）...
call pnpm install --no-frozen-lockfile
if %errorLevel% neq 0 ( echo [錯誤] 安裝失敗 & pause & exit /b 1 )

echo         建置中...
call pnpm --filter @workspace/api-zod build
call pnpm --filter @workspace/db build
call pnpm --filter @workspace/api-client-react build
call pnpm --filter @workspace/api-server build
call pnpm --filter @workspace/repair-tracker build
echo         建置完成

:: === Step 5: 設定 ===
echo [5/5] 設定環境...

if not exist "artifacts\api-server\.env" (
    echo PORT=3000> artifacts\api-server\.env
    echo DATABASE_URL=./repair_tracker.db>> artifacts\api-server\.env
    echo JWT_SECRET=*** artifacts\api-server\.env
    echo TZ=Asia/Taipei>> artifacts\api-server\.env
)

:: start.bat
(
echo @echo off
echo start "Repair API" cmd /c "cd /d C:\repair-tracker-project\artifacts\api-server ^& set PORT=3000 ^& set DATABASE_URL=./repair_tracker.db ^& set JWT_SECRET=*** ^& set TZ=Asia/Taipei ^& node --enable-source-maps dist\index.mjs"
echo timeout /t 3 /nobreak ^>nul
echo start "Repair Frontend" cmd /c "cd /d C:\repair-tracker-project\artifacts\repair-tracker ^& npx vite preview --host 0.0.0.0 --port 5173"
echo timeout /t 2 /nobreak ^>nul
echo start http://localhost:5173
) > "%INSTALL_DIR%\start.bat"

:: 桌面捷徑
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('CommonDesktopDirectory') + '\報修追蹤系統.lnk'); $sc.TargetPath = 'C:\repair-tracker-project\start.bat'; $sc.WorkingDirectory = 'C:\repair-tracker-project'; $sc.Save()" 2>nul

:: 防火牆
netsh advfirewall firewall add rule name="RepairAPI" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="RepairFE" dir=in action=allow protocol=tcp localport=5173 >nul 2>&1

echo.
echo ============================================
echo    安裝完成！
echo ============================================
echo    啟動：桌面捷徑「報修追蹤系統」
echo    網址：http://localhost:5173
echo    帳號：admin / 密碼：admin123
echo ============================================
echo.
echo 正在啟動...
cd /d "%INSTALL_DIR%"
call start.bat
pause
