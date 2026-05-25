# REST API 契约 · API.md

> 基础前缀：`/api/v1`
> 认证：`Authorization: Bearer <JWT>`
> 响应统一格式：
> ```json
> { "code": 0, "data": {...}, "message": "ok" }
> ```
> 错误：`{ "code": 40001, "data": null, "message": "组织编码已存在" }`
> 分页响应：`{ "code": 0, "data": { "list": [...], "total": 124, "page": 1, "pageSize": 10 } }`

---

## 0. 认证

### `POST /api/v1/auth/login`
入参：`{ "username": "zhangzihan", "password": "..." }`
出参：`{ "token": "...", "user": { "id", "name", "username", "avatar", "roles": [...], "orgScope": [orgId...] } }`

### `POST /api/v1/auth/logout`
### `GET /api/v1/auth/me` — 当前用户信息

---

## 1. 字典接口

### `GET /api/v1/dict/industries`
→ `[{ "code": "POWER", "name": "电力（发电）", "guide": "..." }, ...]`

### `GET /api/v1/dict/categories`
→ `[{ "code": "FUEL", "name": "化石燃料燃烧", "scope": 1, "color": "#d97757" }, ...]`

---

## 2. 组织管理

> 前端文件：`shell.jsx`（OrgSwitcher）+ `page-factor-org.jsx`（Organization）

### `GET /api/v1/organizations/tree`
查询参数：`?depthLimit=4`
出参：嵌套树
```json
{
  "id": "org-001", "code": "ZL-GROUP", "name": "中绿能源控股集团",
  "level": 1, "industry": "GENERAL", "address": "...", "employees": 12480,
  "standard": "ISO 14064-1:2018",
  "children": [ ... 递归 ... ]
}
```

### `GET /api/v1/organizations`
查询：`?keyword=&industry=&parentId=&page=1&pageSize=20`
出参：扁平列表（含 `parentId`, `parentName`）

### `GET /api/v1/organizations/:id`
出参：单个组织详情 + `parentName` + `path` 面包屑数组 + `descendantCount`

### `GET /api/v1/organizations/:id/descendants`
→ 该组织所有后代（含自身）的扁平列表（用于看板聚合范围）

### `GET /api/v1/organizations/:id/children`
→ 直接子组织

### `POST /api/v1/organizations`
入参：
```json
{
  "code": "ZL-NEW", "name": "新组织", "parentId": "org-100",
  "industry": "POWER", "standard": "ISO 14064-1 + 发电指南",
  "address": "...", "employees": 100
}
```
校验：
- `code` 必填，正则 `^[A-Za-z0-9-]+$`，租户内唯一
- `name` 必填
- `parentId` 必须存在（除集团根节点）
- `level` 由后端根据 parent.level + 1 算出，最大 4

### `PUT /api/v1/organizations/:id`
同上字段，`code` 不允许改（或限超管）

### `DELETE /api/v1/organizations/:id`
- 集团根节点（level=1）不可删
- 有关联 entries 时返回确认提示，前端 confirm 后传 `?cascade=true` 软删整棵子树
- 删除会软删（`deleted_at = now()`）

---

## 3. 排放因子库

> 前端文件：`page-factor-org.jsx` (FactorLibrary)

### `GET /api/v1/factors`
查询：`?industry=&category=&standard=&status=&keyword=&page=1&pageSize=10`
出参分页列表，单条结构同 `data.js` 中 FACTORS。

### `GET /api/v1/factors/:id`

### `GET /api/v1/factors/:id/history`
→ 同 lineage_id 的所有版本数组（用于"历史版本"弹窗）

### `POST /api/v1/factors`
入参：
```json
{
  "name": "天然气燃烧", "categoryCode": "FUEL", "industryCode": "GENERAL",
  "value": 21.622, "unit": "tCO2e/万Nm³",
  "source": "《省级温室气体清单编制指南》",
  "version": "v3.0", "effectiveDate": "2024-01-01",
  "standard": "ISO", "scopeType": "general"
}
```
校验：
- `value > 0`
- `name`, `unit`, `source`, `version`, `effectiveDate` 必填
- 自动生成 `id` (F021...) 与 `lineage_id`（新因子）；如果想"加新版本"，前端传 `lineageId` 字段

### `PUT /api/v1/factors/:id`
### `PATCH /api/v1/factors/:id/status` → `{ "status": "enabled" | "disabled" }`
### `DELETE /api/v1/factors/:id` — 有 entry 引用时返回 409

