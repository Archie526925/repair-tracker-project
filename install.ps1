#Requires -RunAsAdministrator
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$INSTALL_DIR = "C:\repair-tracker-project"
$ENV_FILE = Join-Path $INSTALL_DIR "artifacts\api-server\.env"
$LOG_DIR = Join-Path $INSTALL_DIR "logs"

function Write-Step {
    param([string]$Num, [string]$Total, [string]$Msg)
    Write-Host ""
    Write-Host "[$Num/$Total] $Msg" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Cmd)
    return [bool](Get-Command $Cmd -ErrorAction SilentlyContinue)
}

# ===== 檢查系統管理員 =====
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[錯誤] 請右鍵點擊 install.bat，選擇「以系統管理員身份執行」" -ForegroundColor Red
    exit 1
}

Write-Host "============================================"
Write-Host "  報修追蹤系統 — 一鍵安裝程式"
Write-Host "============================================"

# ===== 1. Node.js =====
Write-Step "1" "6" "檢查 Node.js..."
if (Test-Command "node") {
    $ver = node --version
    Write-Host "  -> 已安裝: $ver" -ForegroundColor Green
} else {
    Write-Host "  -> 未安裝，正在下載 Node.js v20..." -ForegroundColor Yellow
    $nodeUrl = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
    $nodeMsi = Join-Path $env:TEMP "node_install.msi"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
    Write-Host "  -> 安裝中（請稍候）..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait -NoNewWindow
    $env:PATH += ";C:\Program Files\nodejs;$env:APPDATA\npm"
    Remove-Item $nodeMsi -ErrorAction SilentlyContinue
    Write-Host "  -> Node.js 安裝完成" -ForegroundColor Green
}

# ===== 2. pnpm =====
Write-Step "2" "6" "檢查 pnpm..."
if (Test-Command "pnpm") {
    $ver = pnpm --version
    Write-Host "  -> 已安裝: $ver" -ForegroundColor Green
} else {
    Write-Host "  -> 安裝 pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "  -> pnpm 安裝完成" -ForegroundColor Green
}

# ===== 3. Git =====
Write-Step "3" "6" "檢查 Git..."
if (Test-Command "git") {
    $ver = git --version
    Write-Host "  -> 已安裝: $ver" -ForegroundColor Green
} else {
    Write-Host "  -> 未安裝，正在下載 Git..." -ForegroundColor Yellow
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.45.1.windows.1/Git-2.45.1-64-bit.exe"
    $gitExe = Join-Path $env:TEMP "git_install.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitExe -UseBasicParsing
    Write-Host "  -> 安裝中（請稍候）..."
    Start-Process $gitExe -ArgumentList '/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"' -Wait -NoNewWindow
    $env:PATH += ";C:\Program Files\Git\cmd"
    Remove-Item $gitExe -ErrorAction SilentlyContinue
    Write-Host "  -> Git 安裝完成" -ForegroundColor Green
}

# ===== 4. NSSM =====
Write-Step "4" "6" "檢查 NSSM..."
$nssmPath = Join-Path $env:SystemRoot "nssm.exe"
if (Test-Path $nssmPath) {
    Write-Host "  -> 已安裝" -ForegroundColor Green
} else {
    Write-Host "  -> 未安裝，正在下載..." -ForegroundColor Yellow
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = Join-Path $env:TEMP "nssm.zip"
    $nssmTmp = Join-Path $env:TEMP "nssm"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
    Write-Host "  -> 解壓縮..."
    if (Test-Path $nssmTmp) { Remove-Item $nssmTmp -Recurse -Force }
    Expand-Archive -Path $nssmZip -DestinationPath $nssmTmp -Force
    Copy-Item (Join-Path $nssmTmp "nssm-2.24\win64\nssm.exe") $nssmPath
    Remove-Item $nssmZip -ErrorAction SilentlyContinue
    Remove-Item $nssmTmp -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  -> NSSM 安裝完成" -ForegroundColor Green
}

# ===== 5. 下載專案 + 安裝依賴 + 建構 =====
Write-Step "5" "6" "下載專案..."
if (Test-Path $INSTALL_DIR) {
    Write-Host "  -> 目錄已存在，更新中..." -ForegroundColor Yellow
    Set-Location $INSTALL_DIR
    git pull 2>$null
} else {
    Write-Host "  -> 複製中..." -ForegroundColor Yellow
    Set-Location C:\
    git clone https://github.com/Archie526925/repair-tracker-project.git
}

Set-Location $INSTALL_DIR

Write-Host "  -> 安裝依賴（可能需要幾分鐘）..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Host "[錯誤] pnpm install 失敗" -ForegroundColor Red; exit 1 }

Write-Host "  -> 建構專案..." -ForegroundColor Yellow
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-spec build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/repair-tracker build
if ($LASTEXITCODE -ne 0) { Write-Host "[錯誤] 建構失敗" -ForegroundColor Red; exit 1 }
Write-Host "  -> 建構完成" -ForegroundColor Green

