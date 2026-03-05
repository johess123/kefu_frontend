# Kefu AI 客服平台 — 前端文件索引

> **最後更新**：2026-03-05
>
> **AI 使用指南**：處理前端任務時先讀此檔，依關鍵字找到對應條目，再到 spec 路徑讀取詳細資訊。
> 若任務涉及後端，請另讀 `kefu_backend/doc/index.md`。

---

## 前端技術堆疊

| 項目 | 版本 / 套件 |
|------|-------------|
| 框架 | React 18.2.0 + Vite 5.1.4 |
| 路由 | React Router DOM v7.13.1 |
| 樣式 | Tailwind CSS 3.4.1 |
| HTTP | Axios 1.13.2 |
| 認證 | @react-oauth/google 0.13.4 |
| 圖表 | Chart.js 4.5.1 |
| 圖示 | Lucide React 0.344.0 |
| Cookie | js-cookie 3.0.5 |

---

## 前端文件位置

| 文件 | 路徑 | 說明 |
|------|------|------|
| **本索引** | `kefu_frontend/doc/index.md` | 前端 AI 入口、關鍵字查詢 |
| **前端規格** | `kefu_frontend/doc/frontend_spec.md` | 頁面、元件、路由、API 呼叫、狀態管理 |
| **後端索引** | `kefu_backend/doc/index.md` | 後端 AI 入口（後端任務請讀此檔） |
| **後端規格** | `kefu_backend/doc/backend_spec.md` | API 詳細規格（前端需查 API 時參考） |

---

## 前端功能索引

| 關鍵字 | 說明 | spec 位置 | 原始碼路徑 |
|--------|------|-----------|------------|
| 登入、Google OAuth、認證 | Google OAuth 登入流程 | frontend_spec.md § 4 | `src/context/AuthContext.jsx` |
| 登出、logout、Cookie | 清除登入狀態 | frontend_spec.md § 4 | `src/context/AuthContext.jsx` |
| 路由、頁面切換、ProtectedRoute | 路由守衛和頁面導向 | frontend_spec.md § 3 | `src/App.jsx`、`src/components/ProtectedRoute.jsx` |
| Agent 列表、主控台、AgentHome | 首頁 Agent 列表 | frontend_spec.md § 5.2 | `src/components/AgentHome.jsx` |
| 精靈、Wizard、建立 Agent | 4 步驟建立 Agent | frontend_spec.md § 5.3 | `src/pages/WizardPage.jsx` |
| Step1、問卷、FAQ 生成、語氣 | 精靈步驟 1 | frontend_spec.md § 5.3 Step1 | `src/components/StepWizard.jsx` |
| Step2、審閱、confirm_setup | 精靈步驟 2 | frontend_spec.md § 5.3 Step2 | `src/components/StepReview.jsx` |
| Step3、Demo、測試聊天 | 精靈步驟 3 / 測試對話 | frontend_spec.md § 5.3 Step3 | `src/components/StepDemo.jsx` |
| Step4、部署說明 | 精靈步驟 4 | frontend_spec.md § 5.3 Step4 | `src/components/StepDeploy.jsx` |
| 後台、BackendDashboard、側邊欄 | Agent 管理後台 | frontend_spec.md § 5.4 | `src/components/BackendDashboard.jsx` |
| 子 Agent、subagent、toggle | 子 Agent 管理 | frontend_spec.md § 5.4 (1) | `src/components/BackendDashboard.jsx` |
| Playground、測試聊天 | 後台測試聊天 | frontend_spec.md § 5.4 (2) | `src/components/BackendDashboard.jsx` |
| LINE 整合、Telegram 整合、部署 | 渠道部署設定 | frontend_spec.md § 5.4 (3) | `src/components/BackendDashboard.jsx` |
| FAQ 管理、編輯 FAQ | FAQ 編輯介面 | frontend_spec.md § 5.4 (4) | `src/components/BackendDashboard.jsx` |
| 交接觸發、handoff | 交接條件設定 | frontend_spec.md § 5.4 (5) | `src/components/BackendDashboard.jsx` |
| 通知接收者、notify-user | 轉人工通知設定 | frontend_spec.md § 5.4 (5b) | `src/components/BackendDashboard.jsx` |
| 統計、Token 用量 | 數據統計 | frontend_spec.md § 5.4 (6) | `src/components/BackendDashboard.jsx` |
| CRM、客戶管理 | CRM 頁面 | frontend_spec.md § 5.4 (7) | `src/components/BackendDashboard.jsx` |
| 收件匣、Inbox、回覆 | 商家對話收件匣 | frontend_spec.md § 5.6 | `src/components/InboxView.jsx` |
| Landing Page、首次進入 | 未授權時入口頁 | frontend_spec.md § 5.1 | `src/components/FoundingPartnerLanding.jsx` |
| Monitor、監控、圖表 | Monitor 模組 | frontend_spec.md § 5.5 | `src/components/monitor/MonitorApp.jsx` |
| Monitor 紀錄 | 對話紀錄表格 | frontend_spec.md § 5.5 | `src/components/monitor/MonitorRecords.jsx` |
| Monitor 使用者 | 使用者管理 | frontend_spec.md § 5.5 | `src/components/monitor/MonitorUsers.jsx` |
| 環境變數、.env | 前端設定 | frontend_spec.md § 9 | `src/config.js` |
| API 呼叫清單 | 所有前端 API 呼叫 | frontend_spec.md § 7 | — |
| 狀態管理、Context、AuthContext | React Context 架構 | frontend_spec.md § 8 | `src/context/AuthContext.jsx` |
| 常數、ToneType、AppStep | 共用常數定義 | — | `src/types.js` |

