# 组织碳管理系统 · 后端开发交接包

> 给 Claude Code 的指令：本目录是**前端原型 + 完整后端实现规范**。请阅读完本文件与 `DATA_MODEL.md`、`API.md`、`FRONTEND_INTEGRATION.md` 后，按"推荐技术栈"实现后端，并把 `prototype/` 内的前端代码接入真实 API。

---

## 1. 项目概述

**产品**：面向多行业集团（电力 / 钢铁 / 化工 / 水泥等重点行业）的温室气体排放核算与报告平台。

**核心能力**：
1. **多层级组织管理**（集团 → 板块 → 子公司 → 厂区，4 级树）
2. **排放因子库**（国家行业指南 + ISO 14064-1，含版本/生效日期管理）
3. **数据填报**（手工 + 批量导入 Excel）
4. **数据看板**（按范围/类别/月份/组织 多维度聚合）
5. **报告生成**（独立 / 合并报告，PDF 风格预览）

**核算标准**：ISO 14064-1:2018 + 24 个国家重点行业核算指南。
**核算公式**：`排放量 (tCO2e) = 活动数据 × 排放因子 × GWP`

---

## 2. 关于这份交接包

`prototype/` 目录里的 HTML/JSX/CSS 是**设计参考与功能规格**，不是要部署的生产代码。它是用浏览器原生 React（Babel in-browser）+ 纯前端 mock 数据实现的高保真原型——你可以打开 `prototype/index.html` 直接在浏览器中跑起来体验全部交互。

**你的任务**：
1. **实现后端**：按 `DATA_MODEL.md` 建表，按 `API.md` 写 REST 接口
2. **改造前端**：把 `prototype/` 里的 React 代码迁移到一个真正的工程项目（Vite + React + TS），把 `window.__CARBON_DATA` 这层 mock 替换为真实 API 调用
3. **部署**：前端 + 后端 + 数据库部署到目标服务器

**保真度**：🟢 **高保真（hi-fi）**——颜色、间距、字号、组件状态、交互全部是最终态，请像素级还原。视觉系统基于 Element UI 风格 + 绿色碳主题。

---

## 3. 推荐技术栈

如果用户没指定，按下面这套来。这套与原型代码最契合，迁移成本最低：

### 前端
- **框架**：Vite + React 18 + TypeScript
- **路由**：React Router v6（替代当前的 hash 路由）
- **状态**：React Context（已有 OrgProvider 模式，照搬即可）+ TanStack Query（用于服务端状态缓存）
- **UI 组件库**：保留现有自研组件（Button/Table/Modal/Tree 等都已写好且 Element UI 风格统一），**不要换成 Ant Design 或别的库**——会破坏视觉一致性
- **图表**：保留现有的纯 SVG 图表（Doughnut/StackedBar/HBar/Line），轻量、可打印、零依赖
- **HTTP**：axios 或 fetch + 简单封装

### 后端
- **首选**：Node.js + NestJS + TypeORM + PostgreSQL（与前端同语言，类型可共享）
- **备选**：Python + FastAPI + SQLAlchemy + PostgreSQL（团队熟 Python 时）
- **备选**：Go + Gin + GORM + PostgreSQL（重性能时）

### 数据库
- **PostgreSQL 15+**（用其 `ltree` 扩展存组织树最合适；JSONB 存附录配置）
- Redis（可选，用于报告生成缓存与异步任务）

### 部署
- 前端：Nginx 静态托管 / Vercel
- 后端：Docker + Docker Compose（最简单），或 K8s
- 文件存储：本地卷 / S3 兼容对象存储（用于 Excel 导入文件与报告 PDF）
- 报告 PDF 生成：服务端用 Puppeteer 或 Playwright 渲染 HTML 转 PDF（前端已有打印样式 `@media print`）

---

## 4. 实施步骤

### Step 1 — 跑通原型
```bash
cd prototype
# 任何静态服务器都行
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```
点遍所有页面，理解每个交互。**这是后端要支撑的全部功能**。

### Step 2 — 搭后端骨架
1. `pnpm create nest carbon-backend` 或对应命令
2. 配 PostgreSQL 连接
3. 按 `DATA_MODEL.md` 创建 Entity + Migration
4. **种子数据**：把 `prototype/data.js` 里的 `ORG_TREE`、`FACTORS`、`INDUSTRIES`、`EMISSION_CATEGORIES`、`ENTRIES` 全部转成 seed.sql 或 NestJS seeder
5. 按 `API.md` 逐个实现接口
6. 加 JWT 认证（前端原型里假装登录的"张芷涵"，后端要做真正的 user 表 + 登录接口）

### Step 3 — 迁移前端
1. `pnpm create vite carbon-frontend --template react-ts`
2. 把 `prototype/styles.css` 复制过来（无需改动）
3. 把所有 `.jsx` 改成 `.tsx`，按 `FRONTEND_INTEGRATION.md` 的对照表给类型
4. 新建 `src/api/` 目录封装 axios，每个模块一个 service 文件
5. 把 `window.__CARBON_DATA` 的访问全部替换成 API 调用 + TanStack Query
6. `hashchange` 路由改成 React Router

### Step 4 — 报告 PDF 生成
- 前端"打印 / 另存为 PDF"按钮已可用（`window.print()` + 已有 `@media print` 样式）
- "导出为 PDF"按钮：后端起 Puppeteer，加载报告预览页（带 token），等渲染完成后 `page.pdf()` 返回二进制流

