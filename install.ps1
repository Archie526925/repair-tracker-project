# install.ps1 - 報修追蹤系統一鍵安裝
# 以系統管理員身份執行此腳本

$ErrorActionPreference = "Stop"
$INSTALL_DIR = "C:\repair-tracker-project"

function Write-Step {
    param([string]$msg)
    Write-Host "  $msg" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$msg)
    Write-Host "  $msg" -ForegroundColor Green
}

function Write-Err {
    param([string]$msg)
    Write-Host "  [錯誤] $msg" -ForegroundColor Red
    pause
    exit 1
}

# 檢查系統管理員
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Err "請以系統管理員身份執行此腳本。`n右鍵 install.bat > 以系統管理員身份執行"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "   報修追蹤系統 - 一鍵安裝程式" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# === Step 1: Node.js ===
Write-Host "[1/6] 檢查 Node.js..." -ForegroundColor White
try {
    $nodeVer = & node -v 2>$null
    if ($nodeVer) { Write-Ok "已安裝: $nodeVer"; goto :skipNode }
} catch {}

Write-Step "未安裝，下載中..."
$nodeMsi = "node-v20.18.1-x64.msi"
$nodeUrl = "https://nodejs.org/dist/v20.18.1/$nodeMsi"
$nodePath = Join-Path $env:TEMP $nodeMsi

if (-not (Test-Path $nodePath)) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodePath -UseBasicParsing
}
Write-Step "安裝 Node.js..."
Start-Process msiexec -ArgumentList "/i `"$nodePath`" /qn /norestart" -Wait
Start-Sleep -Seconds 8

$env:Path = "$env:Path;C:\Program Files\nodejs;$env:APPDATA\npm"
try {
    $nodeVer = & node -v 2>$null
    Write-Ok "安裝完成: $nodeVer"
} catch {
    Write-Err "Node.js 安裝失敗"
}

:skipNode

# === Step 2: pnpm ===
Write-Host "[2/6] 檢查 pnpm..." -ForegroundColor White
try {
    $pnpmVer = & pnpm -v 2>$null
    if ($pnpmVer) { Write-Ok "已安裝: v$pnpmVer"; goto :skipPnpm }
} catch {}

Write-Step "安裝 pnpm..."
& npm install -g pnpm
Write-Ok "安裝完成"

:skipPnpm

# === Step 3: Git ===
Write-Host "[3/6] 檢查 Git..." -ForegroundColor White
try {
    $gitVer = & git --version 2>$null
    if ($gitVer) { Write-Ok $gitVer; goto :skipGit }
} catch {}

Write-Step "未安裝，下載中..."
$gitExe = "Git-2.45.2-64-bit.exe"
$gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/$gitExe"
$gitPath = Join-Path $env:TEMP $gitExe

if (-not (Test-Path $gitPath)) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitPath -UseBasicParsing
}
Write-Step "安裝 Git..."
Start-Process -FilePath $gitPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS=`"icons,ext\reg\shellhere,assoc,assoc_sh`"" -Wait
Start-Sleep -Seconds 10
$env:Path = "$env:Path;C:\Program Files\Git\cmd"
Write-Ok "安裝完成"

:skipGit

# === Step 4: Clone repo ===
Write-Host "[4/6] 下載專案..." -ForegroundColor White

if (Test-Path $INSTALL_DIR) {
    Write-Step "更新現有安裝..."
    Push-Location $INSTALL_DIR
    & git pull
    Pop-Location
} else {
    $localSrc = Join-Path $PSScriptRoot "artifacts\api-server"
    if (Test-Path $localSrc) {
        Write-Step "從本地複製..."
        Copy-Item -Path (Join-Path $PSScriptRoot "*") -Destination $INSTALL_DIR -Recurse -Force
    } else {
        Write-Step "從 GitHub 複製..."
        & git clone https://github.com/Archie526925/repair-tracker-project.git $INSTALL_DIR
    }
}

# === Step 5: Build ===
Write-Host "[5/6] 安裝相依套件（3-5 分鐘）..." -ForegroundColor White
Push-Location $INSTALL_DIR
& pnpm install --no-frozen-lockfile
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "相依套件安裝失敗" }

Write-Step "建置中..."
@(
    "@workspace/api-zod",
    "@workspace/db",
    "@workspace/api-client-react",
    "@workspace/api-server",
    "@workspace/repair-tracker"
) | ForEach-Object {
    & pnpm --filter $_ build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "Build 失敗: $_" }
}
Pop-Location
Write-Ok "建置完成"

# === Step 6: Configure ===
Write-Host "[6/6] 設定環境..." -ForegroundColor White

$envFile = Join-Path $INSTALL_DIR "artifacts\api-server\.env"
if (-not (Test-Path $envFile)) {
    $jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    @"
PORT=3000
DATABASE_URL=./repair_tracker.db
JWT_SECRET=$jwt
TZ=Asia/Taipei
"@ | Set-Content -Path $envFile -Encoding UTF8
    Write-Step ".env 已建立"
}

# start.bat
$startBat = @"
@echo off
start "Repair API" cmd /c "cd /d C:\repair-tracker-project\artifacts\api-server & set PORT=3000 & set DATABASE_URL=./repair_tracker.db & node --enable-source-maps dist\index.mjs"
timeout /t 3 /nobreak >nul
start "Repair Frontend" cmd /c "cd /d C:\repair-tracker-project\artifacts\repair-tracker & npx vite preview --host 0.0.0.0 --port 5173"
timeout /t 2 /nobreak >nul
start http://localhost:5173
"@
Set-Content -Path (Join-Path $INSTALL_DIR "start.bat") -Value $startBat -Encoding ASCII

# Desktop shortcut
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut([Environment]::GetFolderPath("CommonDesktopDirectory") + "\報修追蹤系統.lnk")
$sc.TargetPath = Join-Path $INSTALL_DIR "start.bat"
$sc.WorkingDirectory = $INSTALL_DIR
$sc.Save()

# Firewall
netsh advfirewall firewall add rule name="RepairAPI-3000" dir=in action=allow protocol=tcp localport=3000 | Out-Null
netsh advfirewall firewall add rule name="RepairFE-5173" dir=in action=allow protocol=tcp localport=5173 | Out-Null

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   安裝完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "   位置: C:\repair-tracker-project"
Write-Host "   啟動: 桌面捷徑「報修追蹤系統」"
Write-Host "   帳號: admin / 密碼: admin123"
Write-Host "   網址: http://localhost:5173"
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "正在啟動..." -ForegroundColor Yellow
Push-Location $INSTALL_DIR
cmd /c "start.bat"
Pop-Location
pause