### `POST /api/v1/factors/import` — 批量导入
form-data: `file=<.xlsx>`
出参：`{ total, success, failed, errorRows: [...] }`

### `GET /api/v1/factors/export` — 导出 xlsx（二进制流）

### `GET /api/v1/factors/template` — 下载导入模板

### `GET /api/v1/factors/recommended?orgId=&categoryCode=`
→ 根据组织行业 + 类别推荐适用因子，按"行业专用优先"排序（前端填报弹窗用）

---

## 4. 填报数据

> 前端文件：`page-data.jsx` (DataEntry / DataImport)

### `GET /api/v1/entries`
查询：
```
?orgId=&includeDescendants=true
&period=&periodStart=&periodEnd=
&scope=&category=&status=&keyword=
&page=1&pageSize=10
```
**关键**：`includeDescendants=true` 时后端取该组织及所有后代的 entries。

出参单条结构同 `ENTRIES`：
```json
{
  "id": "E000123", "orgId": "...", "orgName": "...", "orgCode": "...",
  "period": "2025-04", "periodType": "month",
  "categoryCode": "FUEL", "scope": 1,
  "factorId": "F001", "factorName": "...",
  "quantity": 12000.5, "unit": "t",
  "factorValue": 2.6612, "factorUnit": "tCO2e/t",
  "emission": 31934.4, "source": "manual",
  "status": "submitted",
  "createBy": "张芷涵", "createDate": "2025-04-08 14:23:08",
  "updateBy": "张芷涵", "updateDate": "2025-04-09 16:42:11"
}
```

### `GET /api/v1/entries/:id`

### `POST /api/v1/entries`
入参：
```json
{
  "orgId": "...", "period": "2025-04",
  "categoryCode": "FUEL", "factorId": "F001",
  "quantity": 12000.5, "status": "draft" | "submitted"
}
```
后端逻辑：
1. 校验：`orgId` / `period` / `factorId` 存在；`quantity > 0` 且 `< 1e8`；同 `(orgId, period, factorId)` 不重复
2. 查 factor → 锁定 `factor_value` / `factor_unit` / `scope` / `category` 到 entry
3. 计算 `emission = quantity * factor_value`
4. 写入 + 审计日志

### `PUT /api/v1/entries/:id`
- `status=approved` 的不可改

### `DELETE /api/v1/entries/:id`
- `status=approved` 的不可删

### `POST /api/v1/entries/:id/submit` — 草稿 → 待审核
### `POST /api/v1/entries/:id/approve` — 审核通过（需 reviewer 角色）
### `POST /api/v1/entries/:id/reject` — `{ "reason": "..." }`

### `POST /api/v1/entries/import` — 批量导入
form-data:
- `file=<.xlsx>`
- `conflictPolicy=skip|update|error`
- `importStatus=draft|submitted`
- `validateRange=true`

出参（同原型 mock）：
```json
{
  "jobId": "uuid",
  "total": 124, "success": 118, "failed": 6, "skipped": 0,
  "errorRows": [
    { "row": 12, "org": "ZL-PWR-TS01", "factor": "F099", "reason": "排放因子编码不存在", "col": "F (排放因子编码)" },
    ...
  ]
}
```
**校验规则**（全部要实现）：
- 必填列不为空：组织编码 / 报告期 / 排放因子编码 / 活动数据
- 组织编码存在且当前用户有权访问
- 报告期格式 `YYYY-MM`（非 `2025/04`）
- 排放因子编码存在 + 在该报告期生效
- 活动数据是数值，> 0
- 数值不超 `1e8`（异常上限）
- `validateRange=true` 时：超出行业典型范围 10x 的标记为 warning（先入库后标），不算 fail

### `POST /api/v1/entries/import/error-report` — 下载错误明细 xlsx
入参：`{ "jobId": "..." }` → 二进制流

### `GET /api/v1/entries/import/template?industry=POWER`
→ 下载模板 xlsx（含示例数据）

### `GET /api/v1/entries/export` — 导出当前筛选 xlsx

---

## 5. 数据看板聚合

> 前端文件：`page-dashboard.jsx`