---

## 路由速查

```
/ （需 Admin 授權 — ProtectedRoute）
├── /                    → AgentHome（Agent 列表）
├── /wizard/new          → WizardPage（新建 Agent）
├── /wizard/:agentId     → WizardPage（編輯 Agent）
└── /agent/:agentId/*    → BackendDashboard（Agent 管理後台）

/monitor （需 Monitor 授權 — MonitorRoute）
├── /monitor             → MonitorDashboard（用量圖表）
├── /monitor/records     → MonitorRecords（對話紀錄）
└── /monitor/users       → MonitorUsers（使用者管理）
```

---

## 檔案結構速查

```
src/
├── App.jsx                          # 路由入口
├── main.jsx                         # React 根 + GoogleOAuthProvider
├── config.js                        # API_URL 設定
├── types.js                         # 常數（AppStep, ToneType, DEFAULT_HANDOFF_OPTIONS）
├── index.css                        # Tailwind 引入
├── context/
│   └── AuthContext.jsx              # Google OAuth 認證 Context
├── pages/
│   └── WizardPage.jsx              # 精靈頁面容器
└── components/
    ├── AgentHome.jsx               # 主控台
    ├── BackendDashboard.jsx        # Agent 管理後台（最大元件）
    ├── FoundingPartnerLanding.jsx  # Landing Page + Google 登入
    ├── ProtectedRoute.jsx          # 路由守衛（Admin + Monitor）
    ├── StepWizard.jsx             # 精靈步驟 1：問卷
    ├── StepReview.jsx             # 精靈步驟 2：審閱 Prompt
    ├── StepDemo.jsx               # 精靈步驟 3：AI Demo
    ├── StepDeploy.jsx             # 精靈步驟 4：部署指引
    ├── InboxView.jsx              # 對話收件匣（LINE + Telegram）
    └── monitor/
        ├── MonitorApp.jsx          # Monitor 側邊欄佈局
        ├── MonitorDashboard.jsx    # 用量圖表
        ├── MonitorRecords.jsx      # 對話紀錄
        ├── MonitorUsers.jsx        # 使用者管理
        └── monitor.css            # Monitor 專用樣式
```

---

## 跨前後端功能參照

> 以下功能同時涉及前端與後端，需要兩邊文件配合查閱。

| 功能 | 前端 | 後端 |
|------|------|------|
| Google OAuth 登入 | `src/context/AuthContext.jsx` | `app/api/router.py`（`/api/admin/login`） |
| 語氣選項（4 種） | `src/types.js`（ToneType） | `app/prompts/templates.py` |
| FAQ 字數驗證 | `src/components/StepWizard.jsx` | `app/services/prompt_service.py` |
| 預設交接觸發條件 | `src/types.js` | `app/prompts/templates.py` |
| 聊天 Session 管理 | `src/components/StepDemo.jsx` | `app/services/agent_service.py` |
| Monitor 費率 | `MonitorDashboard.jsx` | `app/api/monitor_router.py`（PRICING） |
| 收件匣即時回覆 | `src/components/InboxView.jsx` | `app/api/inbox_router.py` |