### Step 5 — 批量导入
- 前端选 Excel → 上传到后端 `/api/entries/import`
- 后端用 `exceljs`（Node）或 `openpyxl`（Python）解析
- 逐行按 `API.md` 中的校验规则验证，返回 `{ total, success, failed, errorRows: [...] }`
- 校验通过的行批量 insert

### Step 6 — 部署
- `docker-compose.yml`：postgres + backend + nginx(frontend) + redis
- 生产环境：HTTPS、CORS 白名单、CSP、SQL 注入防护（用 ORM 参数化）、文件上传大小限制 10MB

---

## 5. 关键技术决策与注意点

### 5.1 组织树
- 4 级最大深度，但代码要兼容 N 级（前端 `orgDepth` Tweak 可切换 2/3/4 级显示）
- 用 PostgreSQL `ltree` 字段 `path ltree` 存路径（如 `org001.org100.org110.org111`），后代查询 `WHERE path <@ '...'` 比递归 CTE 高效
- 组织删除：**软删除**，并校验"是否有关联填报数据"——前端 confirm 文案已写明"删除组织将同时移除其下级组织和所有关联填报数据"，后端要么级联删要么拒绝（建议级联软删 + 给前端选项）

### 5.2 排放因子版本管理
- 每个因子有 `effectiveDate` 和 `version`，同一逻辑因子（如"华东电网电力"）会有多版本
- 数据填报时，根据 `entry.period` 自动选当时生效的因子版本
- 用 `factor_lineage_id`（同源因子的 UUID）+ `effective_date` 实现：`SELECT ... WHERE lineage = ? AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1`

### 5.3 排放量计算
- 写入 entry 时**计算并存储** `emission` 字段（不要每次查询都算）
- 因子变更时，已有 entry 不重算（保留历史）；如需重算，加专门的"重算任务"接口
- GWP 已包含在因子值里（如 SF6 因子 = 23500 tCO2e/t，N2O 硝酸生产 = 7.5 tCO2e/t）

### 5.4 多租户（如果未来要支持）
- 现在原型是单租户。如果要做 SaaS，所有表加 `tenant_id`，所有查询自动注入 WHERE 条件

### 5.5 权限模型
- 角色：超级管理员 / 集团 ESG 管理员 / 板块管理员 / 子公司管理员 / 厂区填报员 / 审核员
- 数据权限：按 `org_id` 控制——用户只能看到 `path <@ his_root_org_path` 的组织数据
- 操作权限：填报员只能填本组织、审核员能审本组织及下级、管理员能配置因子库

### 5.6 审计日志
- 关键表（entries / factors / organizations）都要有 `create_by/create_at/update_by/update_at`
- 推荐加 `audit_logs` 表记录所有写操作，前端"历史版本"接口要用

---

## 6. 文件清单

```
design_handoff_carbon_management/
├── README.md              ← 你正在看的文件
├── DATA_MODEL.md          ← 所有表结构 + 字段含义 + 索引
├── API.md                 ← 完整 REST API 契约（每个端点入参/出参/校验）
├── FRONTEND_INTEGRATION.md ← 前端代码改造对照表
└── prototype/             ← 可运行的高保真前端原型
    ├── index.html
    ├── styles.css         ← 全部视觉令牌与组件样式（直接复用）
    ├── app.jsx            ← 主应用 + Tweaks 面板
    ├── shell.jsx          ← Header / Sidebar / Org Switcher
    ├── ui.jsx             ← Button/Table/Modal/Tree/Form 等基础组件
    ├── data.js            ← Mock 数据（含完整组织树、因子库、12 月填报）
    ├── page-dashboard.jsx ← 数据看板
    ├── page-data.jsx      ← 填报 + 批量导入
    ├── page-factor-org.jsx ← 因子库 + 组织管理
    ├── page-report.jsx    ← 报告生成（含 PDF 预览）
    └── tweaks-panel.jsx   ← 主题切换面板（开发期保留即可）
```

---

## 7. 验收清单

后端部署后，前端 6 个页面要全部可用：

- [ ] 登录 / 退出
- [ ] **数据看板**：总排放、范围/类别/月度/下属组织 全部展示真实数据
- [ ] **数据填报**：列表 + 筛选 + 分页 + 新增 + 编辑 + 删除 + 计算预览
- [ ] **批量导入**：Excel 上传 → 解析 → 校验报错 → 批量入库
- [ ] **排放因子库**：列表 + CRUD + 启停 + 历史版本查看 + 批量导入
- [ ] **组织管理**：树形列表 + 新增子组织 + 编辑 + 删除（含校验）
- [ ] **报告生成**：参数配置 → 实时预览 → 导出 PDF / Word → 历史归档

---

## 8. 启动开发会话建议

打开 Claude Code 时第一句这样说：

> 我有一个组织碳管理系统的前端原型和完整规格文档。请：
> 1. 读 `README.md`、`DATA_MODEL.md`、`API.md`
> 2. 用推荐技术栈（NestJS + PostgreSQL + Vite/React/TS）搭项目骨架
> 3. 按 `DATA_MODEL.md` 建表 + seeder（数据从 `prototype/data.js` 转过来）
> 4. 按 `API.md` 实现接口，先实现 GET 类的，再做 CRUD
> 5. 按 `FRONTEND_INTEGRATION.md` 迁移前端代码
> 6. 给我 docker-compose 部署方案

Claude Code 会一步步落地。