### `GET /api/v1/dashboard/overview`
查询：`?orgId=&periodStart=&periodEnd=&compareWith=prior|none`
出参：
```json
{
  "orgInfo": {
    "id": "...", "name": "...", "code": "...", "industry": "POWER",
    "standard": "ISO 14064-1 + 发电指南", "employees": 5240
  },
  "period": { "start": "2024-06", "end": "2025-05" },
  "total": 12345678.5,
  "byScope": { "1": 6_000_000, "2": 4_500_000, "3": 1_845_678.5 },
  "byCategory": [
    { "code": "FUEL", "name": "化石燃料燃烧", "scope": 1, "value": 5_200_000, "color": "#d97757" },
    ...
  ],
  "byMonth": [
    { "period": "2024-06", "s1": ..., "s2": ..., "s3": ..., "total": ... },
    ... 12 个
  ],
  "bySubOrg": [
    { "id": "...", "name": "...", "level": 2, "total": ..., "byScope": {...} },
    ...
  ],
  "stats": {
    "entryCount": 1248,
    "manualCount": 812,
    "descendantCount": 14,
    "leafCount": 8,
    "intensity": 2.81,  // tCO2e/人
    "deltaPercent": -8.5  // 较 compareWith 周期变化
  },
  "benchmark": {
    "industry": "POWER",
    "self": 2.81, "leading": 1.96, "average": 3.45, "lagging": 5.12,
    "vsAverage": -18.5, "vsLeading": 43.4
  }
}
```

### `GET /api/v1/dashboard/trend?orgId=&groupBy=month|quarter|year`
→ 时间序列（看板趋势图）

---

## 6. 报告

> 前端文件：`page-report.jsx`

### `POST /api/v1/reports/preview`
入参（同原型 `config` 对象）：
```json
{
  "orgId": "org-001",
  "scope": "self" | "consolidated",
  "reportPeriod": "2024" | "2024Q4" | "2024H2",
  "standard": "ISO" | "INDUSTRY" | "BOTH",
  "title": "",
  "reportTo": "集团 ESG 委员会",
  "statement": "...",
  "showLogo": true, "includeChart": true,
  "includeBenchmark": true, "includeAppendix": true
}
```
出参：`{ "snapshot": {...完整聚合数据...} }` — 前端用这个数据渲染 `<ReportPreview>` 组件

### `POST /api/v1/reports` — 生成并归档
同 preview 入参，但生成 `reports` 记录并返回 `{ "id": "R-2025-005", ... }`

### `GET /api/v1/reports` — 历史列表（含分页）

### `GET /api/v1/reports/:id`

### `GET /api/v1/reports/:id/pdf` — 下载 PDF
后端用 Puppeteer：
1. 起 headless Chrome
2. `page.goto(internal_preview_url + ?token=xxx&reportId=xxx)`
3. `await page.pdf({ format: 'A4', printBackground: true })`
4. 缓存到对象存储，下次直接读
5. 返回二进制流，`Content-Disposition: attachment; filename=xxx.pdf`

### `GET /api/v1/reports/:id/word` — 下载 Word（docx-templater）

### `DELETE /api/v1/reports/:id`

---

## 7. 审计日志

### `GET /api/v1/audit-logs`
查询：`?userId=&action=&targetType=&from=&to=&page=&pageSize=`

### `GET /api/v1/audit-logs/:targetType/:targetId` — 某条记录的所有变更

---

## 8. 用户与权限（可选 v1.1）

### `GET /api/v1/users`
### `POST /api/v1/users`
### `PUT /api/v1/users/:id`
### `POST /api/v1/users/:id/roles` — `{ orgId, roleCode }`

---

## 9. 文件上传

### `POST /api/v1/uploads`
form-data: `file`, `type=import_excel|factor_excel|avatar`
→ `{ "path": "uploads/...", "url": "..." }`

---

## 10. 通用错误码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 40001 | 参数校验失败 |
| 40101 | 未登录 / token 过期 |
| 40301 | 无权访问该组织/资源 |
| 40401 | 资源不存在 |
| 40901 | 资源冲突（重复编码等） |
| 42201 | 业务规则失败（如已审核不可删） |
| 50001 | 服务器错误 |

错误响应示例：
```json
{
  "code": 40001,
  "data": { "field": "code", "rule": "unique" },
  "message": "组织编码 ZL-PWR-SH01 已存在"
}
```

---

## 11. CORS / 安全

- CORS 白名单只允许前端域名
- 所有写接口检查 `Authorization` 头
- 所有按 orgId 查询的接口检查用户对该 org 的访问权限：`org.path <@ user.scope_path`
- 文件上传：限制扩展名（.xlsx .xls .csv .png .jpg），单文件 ≤ 10MB
- SQL 注入：用 ORM 参数化查询，绝不拼字符串
- XSS：输入字段 trim + 长度限制；前端展示 React 默认转义
