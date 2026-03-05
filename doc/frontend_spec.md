# Frontend 規格文件

> **最後更新**：2026-03-05
> **系統名稱**：Kefu AI 客服平台（前端）
> **框架**：React 18 + Vite + Tailwind CSS
> **路由**：React Router DOM v7
> **認證**：Google OAuth（@react-oauth/google）

---

## 目錄

1. [系統概述](#1-系統概述)
2. [技術堆疊](#2-技術堆疊)
3. [路由架構](#3-路由架構)
4. [認證與授權](#4-認證與授權)
5. [頁面規格](#5-頁面規格)
   - [5.1 Landing Page（首次進入）](#51-landing-page首次進入)
   - [5.2 AgentHome（主控台）](#52-agenthome主控台)
   - [5.3 WizardPage（建立/編輯 Agent）](#53-wizardpage建立編輯-agent)
   - [5.4 BackendDashboard（Agent 管理後台）](#54-backenddashboard-agent-管理後台)
   - [5.5 Monitor 模組](#55-monitor-模組)
   - [5.6 InboxView（對話收件匣）](#56-inboxview對話收件匣)
6. [共用元件](#6-共用元件)
7. [API 呼叫清單](#7-api-呼叫清單)
8. [狀態管理](#8-狀態管理)
9. [環境變數](#9-環境變數)

---

## 1. 系統概述

本系統為一套 **AI 客服 Agent 建置平台**，讓商家能夠：
1. 透過 4 步驟精靈快速建立 AI 客服 Agent
2. 管理多個 Agent（FAQ、交接觸發條件、LINE / Telegram 部署）
3. 透過收件匣（Inbox）即時回覆客戶，支援 LINE 與 Telegram 雙渠道
4. 查看即時分析數據（Token 用量、費用、對話紀錄）

**主要使用者角色**：

| 角色 | 說明 | 授權方式 |
|------|------|----------|
| Admin（商家） | 可建立、管理自己的 Agent | Google OAuth 登入後，後端驗證 email 是否在 admin 清單 |
| Monitor（監控員） | 可查看全平台用量分析 | 後端 `/api/admin/login` 回傳 `isMonitor: true` |
| End User（終端客戶） | 透過 LINE Bot / Telegram Bot 與 AI 客服對話 | 不進入前端，僅走 Webhook |

---

## 2. 技術堆疊

| 項目 | 版本 / 套件 | 用途 |
|------|-------------|------|
| 框架 | React 18.2.0 | UI 元件 |
| 建構工具 | Vite 5.1.4 | 開發伺服器、打包 |
| 路由 | React Router DOM v7.13.1 | SPA 頁面切換 |
| HTTP 客戶端 | Axios 1.13.2 | 呼叫後端 API |
| CSS | Tailwind CSS 3.4.1 | 樣式 |
| 圖示 | Lucide React 0.344.0 | UI 圖示 |
| 圖表 | Chart.js 4.5.1 | Monitor 圖表顯示 |
| 認證 | @react-oauth/google 0.13.4 | Google 登入 |
| Cookie | js-cookie 3.0.5 | 儲存登入資訊 |

**啟動指令**：

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本地開發（預設 port 5173） |
| `npm run build` | 打包正式版本（輸出至 dist/） |
| `npm run preview` | 本地預覽打包結果 |

---

## 3. 路由架構

```
/ （需 Admin 授權）
├── /                    → AgentHome（所有 Agent 列表）
├── /wizard/new          → WizardPage（新建 Agent，4 步驟精靈）
├── /wizard/:agentId     → WizardPage（編輯現有 Agent）
└── /agent/:agentId/*    → BackendDashboard（單一 Agent 管理後台）

/monitor （需 Monitor 授權）
├── /monitor             → MonitorDashboard（用量統計圖表）
├── /monitor/records     → MonitorRecords（對話紀錄列表）
└── /monitor/users       → MonitorUsers（使用者管理）
```

**路由守衛邏輯**：

| 守衛類型 | 元件 | 邏輯說明 |
|----------|------|----------|
| `<ProtectedRoute>` | ProtectedRoute.jsx | 未授權時顯示 Landing Page（含 Google 登入按鈕）；登入後呼叫後端驗證是否為 Admin |
| `<MonitorRoute>` | ProtectedRoute.jsx | 檢查 `isMonitorAllowed` 狀態（由後端 `/api/admin/login` 回傳 `isMonitor` 決定） |

---

## 4. 認證與授權

**流程**：

```
使用者開啟網頁
  → 檢查 Cookie 是否存有 google_user_id
  → 有 → 自動恢復登入狀態
  → 無 → 顯示 Landing Page + Google 登入按鈕
  → 使用者點擊 Google 登入
  → Google 回傳 credential（JWT）
  → 前端解碼 JWT 取得 email、picture
  → 呼叫 POST /api/admin/login { credential }
  → 後端驗證 JWT，回傳 { isAdmin, isMonitor, googleId, name }
  → isAdmin = true → 儲存 Cookie，進入主應用
  → isAdmin = false → 不儲存，留在 Landing Page
```

**AuthContext 狀態欄位**：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `isVerifying` | boolean | 認證進行中（顯示 loading） |
| `isAuthorized` | boolean | 是否為合法 Admin |
| `userId` | string | Google ID（後端回傳的 `googleId`） |
| `userName` | string | 使用者名稱 |
| `userEmail` | string | Google email（前端從 JWT 解碼） |
| `userPicture` | string | Google 大頭照 URL |
| `isMonitorAllowed` | boolean | 是否有 Monitor 存取權 |
| `postLoginRedirect` | string | 登入後導向的目標路徑 |
| `handleGoogleSuccess` | function | Google 登入成功回呼 |
| `logout` | function | 登出（清除所有 Cookie 與狀態） |

**Cookie 儲存**（js-cookie，過期 7 天）：

| Cookie 名稱 | 說明 |
|-------------|------|
| `google_user_id` | Google ID |
| `google_user_name` | 使用者名稱 |
| `google_user_email` | Email |
| `google_user_picture` | 大頭照 URL |
| `is_monitor` | 是否為 Monitor（"true"/"false"） |

---

## 5. 頁面規格

### 5.1 Landing Page（首次進入）

**元件**：`FoundingPartnerLanding.jsx`
**觸發時機**：未授權使用者首次進入、或等待認證中

| 區塊 | 說明 |
|------|------|
| 頁面主題 | 深色主題（dark），Aurora 動畫背景 |
| 標題 | Founding Partner Program（創始合夥人計畫）|
| 功能卡片 | 3 個功能特色卡片 |
| 登入按鈕 | Google 登入按鈕（`<GoogleLogin>` 元件） |

---

### 5.2 AgentHome（主控台）

**元件**：`AgentHome.jsx`
**路由**：`/`
**API**：`GET /api/admin/agents?userId={userId}`

| UI 元素 | 說明 |
|---------|------|
| Agent 卡片列表 | 顯示每個 Agent 的名稱、最後更新時間、部署狀態 |
| [建立新 Agent] btn | 點擊 → 導向 `/wizard/new` |
| [編輯] btn | 點擊 → 導向 `/wizard/:agentId` |
| [管理後台] btn | 點擊 → 導向 `/agent/:agentId` |
| [Monitor] btn | 僅對 `isMonitorAllowed` 使用者顯示 → 導向 `/monitor` |
| Agent 線上狀態指示 | 顯示 Agent 是否已部署（deploy_config 有值） |

---

### 5.3 WizardPage（建立/編輯 Agent）

**元件**：`WizardPage.jsx` + 步驟子元件
**路由**：`/wizard/new` 或 `/wizard/:agentId`

精靈共 4 個步驟（Tab 式切換）：

#### Step 1 — 問卷填寫（StepWizard.jsx）

| 欄位 | 說明 |
|------|------|
| 品牌描述 | 必填，描述品牌/業務 |
| 官網 URL | 選填，供 AI 爬取生成 FAQ |
| 語氣選擇 | 單選，4 種語氣（見下方） |
| 避免用語 | 選填，AI 回覆中應避免的詞彙 |
| FAQ 列表 | 手動新增或 AI 自動生成，每條 FAQ 含 Q & A |
| [AI 健檢] btn | 呼叫 `POST /api/analyze_faqs`，顯示 FAQ 品質分數與建議 |
| [生成 FAQ] btn | 呼叫 `POST /api/generate_faqs` |
| [優化] btn | 每條 FAQ 旁邊，呼叫 `POST /api/optimize_faq` |

**語氣選項**：

| 值 | 顯示文字 |
|----|----------|
| `warm` | 親切有溫度 |
| `professional` | 專業簡潔 |
| `friendly` | 像朋友聊天 |
| `lively` | 活潑可愛 |

**FAQ 字數規範**（後端驗證）：

| 欄位 | 字數範圍 |
|------|----------|
| 問題（Q） | 20–40 字（繁體中文） |
| 答案（A） | 100–150 字（繁體中文） |

---

#### Step 2 — 審閱 Prompt（StepReview.jsx）

| 動作 | 說明 |
|------|------|
| 顯示生成的系統 Prompt | 由 `POST /api/generate_prompt` 產生 |
| FAQ 手動編輯 | 可在此步驟新增/刪除 FAQ |
| [確認設定] btn | 呼叫 `POST /api/confirm_setup`，建立或更新 Agent |
| 成功後 | 取得 `agent_id`，可進入下一步 |

---

#### Step 3 — AI Demo 測試（StepDemo.jsx）

| 元素 | 說明 |
|------|------|
| 聊天介面 | 輸入訊息，呼叫 `POST /api/chat` |
| 相關 FAQ 顯示 | 顯示 AI 回覆參考的 FAQ 條目 |
| 交接觸發提示 | 若觸發交接條件，顯示交接狀態 |
| Session ID | 由 `GET /api/init_session` 取得 |

---

#### Step 4 — 部署指引（StepDeploy.jsx）

| 元素 | 說明 |
|------|------|
| 步驟說明 | 圖文說明如何將 Agent 部署到 LINE / Telegram |
| 靜態說明頁 | 無 API 呼叫，純 UI 引導 |
| 實際部署 | 在 BackendDashboard 完成（輸入 Access Token 等憑證） |

---

### 5.4 BackendDashboard（Agent 管理後台）

**元件**：`BackendDashboard.jsx`
**路由**：`/agent/:agentId/*`

此頁面為 Agent 的完整管理後台，包含側邊欄導航與多個功能分區：

#### (1) 子 Agent 管理

| 元素 | 說明 |
|------|------|
| 已啟用子 Agent 列表 | Knowledge Base、Escalation Manager、Root Admin |
| [啟用/停用] toggle | 呼叫 `POST /api/admin/agent/:id/toggle_subagent` |
| [新增子 Agent] btn | 呼叫 `GET /api/admin/agent/:id/available_subagents` 取得可用清單，再呼叫 `POST /api/admin/agent/:id/add_subagent` |

#### (2) Playground 測試聊天

| 元素 | 說明 |
|------|------|
| 聊天介面 | 即時測試 Agent 回覆 |
| 呼叫 API | `POST /api/chat`（source 標記為 playground） |
| 相關 FAQ 顯示 | 顯示 AI 參考的 FAQ 條目 |

#### (3) 渠道整合設定

**LINE 整合**：

| 欄位 | 說明 |
|------|------|
| Access Token | LINE Channel Access Token |
| Channel Secret | LINE Channel Secret |
| [部署] btn | 呼叫 `POST /api/deploy_line/:agentId` |
| 部署狀態 | 顯示已連接的 LINE Bot 資訊 |

**Telegram 整合**：

| 欄位 | 說明 |
|------|------|
| Bot Token | Telegram Bot Token（從 @BotFather 取得） |
| [部署] btn | 呼叫 `POST /api/deploy_telegram/:agentId` |
| 部署狀態 | 顯示已連接的 Telegram Bot 資訊 |

#### (4) FAQ 管理

| 元素 | 說明 |
|------|------|
| FAQ 列表編輯 | 新增、刪除、修改 FAQ |
| [AI 優化] btn | 呼叫 `POST /api/optimize_faq` |
| [儲存] btn | 呼叫 `POST /api/admin/agent/:id/update_faqs` |

#### (5) 交接觸發條件

| 元素 | 說明 |
|------|------|
| 預設觸發條件 | 客訴/負評/情緒激動、退款/退貨、客製/報價、合作邀約、催單/急件 |
| 自訂觸發條件 | 商家自行新增關鍵字 |
| [儲存] btn | 呼叫 `POST /api/admin/agent/:id/update_handoff` |

#### (5b) 通知設定（Escalation Manager 內）

| 元素 | 說明 |
|------|------|
| 搜尋框 | 即時篩選用戶名稱 |
| 用戶列表 | 顯示所有與 Bot 互動過的用戶，超過 6 筆時可捲動 |
| [設為接收者] btn | 呼叫 `POST /api/inbox/agents/:id/notify-user` |
| [取消] btn | 同上，傳空字串清除 |
| 載入時機 | 進入 Escalation Manager 時自動呼叫 `GET /api/inbox/agents/:id/users` |

#### (6) 數據統計

| 元素 | 說明 |
|------|------|
| Token 用量 | 呼叫 `GET /api/admin/agent/:id/stats` |
| 費用試算 | 依模型計算（見後端規格費率） |

#### (7) 客戶管理 (CRM)

| 元素 | 說明 |
|------|------|
| 用戶列表 | 顯示所有與 Bot 互動過的用戶（名稱、上次互動時間） |
| 用戶抽屜 | 顯示基本資料（上次互動時間、ID） |

#### (8) 對話收件匣（Inbox）

| 元素 | 說明 |
|------|------|
| 進入方式 | 側邊欄點選「對話收件匣」 |
| 詳細規格 | 見 [§ 5.6 InboxView](#56-inboxview對話收件匣) |

---

### 5.5 Monitor 模組

**存取條件**：後端 `/api/admin/login` 回傳 `isMonitor: true`

#### MonitorDashboard.jsx（`/monitor`）

| 元素 | 說明 |
|------|------|
| 篩選條件 | 天數（days）、使用類型（usage_type） |
| 圖表 1 | API 請求次數趨勢（Chart.js 折線圖） |
| 圖表 2 | Token 用量分解（輸入/輸出/工具/思考） |
| 圖表 3 | API 費用分析 |
| 顏色配色 | 青色=總計、紫色=輸入、綠色=輸出、橘色=工具、粉色=思考 |
| API | `GET /api/monitor/stats?days={}&usage_type={}` |

#### MonitorRecords.jsx（`/monitor/records`）

| 元素 | 說明 |
|------|------|
| 搜尋欄 | 依 Admin ID 或名稱搜尋 |
| 使用類型篩選 | 解析表單、網頁爬取、生成 FAQ、優化 FAQ、健檢、聊天 |
| 分頁 | 每頁 10 筆，含上/下頁按鈕 |
| API | `GET /api/monitor/records?page={}&limit={}&usage_type={}&admin_query={}` |

#### MonitorUsers.jsx（`/monitor/users`）

| 元素 | 說明 |
|------|------|
| 使用者搜尋 | 搜尋 Admin 使用者 |
| 每日用量圖表 | 選定 Admin 後顯示其每日 API 用量 |
| Agent 清單 | 點選 Agent 可查看對話 Session |
| 訊息歷史 | 顯示特定 Session 的完整對話紀錄 |
| API | `GET /api/monitor/users`、`GET /api/monitor/users/:id/details`、`GET /api/monitor/agents/:id/chats`、`GET /api/monitor/sessions/:id/messages` |

---

### 5.6 InboxView（對話收件匣）

**檔案**：`src/components/InboxView.jsx`
**觸發條件**：在 BackendDashboard 側邊欄點選「對話收件匣」（`activeMenu === 'inbox'`）

**Props**：
- `currentAgent`：當前 Agent 物件（含 `_id`、`admin_id`、`deploy_config`）

**State**：

| State | 說明 |
|-------|------|
| `sessions` | 對話列表 |
| `selectedSession` | 當前選中的對話 |
| `messages` | 當前對話的訊息串 |
| `replyText` | 回覆輸入框內容 |
| `isSending` | 發送中旗標 |
| `activeTab` | 分頁標籤：`open`（進行中）/ `done`（已結束） |
| `isClosing` | 結束對話中旗標 |
| `lineQuota` | LINE 推播額度資訊 |
| `messagesEndRef` | 自動捲到底部 |

**渠道判斷**：
- `getChannel(session)`：依 `session.channel` 欄位判斷，若無則檢查 `session_id` 是否以 `telegram_` 開頭
- 支援 `line` 和 `telegram` 兩種渠道

**API 呼叫**：

```
GET  /api/inbox/agents/${agentId}/sessions?userId=${adminId}&tab=${activeTab}
GET  /api/inbox/sessions/${sessionId}/messages?userId=${adminId}&agent_id=${agentId}
POST /api/inbox/sessions/${sessionId}/reply?userId=${adminId}
     body: { agent_id, message }
POST /api/inbox/sessions/${sessionId}/close?userId=${adminId}
     body: { agent_id }
GET  /api/inbox/agents/${agentId}/line-quota?userId=${adminId}
```

**UI 結構**：
- 頂部：頁面標題 + LINE 推播額度顯示 + 重新整理按鈕
- 分頁標籤：進行中（open）/ 已結束（done）
- 左側（w-80）：對話列表，顯示用戶名、最後訊息預覽、時間、渠道 badge（LINE / Telegram）、AI/人工 badge
- 右側（flex-1）：
  - 頂部：用戶名 + session_id + 模式 badge + [結束對話] 按鈕
  - 中間（可捲動）：訊息氣泡，user 靠左（灰色），ai 靠右（brand 藍），human_agent 靠右（橘色）
  - 底部：textarea（Ctrl/Cmd+Enter 發送）+ 發送按鈕

**樂觀更新**：發送回覆時立即在 UI 插入訊息並扣減 LINE 額度，失敗時回滾。

---

## 6. 共用元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| `ProtectedRoute` | `src/components/ProtectedRoute.jsx` | Admin 路由守衛（未登入顯示 Landing） |
| `MonitorRoute` | `src/components/ProtectedRoute.jsx` | Monitor 路由守衛（權限不足顯示提示） |
| `FoundingPartnerLanding` | `src/components/FoundingPartnerLanding.jsx` | Landing Page（含 Google 登入） |
| `AgentHome` | `src/components/AgentHome.jsx` | Agent 列表主控台 |
| `BackendDashboard` | `src/components/BackendDashboard.jsx` | Agent 管理後台 |
| `StepWizard` | `src/components/StepWizard.jsx` | 精靈步驟 1：問卷 |
| `StepReview` | `src/components/StepReview.jsx` | 精靈步驟 2：審閱 Prompt |
| `StepDemo` | `src/components/StepDemo.jsx` | 精靈步驟 3：AI Demo |
| `StepDeploy` | `src/components/StepDeploy.jsx` | 精靈步驟 4：部署指引 |
| `InboxView` | `src/components/InboxView.jsx` | 對話收件匣 |
| `MonitorApp` | `src/components/monitor/MonitorApp.jsx` | Monitor 側邊欄佈局 |
| `MonitorDashboard` | `src/components/monitor/MonitorDashboard.jsx` | 用量圖表 |
| `MonitorRecords` | `src/components/monitor/MonitorRecords.jsx` | 對話紀錄表格 |
| `MonitorUsers` | `src/components/monitor/MonitorUsers.jsx` | 使用者管理 |

---

## 7. API 呼叫清單

### 認證

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `POST` | `/api/admin/login` | Google 登入後 | `{ isAdmin, isMonitor, googleId, name }` |

### Agent 管理

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `GET` | `/api/admin/agents?userId=` | AgentHome 載入 | Agent 列表 |
| `GET` | `/api/admin/agent/:id` | BackendDashboard 載入 | 單一 Agent 詳情 |
| `GET` | `/api/admin/agent/:id/stats` | BackendDashboard 統計區 | Token 用量統計 |
| `GET` | `/api/admin/agent/:id/available_subagents` | 新增子 Agent 前 | 可用子 Agent 清單 |
| `POST` | `/api/admin/agent/:id/add_subagent` | 點擊新增子 Agent | — |
| `POST` | `/api/admin/agent/:id/toggle_subagent` | 切換子 Agent 啟用狀態 | — |
| `POST` | `/api/admin/agent/:id/update_config` | 儲存設定 | — |
| `POST` | `/api/admin/agent/:id/update_faqs` | 儲存 FAQ | — |
| `POST` | `/api/admin/agent/:id/update_handoff` | 儲存交接條件 | — |

### Agent 建立精靈

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `POST` | `/api/generate_faqs` | Step 1 點擊生成 FAQ | `{ faqs: [...] }` |
| `POST` | `/api/optimize_faq` | 點擊優化單條 FAQ | `{ q, a }` |
| `POST` | `/api/analyze_faqs` | 點擊 AI 健檢 | `{ score, report, suggestions }` |
| `POST` | `/api/generate_prompt` | Step 2 進入時 | `{ config_id }` |
| `POST` | `/api/confirm_setup` | Step 2 確認設定 | `{ agent_id }` |
| `GET` | `/api/init_session` | Step 3 / Playground 進入時 | `{ session_id }` |
| `POST` | `/api/chat` | 測試聊天發送訊息 | AI 回覆 + 相關 FAQ + 交接狀態 |

### 渠道部署

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `POST` | `/api/deploy_line/:agentId` | LINE 部署設定 | `{ bot_info }` |
| `POST` | `/api/deploy_telegram/:agentId` | Telegram 部署設定 | `{ bot_info }` |

### 收件匣（Inbox）

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `GET` | `/api/inbox/agents/:id/sessions` | InboxView 載入 | Session 列表 |
| `GET` | `/api/inbox/sessions/:id/messages` | 選擇對話 | 訊息列表 |
| `POST` | `/api/inbox/sessions/:id/reply` | 發送回覆 | — |
| `POST` | `/api/inbox/sessions/:id/close` | 結束對話 | — |
| `GET` | `/api/inbox/agents/:id/users` | Escalation Manager 載入 | 用戶列表 |
| `POST` | `/api/inbox/agents/:id/notify-user` | 設定通知接收者 | — |
| `GET` | `/api/inbox/agents/:id/line-quota` | InboxView 載入 | LINE 推播額度 |

### Monitor

| 方法 | 路徑 | 呼叫時機 | 回傳 |
|------|------|----------|------|
| `GET` | `/api/monitor/stats` | MonitorDashboard 載入 | 統計圖表資料 |
| `GET` | `/api/monitor/records` | MonitorRecords 載入/篩選 | 分頁紀錄列表 |
| `GET` | `/api/monitor/users` | MonitorUsers 載入 | Admin 使用者清單 |
| `GET` | `/api/monitor/users/:id/details` | 點選 Admin 查看詳情 | Agent 列表 + 每日用量 |
| `GET` | `/api/monitor/agents/:id/chats` | 點選 Agent | Session 列表 |
| `GET` | `/api/monitor/sessions/:id/messages` | 點選 Session | 完整對話訊息 |

---

## 8. 狀態管理

**架構**：React Context API（非 Redux）

**AuthContext**（全域共用）：
- 位置：`src/context/AuthContext.jsx`
- 提供：認證狀態、Google 使用者資訊、Monitor 授權狀態、登出功能
- 初始化：App 掛載時檢查 Cookie 恢復登入狀態

**本地元件 State（useState）**：
- 各頁面自行管理表單資料、載入狀態、API 回傳資料
- BackendDashboard 使用 `useAuth()` 取得 `userName`、`userEmail`、`userPicture`
- 複雜元件大量使用 `useCallback` 管理 API 呼叫函式

**Client-side 儲存**：

| 儲存方式 | 用途 |
|----------|------|
| Cookie（js-cookie） | Google userId、userName、email、picture、is_monitor，過期 7 天 |
| Session Storage | 登入前的目標路徑（postLoginRedirect） |

---

## 9. 環境變數

| 變數名稱 | 說明 | 預設值 |
|----------|------|--------|
| `VITE_API_URL` | 後端 API 基礎 URL | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | 必填，無預設 |

設定方式：在前端根目錄建立 `.env` 檔案：

```
VITE_API_URL=https://your-backend.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 附錄：檔案結構

```
kefu_frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                          # Vercel 部署設定
├── doc/
│   └── frontend_spec.md                # 本文件
└── src/
    ├── App.jsx                          # 路由設定入口
    ├── main.jsx                         # React 根入口 + GoogleOAuthProvider
    ├── config.js                        # API URL 設定
    ├── types.js                         # 常數定義（AppStep, ToneType, DEFAULT_HANDOFF_OPTIONS）
    ├── index.css                        # Tailwind CSS 引入
    ├── context/
    │   └── AuthContext.jsx              # Google OAuth 認證 Context
    ├── pages/
    │   └── WizardPage.jsx              # 精靈頁面容器
    └── components/
        ├── AgentHome.jsx               # 主控台
        ├── BackendDashboard.jsx        # Agent 管理後台
        ├── FoundingPartnerLanding.jsx  # Landing Page（含 Google 登入）
        ├── ProtectedRoute.jsx          # 路由守衛（Admin + Monitor）
        ├── StepWizard.jsx             # 精靈步驟 1
        ├── StepReview.jsx             # 精靈步驟 2
        ├── StepDemo.jsx               # 精靈步驟 3
        ├── StepDeploy.jsx             # 精靈步驟 4
        ├── InboxView.jsx              # 對話收件匣（雙渠道）
        └── monitor/
            ├── MonitorApp.jsx          # Monitor 佈局
            ├── MonitorDashboard.jsx    # 用量圖表
            ├── MonitorRecords.jsx      # 對話紀錄
            ├── MonitorUsers.jsx        # 使用者管理
            └── monitor.css            # Monitor 專用樣式
```
