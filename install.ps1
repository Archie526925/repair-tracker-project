$ErrorActionPreference = "Stop"
$INSTALL_DIR = "C:\repair-tracker-project"

function Write-Step { param([string]$msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Write-Ok { param([string]$msg) Write-Host "  $msg" -ForegroundColor Green }
function Write-Err { param([string]$msg) Write-Host "  $msg" -ForegroundColor Red; pause; exit 1 }
function Write-Warn { param([string]$msg) Write-Host "  $msg" -ForegroundColor Yellow }

# Check admin
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Err "[錯誤] 請以系統管理員身份執行"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "   報修追蹤系統 - 一鍵安裝程式" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# === Step 1: Node.js ===
Write-Host "[1/5] 檢查 Node.js..." -ForegroundColor White
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if ($nodePath) {
    Write-Ok "已安裝: $(node -v)"
} else {
    Write-Step "未安裝，下載中（約 1 分鐘）..."
    $nodeMsi = "node-v20.18.1-x64.msi"
    $nodeUrl = "https://nodejs.org/dist/v20.18.1/$nodeMsi"
    $nodeFile = Join-Path $env:TEMP $nodeMsi

    if (-not (Test-Path $nodeFile)) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeFile -UseBasicParsing
    }

    Write-Step "安裝 Node.js..."
    $proc = Start-Process msiexec -ArgumentList "/i `"$nodeFile`" /qn /norestart" -Wait -PassThru
    Start-Sleep -Seconds 10

    # Refresh PATH from registry
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if ($nodePath) {
        Write-Ok "安裝完成: $(node -v)"
    } else {
        Write-Err "Node.js 安裝失敗"
    }
}

# === Step 2: pnpm ===
Write-Host "[2/5] 安裝 pnpm..." -ForegroundColor White
$pnpmPath = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmPath) {
    Write-Ok "已安裝: v$(pnpm -v)"
} else {
    Write-Step "安裝 pnpm..."
    & npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { & npm install -g pnpm }

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    $pnpmPath = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpmPath) {
        Write-Ok "安裝完成: v$(pnpm -v)"
    } else {
        Write-Warn "pnpm 可能未正確安裝，繼續嘗試..."
    }
}

# === Step 3: Download project ===
Write-Host "[3/5] 下載專案..." -ForegroundColor White

if (Test-Path $INSTALL_DIR) {
    Write-Step "更新現有安裝..."
    Push-Location $INSTALL_DIR
    try { & git pull } catch { Write-Warn "git pull 失敗，略過" }
    Pop-Location
} else {
    $localSrc = Join-Path $PSScriptRoot "artifacts\api-server"
    if (Test-Path $localSrc) {
        Write-Step "從本地複製..."
        Copy-Item -Path (Join-Path $PSScriptRoot "*") -Destination $INSTALL_DIR -Recurse -Force
    } else {
        Write-Step "從 GitHub 下載..."
        $zipFile = Join-Path $env:TEMP "repo.zip"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://github.com/Archie526925/repair-tracker-project/archive/refs/heads/main.zip" -OutFile $zipFile -UseBasicParsing
        Expand-Archive -Path $zipFile -DestinationPath "C:\" -Force
        Remove-Item $zipFile -Force
        Rename-Item "C:\repair-tracker-project-main" "repair-tracker-project"
    }
}

# === Step 4: Build ===
Write-Host "[4/5] 安裝相依套件（3-5 分鐘）..." -ForegroundColor White
Push-Location $INSTALL_DIR
& pnpm install --no-frozen-lockfile
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "相依套件安裝失敗" }

Write-Step "建置中..."
$packages = @("@workspace/api-zod", "@workspace/db", "@workspace/api-client-react", "@workspace/api-server", "@workspace/repair-tracker")
foreach ($pkg in $packages) {
    & pnpm --filter $pkg build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "Build 失敗: $pkg" }
}
Pop-Location
Write-Ok "建置完成"

# === Step 5: Configure ===
Write-Host "[5/5] 設定環境..." -ForegroundColor White

$envFile = Join-Path $INSTALL_DIR "artifacts\api-server\.env"
if (-not (Test-Path $envFile)) {
    $jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    @"
PORT=3000
DATABASE_URL=./repair_tracker.db
JWT_SECRET=$jwt
...n"@ | Set-Content -Path $envFile -Encoding UTF8
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
netsh advfirewall firewall add rule name="RepairAPI" dir=in action=allow protocol=tcp localport=3000 | Out-Null
netsh advfirewall firewall add rule name="RepairFE" dir=in action=allow protocol=tcp localport=5173 | Out-Null

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   安裝完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "   啟動：桌面捷徑「報修追蹤系統」"
Write-Host "   網址：http://localhost:5173"
Write-Host "   帳號：admin / 密碼：admin123"
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "正在啟動..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Push-Location $INSTALL_DIR
cmd /c "start.bat"
Pop-Location
pause
