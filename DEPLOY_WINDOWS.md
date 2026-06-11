# 報修追蹤系統 — Windows 部署指南

## 環境需求

- Windows 10/11
- 網路（內網或外網皆可，只需要安裝時能連 npm）

---

## 第一步：安裝軟體

### 1. Node.js (v20+)

1. 到 https://nodejs.org 下載 LTS 版本（左邊那顆大按鈕）
2. 執行安裝程式，全部按 Next（預設選項就好）
3. 安裝完開 PowerShell 確認：
   ```
   node --version
   ```
   應該顯示 v20.x.x 或更高

### 2. pnpm

開 PowerShell（系統管理員）：
```powershell
npm install -g pnpm
```
確認：
```powershell
pnpm --version
```

### 3. Git

1. 到 https://git-scm.com 下載安裝
2. 安裝過程中全部用預設選項
3. 確認：
   ```
   git --version
   ```

### 4. NSSM（把 Node.js 註冊成 Windows 服務，開機自啟）

1. 到 https://nssm.cc/download 下載
2. 解壓縮，把 `nssm.exe` 複製到 `C:\Windows\`（或加到 PATH 環境變數）

> ⚠️ **不需要安裝 PostgreSQL！** 這個版本使用 SQLite（單一檔案資料庫），不需要任何資料庫服務。

---

## 第二步：下載專案

開 PowerShell：
```powershell
cd C:\
git clone https://github.com/Archie526925/repair-tracker-project.git
cd repair-tracker-project
```

---

## 第三步：安裝依賴

```powershell
pnpm install
```

這步可能要 2-5 分鐘，取決於網速。

---

## 第四步：設定環境變數

在 `C:\repair-tracker-project\artifacts\api-server\` 建立 `.env` 檔案：

```
PORT=3000
DATABASE_URL=./repair_tracker.db
JWT_SECRET=隨便打一串很長的亂數英文數字
TZ=Asia/Taipei
```

⚠️ **JWT_SECRET 務必改成自己的隨機字串**，不要用預設值！

---

## 第五步：初始化資料庫

**SQLite 版不需要手動建表！** API server 啟動時會自動：
1. 建立 `repair_tracker.db` 檔案
2. 建立所有資料表
3. 建立預設類別（電氣、水管、結構等）
4. 建立 admin 帳號（如果沒有任何使用者的話）

預設 admin 帳號：
- 使用者名稱：`admin`
- 密碼：`admin123`（可在 `.env` 設定 `ADMIN_PASSWORD` 覆蓋）

> ⚠️ 第一次登入後**務必修改 admin 密碼**！

---

## 第六步：Build

```powershell
cd C:\repair-tracker-project

# 建共享套件
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-spec build
pnpm --filter @workspace/api-client-react build

# 建 API server
pnpm --filter @workspace/api-server build

# 建前端
pnpm --filter @workspace/repair-tracker build
```

---

## 第七步：註冊 Windows 服務（開機自啟）

### API Server 服務

開 PowerShell（**系統管理員**）：

```powershell
nssm install RepairAPI "C:\Program Files\nodejs\node.exe"
```

在彈出的視窗中設定：
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Arguments**: `--enable-source-maps C:\repair-tracker-project\artifacts\api-server\dist\index.mjs`
- **Startup directory**: `C:\repair-tracker-project\artifacts\api-server`

切到 **Environment** 頁面，加入：
```
DATABASE_URL=./repair_tracker.db
JWT_SECRET=你的JWT密碼
PORT=3000
NODE_ENV=production
TZ=Asia/Taipei
```

按 **Install service**，然後：
```powershell
nssm start RepairAPI
```

### 前端服務

前端是靜態檔（build 好放在 dist/public/），需要一個簡單的 HTTP server。

用 NSSM 註冊一個 Vite preview 服務：

```powershell
nssm install RepairFrontend "C:\Program Files\nodejs\node.exe"
```

設定：
- **Arguments**: `C:\repair-tracker-project\node_modules\vite\bin\vite.js preview --host 0.0.0.0 --port 5173`
- **Startup directory**: `C:\repair-tracker-project\artifacts\repair-tracker`

Environment：
```
PORT=5173
```

```powershell
nssm start RepairFrontend
```

---

## 第八步：確認可以連

在本機瀏覽器開：
```
http://localhost:5173
```

看到登入頁面就成功了 ✅

---

## 別人怎麼連

你的筆電 IP 查法：
```powershell
ipconfig
```
找 `IPv4 位址`，例如 `192.168.1.55`

別人在瀏覽器開：
```
http://192.168.1.55:5173
```

⚠️ **Windows 防火牆要開 port：**

1. 控制台 → Windows Defender 防火牆 → 進階設定
2. 輸入規則 → 新增規則
3. 連接埠 → TCP → 特定本機連接埠：`3000,5173`
4. 允許連線 → 完成

---

## 更新版本

當 GitHub 有新版本時：
```powershell
cd C:\repair-tracker-project
git pull
pnpm install

# 重新 build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-spec build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/repair-tracker build

# 重啟服務
nssm restart RepairAPI
nssm restart RepairFrontend
```

---

## 疑難排解

### API server 起不來
```powershell
# 看服務狀態
nssm status RepairAPI

# 看錯誤 log
# 到 Windows 事件檢視器 → Windows 記錄 → 應用程式
```

### 別人連不到
1. 確認防火牆有開 port 3000 和 5173
2. 確認 IP 沒變（公司網路可能是 DHCP）
3. 確認同一個網段（有些公司有分 VLAN）
