# 数据模型 · DATA_MODEL.md

> 所有表使用 PostgreSQL。命名风格：`snake_case`。所有表都带 `created_at / updated_at / created_by / updated_by`（除非另注），`id` 用 UUID 或自增 bigserial。

---

## 1. ER 总览

```
industries (24 个重点行业 · 字典表)
    ↓ (FK industry_code)
organizations (组织树 · ltree 路径)
    ↓ (FK org_id)
emission_entries (填报记录) ─────→ emission_factors (因子库)
    ↑ (FK category_code)              ↑ (FK category_code, industry_code)
emission_categories (8 类排放源 · 字典)

users / roles / user_org_roles (权限)
audit_logs (审计)
import_jobs (批量导入任务)
reports (生成的报告归档)
```

---

## 2. 表结构

### 2.1 `industries` — 行业字典
对应 `data.js` 的 `INDUSTRIES`，共 24 个重点行业（原型只展示 8 个，后端要补齐）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `varchar(20)` PK | 行业代码（POWER / STEEL / CHEMICAL / CEMENT / ALUMINUM / PAPER / TEXTILE / GENERAL ...） |
| `name` | `varchar(100)` | 中文名 |
| `guide` | `text` | 关联核算指南名称 |
| `sort` | `int` | 显示顺序 |

### 2.2 `emission_categories` — 排放类别字典
对应 `EMISSION_CATEGORIES`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `varchar(20)` PK | FUEL / PROCESS / FUGITIVE / ELEC / HEAT / TRANSPORT / WASTE / BUSINESS |
| `name` | `varchar(50)` | 中文名 |
| `scope` | `smallint` | 1 / 2 / 3 |
| `color` | `varchar(10)` | 展示色（如 `#d97757`） |
| `sort` | `int` | |

### 2.3 `organizations` — 组织树
对应 `ORG_TREE` / `ORG_FLAT`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `varchar(50)` UNIQUE | 组织编码（如 `ZL-PWR-SH01`），同租户唯一 |
| `name` | `varchar(200)` | |
| `level` | `smallint` | 1 集团 / 2 板块 / 3 子公司 / 4 厂区 |
| `parent_id` | `uuid` NULLABLE | FK organizations.id |
| `path` | `ltree` | 物化路径，如 `org001.org100.org110.org111`，便于子树查询 |
| `industry_code` | `varchar(20)` | FK industries.code |
| `standard` | `varchar(100)` | 核算标准（如 `ISO 14064-1 + 发电指南`） |
| `address` | `varchar(500)` | |
| `employees` | `int` | 员工人数 |
| `area` | `varchar(100)` NULLABLE | "集团总部"等 |
| `status` | `varchar(20)` | active / archived |
| `deleted_at` | `timestamp` NULLABLE | 软删除标记 |

**索引**：
- `CREATE INDEX idx_orgs_path ON organizations USING GIST (path);`
- `CREATE INDEX idx_orgs_parent ON organizations (parent_id);`
- `CREATE INDEX idx_orgs_industry ON organizations (industry_code);`

**关键查询**：
- 取组织及所有后代：`SELECT * FROM organizations WHERE path <@ (SELECT path FROM organizations WHERE id = $1)`
- 取直接子节点：`WHERE parent_id = $1`
- 取祖先链（面包屑）：`WHERE path @> (SELECT path FROM organizations WHERE id = $1) ORDER BY level`

### 2.4 `emission_factors` — 排放因子库
对应 `FACTORS`。**关键：同一逻辑因子有多版本**。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `varchar(10)` PK | 业务编码（F001, F002 ...） |
| `lineage_id` | `uuid` | 同源因子的家族 ID（同一逻辑因子的多个版本共享） |
| `name` | `varchar(200)` | 因子名称 |
| `category_code` | `varchar(20)` | FK emission_categories.code |
| `industry_code` | `varchar(20)` | FK industries.code，`GENERAL` 表示通用 |
| `value` | `numeric(20, 6)` | 因子值 |
| `unit` | `varchar(50)` | 如 `tCO2e/t`, `tCO2e/MWh`, `tCO2e/万Nm³` |
| `source` | `text` | 数据来源（指南名称） |
| `version` | `varchar(20)` | v1.0 / v2024.1 等 |
| `effective_date` | `date` | 生效日期 |
| `expiry_date` | `date` NULLABLE | 失效日期 |
| `standard` | `varchar(20)` | CHINA / ISO |
| `scope_type` | `varchar(20)` | general / industry |
| `status` | `varchar(20)` | enabled / disabled |
| `gwp_note` | `text` NULLABLE | GWP 说明（如 SF6=23500） |