# ===== 6. 設定 .env =====
Write-Step "6" "6" "設定環境..."
if (-not (Test-Path $ENV_FILE)) {
    Write-Host "  -> 建立 .env 檔案..." -ForegroundColor Yellow
    $jwtSecret = [guid]::NewGuid().ToString("N").Substring(0, 32)
    $envContent = @"
PORT=3000
DATABASE_URL=./repair_tracker.db
JWT_SECRET=$jwtSecret
TZ=Asia/Taipei
"@
    $envContent | Out-File -FilePath $ENV_FILE -Encoding UTF8
    Write-Host "  -> .env 已建立（已自動產生 JWT_SECRET）" -ForegroundColor Green
} else {
    Write-Host "  -> .env 已存在，跳過" -ForegroundColor Green
}

# ===== 註冊 Windows 服務 =====
Write-Host ""
Write-Host "============================================"
Write-Host "  註冊 Windows 服務"
Write-Host "============================================"

# 移除舊服務
& $nssmPath stop RepairAPI 2>$null
& $nssmPath remove RepairAPI confirm 2>$null
& $nssmPath stop RepairFrontend 2>$null
& $nssmPath remove RepairFrontend confirm 2>$null

Write-Host ""
Write-Host "  -> 註冊 API 服務..." -ForegroundColor Yellow
& $nssmPath install RepairAPI "C:\Program Files\nodejs\node.exe"
& $nssmPath set RepairAPI AppParameters "--enable-source-maps `"$INSTALL_DIR\artifacts\api-server\dist\index.mjs`""
& $nssmPath set RepairAPI AppDirectory "$INSTALL_DIR\artifacts\api-server"
& $nssmPath set RepairAPI DisplayName "Repair Tracker API"
& $nssmPath set RepairAPI Description "報修追蹤系統 API 伺服器"
& $nssmPath set RepairAPI Start SERVICE_AUTO_START

# 從 .env 讀取環境變數
Get-Content $ENV_FILE | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        & $nssmPath set RepairAPI AppEnvironmentExtra "$key=$val" 2>$null
    }
}

& $nssmPath set RepairAPI AppStdout "$LOG_DIR\api.log"
& $nssmPath set RepairAPI AppStderr "$LOG_DIR\api-error.log"
& $nssmPath set RepairAPI AppStopMethodSkip 6
& $nssmPath set RepairAPI AppStopMethodConsole 3000
& $nssmPath set RepairAPI AppStopMethodWindow 3000

Write-Host "  -> 註冊前端服務..." -ForegroundColor Yellow
& $nssmPath install RepairFrontend "C:\Program Files\nodejs\node.exe"
& $nssmPath set RepairFrontend AppParameters "`"$INSTALL_DIR\node_modules\vite\bin\vite.js`" preview --host 0.0.0.0 --port 5173"
& $nssmPath set RepairFrontend AppDirectory "$INSTALL_DIR\artifacts\repair-tracker"
& $nssmPath set RepairFrontend DisplayName "Repair Tracker Frontend"
& $nssmPath set RepairFrontend Description "報修追蹤系統前端"
& $nssmPath set RepairFrontend Start SERVICE_AUTO_START
& $nssmPath set RepairFrontend AppEnvironmentExtra "PORT=5173"
& $nssmPath set RepairFrontend AppStdout "$LOG_DIR\frontend.log"
& $nssmPath set RepairFrontend AppStderr "$LOG_DIR\frontend-error.log"
& $nssmPath set RepairFrontend AppStopMethodSkip 6
& $nssmPath set RepairFrontend AppStopMethodConsole 3000
& $nssmPath set RepairFrontend AppStopMethodWindow 3000

# 建立 log 目錄
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

# 啟動服務
Write-Host "  -> 啟動服務..." -ForegroundColor Yellow
& $nssmPath start RepairAPI
Start-Sleep -Seconds 3
& $nssmPath start RepairFrontend

# ===== 防火牆 =====
Write-Host "  -> 設定防火牆..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="Repair Tracker API" dir=in action=allow protocol=tcp localport=3000 2>$null | Out-Null
netsh advfirewall firewall add rule name="Repair Tracker Frontend" dir=in action=allow protocol=tcp localport=5173 2>$null | Out-Null

# ===== 完成 =====
Write-Host ""
Write-Host "============================================"
Write-Host "  安裝完成！"
Write-Host "============================================"
Write-Host ""
Write-Host "  前端: http://localhost:5173"
Write-Host "  API:  http://localhost:3000"
Write-Host ""
Write-Host "  預設帳號: admin / admin123"
Write-Host "  請登入後立即修改密碼！"
Write-Host ""
Write-Host "  服務名稱: RepairAPI / RepairFrontend"
Write-Host "  管理命令:"
Write-Host "    nssm stop RepairAPI"
Write-Host "    nssm start RepairAPI"
Write-Host "    nssm status RepairAPI"
Write-Host ""
Write-Host "============================================"
