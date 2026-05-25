-- 001_init.sql  — 全量建表
-- 执行方式: psql $DATABASE_URL -f 001_init.sql

-- ── 行业字典 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industries (
  code    VARCHAR(20) PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  guide   TEXT,
  sort    INT DEFAULT 0
);

-- ── 排放类别字典 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emission_categories (
  code   VARCHAR(20) PRIMARY KEY,
  name   VARCHAR(50) NOT NULL,
  scope  SMALLINT NOT NULL,
  color  VARCHAR(10),
  sort   INT DEFAULT 0
);

-- ── 组织树 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id             UUID PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,
  name           VARCHAR(200) NOT NULL,
  level          SMALLINT NOT NULL,
  parent_id      UUID REFERENCES organizations(id),
  path           TEXT,
  industry_code  VARCHAR(20) REFERENCES industries(code),
  standard       VARCHAR(100),
  address        VARCHAR(500),
  employees      INT,
  area           VARCHAR(100),
  status         VARCHAR(20) DEFAULT 'active',
  deleted_at     TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  created_by     VARCHAR(100),
  updated_by     VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_orgs_parent   ON organizations (parent_id);
CREATE INDEX IF NOT EXISTS idx_orgs_industry ON organizations (industry_code);
CREATE INDEX IF NOT EXISTS idx_orgs_path     ON organizations (path);

-- ── 排放因子库 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emission_factors (
  id             VARCHAR(10) PRIMARY KEY,
  lineage_id     UUID NOT NULL,
  name           VARCHAR(200) NOT NULL,
  category_code  VARCHAR(20) REFERENCES emission_categories(code),
  industry_code  VARCHAR(20) DEFAULT 'GENERAL',
  value          NUMERIC(20,6) NOT NULL,
  unit           VARCHAR(50) NOT NULL,
  source         TEXT,
  version        VARCHAR(20),
  effective_date DATE NOT NULL,
  expiry_date    DATE,
  standard       VARCHAR(20) DEFAULT 'ISO',
  scope_type     VARCHAR(20) DEFAULT 'general',
  status         VARCHAR(20) DEFAULT 'enabled',
  gwp_note       TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  created_by     VARCHAR(100),
  updated_by     VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_factors_lineage ON emission_factors (lineage_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_factors_filters ON emission_factors (industry_code, category_code, status);

-- ── 填报记录 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emission_entries (
  id             VARCHAR(20) PRIMARY KEY,
  org_id         UUID NOT NULL REFERENCES organizations(id),
  period         VARCHAR(7) NOT NULL,
  period_type    VARCHAR(10) DEFAULT 'month',
  category_code  VARCHAR(20) REFERENCES emission_categories(code),
  factor_id      VARCHAR(10) REFERENCES emission_factors(id),
  quantity       NUMERIC(20,4) NOT NULL,
  unit           VARCHAR(50),
  factor_value   NUMERIC(20,6) NOT NULL,
  factor_unit    VARCHAR(50),
  scope          SMALLINT NOT NULL,
  emission       NUMERIC(20,4) NOT NULL,
  source         VARCHAR(20) DEFAULT 'manual',
  import_job_id  UUID,
  status         VARCHAR(20) DEFAULT 'draft',
  submit_at      TIMESTAMP,
  approve_at     TIMESTAMP,
  approve_by     UUID,
  reject_reason  TEXT,
  remark         TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  created_by     VARCHAR(100),
  updated_by     VARCHAR(100),
  UNIQUE (org_id, period, factor_id)
);
CREATE INDEX IF NOT EXISTS idx_entries_org_period ON emission_entries (org_id, period);
CREATE INDEX IF NOT EXISTS idx_entries_period      ON emission_entries (period);
CREATE INDEX IF NOT EXISTS idx_entries_scope       ON emission_entries (scope);
CREATE INDEX IF NOT EXISTS idx_entries_status      ON emission_entries (status);

-- ── 用户 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY,
  username       VARCHAR(50) UNIQUE NOT NULL,
  name           VARCHAR(50) NOT NULL,
  email          VARCHAR(100),
  password_hash  VARCHAR(255) NOT NULL,
  avatar         VARCHAR(500),
  status         VARCHAR(20) DEFAULT 'active',
  last_login_at  TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ── 角色字典 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  code        VARCHAR(30) PRIMARY KEY,
  name        VARCHAR(50),
  permissions JSONB DEFAULT '{}'
);
INSERT INTO roles (code, name) VALUES
  ('super_admin',      '超级管理员'),
  ('group_admin',      '集团ESG管理员'),
  ('sector_admin',     '板块管理员'),
  ('subsidiary_admin', '子公司管理员'),
  ('reporter',         '填报员'),
  ('reviewer',         '审核员'),
  ('viewer',           '查看员')
ON CONFLICT (code) DO NOTHING;

-- ── 用户组织角色 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_org_roles (
  id        UUID PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES users(id),
  org_id    UUID NOT NULL REFERENCES organizations(id),
  role_code VARCHAR(30) REFERENCES roles(code)
);

-- ── 审计日志 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  user_name   VARCHAR(50),
  action      VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id   VARCHAR(50) NOT NULL,
  before      JSONB,
  after       JSONB,
  ip          VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── 批量导入任务 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id            UUID PRIMARY KEY,
  user_id       UUID,
  file_name     VARCHAR(255),
  file_path     VARCHAR(500),
  file_size     BIGINT,
  total_rows    INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count  INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  error_rows    JSONB DEFAULT '[]',
  options       JSONB DEFAULT '{}',
  status        VARCHAR(20) DEFAULT 'pending',
  started_at    TIMESTAMP,
  finished_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── 报告归档 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           VARCHAR(20) PRIMARY KEY,
  title        VARCHAR(500),
  org_id       UUID REFERENCES organizations(id),
  period       VARCHAR(20),
  period_start VARCHAR(7),
  period_end   VARCHAR(7),
  scope        VARCHAR(20) DEFAULT 'self',
  standard     VARCHAR(20) DEFAULT 'ISO',
  config       JSONB DEFAULT '{}',
  snapshot     JSONB,
  pdf_path     VARCHAR(500),
  word_path    VARCHAR(500),
  file_size    BIGINT,
  status       VARCHAR(20) DEFAULT 'draft',
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  created_by   VARCHAR(100)
);
