# 報修追蹤系統 — Windows 部署指南

## 一鍵安裝（推薦）

給沒有技術背景的人使用，一個 `.bat` 檔搞定所有事情：

1. 下載repo，雙擊 `install.bat`
2. **右鍵 → 以系統管理員身份執行**
3. 等它跑完，瀏覽器開 `http://localhost:5173`

這個腳本自動做完所有事：
- 安裝 Node.js v20
- 安裝 pnpm
- 安裝 Git
- 安裝 NSSM（Windows 服務管理器）
- 下載專案程式碼
- 安裝依賴 + 建構
- 自動產生 `.env`（含隨機 JWT_SECRET）
- 註冊 Windows 服務（開機自啟）
- 設定防火牆

**需求：** Windows 10/11，安裝時需要連網（下載 Node.js / Git / NSSM）

---

## 手動安裝

如果你已經有 Node.js 環境：

### 環境需求

- Windows 10/11
- Node.js v20+
- pnpm
- Git
- NSSM

### 第一步：安裝軟體

#### 1. Node.js (v20+)

1. 到 https://nodejs.org 下載 LTS 版本
2. 安裝，全部按 Next
3. 確認：`node --version`

#### 2. pnpm

```powershell
npm install -g pnpm
```

#### 3. Git

1. 到 https://git-scm.com 下載安裝
2. 全部用預設選項

#### 4. NSSM

1. 到 https://nssm.cc/download 下載
2. 解壓縮，把 `nssm.exe` 複製到 `C:\Windows\`

---

### 第二步：下載專案

```powershell
cd C:\
git clone https://github.com/Archie526925/repair-tracker-project.git
cd repair-tracker-project
```

---

### 第三步：安裝依賴

```powershell
pnpm install
```

---

### 第四步：設定環境變數

在 `artifacts\api-server\` 建立 `.env`：

```
PORT=3000
DATABASE_URL=./repair_tracker.db
JWT_SECRET=你的隨機字串
TZ=Asia/Taipei
```

⚠️ **JWT_SECRET 務必改成自己的隨機字串**，不要用預設值！

---

### 第五步：初始化資料庫

SQLite 版會自動建表和建立 admin 帳號，不需要手動操作。

預設 admin 帳號：`admin` / `admin123`（可在 `.env` 設定 `ADMIN_PASSWORD` 覆蓋）

> ⚠️ 第一次登入後**務必修改 admin 密碼**！

---

### 第六步：Build

```powershell
cd C:\repair-tracker-project
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-spec build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/repair-tracker build
```

---

### 第七步：註冊 Windows 服務

#### API Server

```powershell
nssm install RepairAPI "C:\Program Files\nodejs\node.exe"
nssm set RepairAPI AppParameters "--enable-source-maps ""C:\repair-tracker-project\artifacts\api-server\dist\index.mjs"""
nssm set RepairAPI AppDirectory "C:\repair-tracker-project\artifacts\api-server"
nssm set RepairAPI Start SERVICE_AUTO_START
```

#### 前端

```powershell
nssm install RepairFrontend "C:\Program Files\nodejs\node.exe"
nssm set RepairFrontend AppParameters "C:\repair-tracker-project\node_modules\vite\bin\vite.js preview --host 0.0.0.0 --port 5173"
nssm set RepairFrontend AppDirectory "C:\repair-tracker-project\artifacts\repair-tracker"
nssm set RepairFrontend Start SERVICE_AUTO_START
```

---

### 第八步：確認可以連

瀏覽器開 `http://localhost:5173`

---

## 別人怎麼連

查本機 IP：`ipconfig` → 找 `IPv4 位址`

別人在瀏覽器開：`http://你的IP:5173`

⚠️ **Windows 防火牆要開 port 3000 和 5173**

---

## 更新版本

```powershell
cd C:\repair-tracker-project
git pull
pnpm install
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-spec build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/repair-tracker build
nssm restart RepairAPI
nssm restart RepairFrontend
```

---

## 疑難排解

### API server 起不來
```powershell
nssm status RepairAPI
nssm status RepairFrontend
```

### 別人連不到
1. 防火牆開 port 3000 和 5173
2. 確認 IP 跟同一個網段