**索引**：
- `CREATE INDEX idx_factors_lineage_date ON emission_factors (lineage_id, effective_date DESC);`
- `CREATE INDEX idx_factors_filters ON emission_factors (industry_code, category_code, status);`

**关键查询**：按报告期取生效因子
```sql
SELECT DISTINCT ON (lineage_id) *
FROM emission_factors
WHERE lineage_id = $1 AND effective_date <= $2 AND status = 'enabled'
ORDER BY lineage_id, effective_date DESC;
```

### 2.5 `emission_entries` — 填报记录
对应 `ENTRIES`。核心业务表，**数据量最大**。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `varchar(20)` PK | 业务编码（E000001...）或用 UUID |
| `org_id` | `uuid` | FK organizations.id |
| `period` | `varchar(7)` | `YYYY-MM` 报告期 |
| `period_type` | `varchar(10)` | month / quarter / year |
| `category_code` | `varchar(20)` | FK |
| `factor_id` | `varchar(10)` | FK，**填报时绑定的具体版本** |
| `quantity` | `numeric(20, 4)` | 活动数据 |
| `unit` | `varchar(50)` | 活动数据单位 |
| `factor_value` | `numeric(20, 6)` | **冗余字段**：填报时锁定的因子值（防因子改版影响历史） |
| `factor_unit` | `varchar(50)` | 同上 |
| `scope` | `smallint` | 1/2/3，冗余自 category，便于聚合 |
| `emission` | `numeric(20, 4)` | **计算字段**：quantity × factor_value（写入时算好） |
| `source` | `varchar(20)` | manual / import / api |
| `import_job_id` | `uuid` NULLABLE | 来自批量导入时记录 job |
| `status` | `varchar(20)` | draft / submitted / approved / rejected |
| `submit_at` | `timestamp` NULLABLE | |
| `approve_at` | `timestamp` NULLABLE | |
| `approve_by` | `uuid` NULLABLE | |
| `reject_reason` | `text` NULLABLE | |
| `remark` | `text` NULLABLE | |

**约束**：`UNIQUE (org_id, period, factor_id)` 避免同组织同月同因子重复填报。

**索引**：
- `CREATE INDEX idx_entries_org_period ON emission_entries (org_id, period);`
- `CREATE INDEX idx_entries_period ON emission_entries (period);`
- `CREATE INDEX idx_entries_scope ON emission_entries (scope);`
- `CREATE INDEX idx_entries_status ON emission_entries (status);`

### 2.6 `users` — 用户
| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` PK | |
| `username` | `varchar(50)` UNIQUE | |
| `name` | `varchar(50)` | 中文姓名（如"张芷涵"） |
| `email` | `varchar(100)` | |
| `password_hash` | `varchar(255)` | bcrypt |
| `avatar` | `varchar(500)` NULLABLE | |
| `status` | `varchar(20)` | active / disabled |
| `last_login_at` | `timestamp` | |

### 2.7 `roles` — 角色字典
预置：`super_admin`, `group_admin`, `sector_admin`, `subsidiary_admin`, `reporter`, `reviewer`, `viewer`

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `varchar(30)` PK | |
| `name` | `varchar(50)` | |
| `permissions` | `jsonb` | 操作权限位集合 |

### 2.8 `user_org_roles` — 用户在组织上的角色（数据权限核心表）
| 字段 | 类型 |
|---|---|
| `id` | `uuid` PK |
| `user_id` | `uuid` FK |
| `org_id` | `uuid` FK |
| `role_code` | `varchar(30)` FK |

逻辑：用户 X 在 org Y 上拥有 role Z，则有权访问 Y 及其所有后代的数据。

### 2.9 `audit_logs` — 审计日志
| 字段 | 类型 |
|---|---|
| `id` | `bigserial` PK |
| `user_id` | `uuid` |
| `user_name` | `varchar(50)` 冗余 |
| `action` | `varchar(50)` | CREATE / UPDATE / DELETE / IMPORT / EXPORT / SUBMIT / APPROVE / REJECT |
| `target_type` | `varchar(50)` | entry / factor / organization / report |
| `target_id` | `varchar(50)` | |
| `before` | `jsonb` NULLABLE | 变更前快照 |
| `after` | `jsonb` NULLABLE | 变更后快照 |
| `ip` | `varchar(45)` | |
| `created_at` | `timestamp` | |

### 2.10 `import_jobs` — 批量导入任务
对应原型里"导入结果"页面。

| 字段 | 类型 |
|---|---|
| `id` | `uuid` PK |
| `user_id` | `uuid` |
| `file_name` | `varchar(255)` |
| `file_path` | `varchar(500)` | 对象存储 key |
| `file_size` | `bigint` |
| `total_rows` | `int` |
| `success_count` | `int` |
| `failed_count` | `int` |
| `skipped_count` | `int` |
| `error_rows` | `jsonb` | `[{row, org, factor, col, reason}]` |
| `options` | `jsonb` | `{conflictPolicy, importStatus, validateRange}` |
| `status` | `varchar(20)` | pending / running / done / failed |
| `started_at` / `finished_at` | `timestamp` | |

### 2.11 `reports` — 报告归档
对应原型 "历史报告" 列表。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `varchar(20)` PK | 业务编号 `R-2025-001` |
| `title` | `varchar(500)` | |
| `org_id` | `uuid` | 报告主体 |
| `period` | `varchar(20)` | `2024` / `2024Q4` / `2024H2` |
| `period_start` / `period_end` | `varchar(7)` | YYYY-MM |
| `scope` | `varchar(20)` | self / consolidated |
| `standard` | `varchar(20)` | ISO / INDUSTRY / BOTH |
| `config` | `jsonb` | 完整生成参数（statement/reportTo/includeChart 等） |
| `snapshot` | `jsonb` | 当时的聚合数据快照（避免后续因子改动影响） |
| `pdf_path` | `varchar(500)` NULLABLE | PDF 文件路径 |
| `word_path` | `varchar(500)` NULLABLE | |
| `file_size` | `bigint` NULLABLE | |
| `status` | `varchar(20)` | draft / final |

---

## 3. 派生 / 物化视图

### 3.1 `mv_emission_summary_monthly` — 月度汇总
为看板聚合查询提速。

```sql
CREATE MATERIALIZED VIEW mv_emission_summary_monthly AS
SELECT
  org_id,
  period,
  scope,
  category_code,
  SUM(emission) AS total_emission,
  COUNT(*) AS entry_count
FROM emission_entries
WHERE status IN ('submitted', 'approved')
GROUP BY org_id, period, scope, category_code;

CREATE INDEX ON mv_emission_summary_monthly (org_id, period);
```
定时刷新（夜间 cron + 写入时增量刷新）。

### 3.2 后代聚合
看板要求"本组织 + 所有下属"，可用 CTE：
```sql
WITH descendants AS (
  SELECT id FROM organizations
  WHERE path <@ (SELECT path FROM organizations WHERE id = $1)
)
SELECT scope, SUM(emission) FROM emission_entries
WHERE org_id IN (SELECT id FROM descendants)
  AND period BETWEEN $2 AND $3
GROUP BY scope;
```

---

## 4. 种子数据

从 `prototype/data.js` 直接转：

| 原 JS 常量 | 目标表 | 数据量 |
|---|---|---|
| `INDUSTRIES` | `industries` | 8 行（补齐到 24 行） |
| `EMISSION_CATEGORIES` | `emission_categories` | 8 行 |
| `ORG_TREE` (递归展平) | `organizations` | 约 15 行 |
| `FACTORS` | `emission_factors` | 20 行 |
| `ENTRIES` | `emission_entries` | 约 600 行（12 月 × 8 末级组织 × 6 模板） |

**种子用户**（用于演示登录）：
- `zhangzihan / 张芷涵 / group_admin / org-001`
- `chenyanlin / 陈彦霖 / sector_admin / org-100`
- `limingzhe / 李铭哲 / reviewer / org-001`
- `wangxueting / 王雪婷 / reporter / org-111`

---

## 5. 数据完整性规则

1. **删除组织** → 检查 `emission_entries` 是否有引用：
   - 若有 → 拒绝硬删，转软删（`deleted_at = now()`）；同时递归软删后代
   - 若无 → 可硬删
2. **删除因子** → 检查 `emission_entries.factor_id` 是否有引用：
   - 若有 → 仅允许"停用"（status=disabled），不可删
3. **填报记录**：
   - `status=approved` 后不可改、不可删（除非有 `admin` 角色 + 走撤销审核流程）
   - 同 `(org_id, period, factor_id)` 唯一
4. **因子改版**：
   - 旧版本不删，状态置 `disabled`，新版本 `enabled`
   - 已有 entry 的 `factor_value` 字段保持锁定（不重算）
