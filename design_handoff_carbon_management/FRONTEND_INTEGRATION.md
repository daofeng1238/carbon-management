# 前端代码迁移指南 · FRONTEND_INTEGRATION.md

> 目标：把 `prototype/` 里的浏览器内 React + Babel 原型，迁移到 Vite + React + TS 工程项目，并把 mock 数据层 (`window.__CARBON_DATA`) 换成真实 API 调用。

---

## 1. 工程初始化

```bash
pnpm create vite carbon-frontend --template react-ts
cd carbon-frontend
pnpm add react-router-dom @tanstack/react-query axios dayjs
pnpm add -D @types/node
```

目录结构建议：
```
src/
├── api/                    # API 封装层
│   ├── client.ts           # axios 实例
│   ├── auth.ts
│   ├── organizations.ts
│   ├── factors.ts
│   ├── entries.ts
│   ├── dashboard.ts
│   └── reports.ts
├── components/             # 从 ui.jsx 拆出来
│   ├── Button.tsx
│   ├── Table.tsx
│   ├── Modal.tsx
│   ├── Tree.tsx
│   ├── Tabs.tsx
│   ├── Form/
│   ├── Icon.tsx
│   ├── Tag.tsx
│   ├── StatusTag.tsx
│   └── Toast.tsx
├── layout/                 # 从 shell.jsx 拆
│   ├── AppShell.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── OrgSwitcher.tsx
│   └── PageHeader.tsx
├── pages/                  # 每个页面一个目录
│   ├── Dashboard/
│   ├── DataEntry/
│   ├── DataImport/
│   ├── FactorLibrary/
│   ├── Organization/
│   └── Report/
├── contexts/
│   ├── AuthContext.tsx
│   └── OrgContext.tsx
├── types/                  # TS 类型
│   ├── organization.ts
│   ├── factor.ts
│   ├── entry.ts
│   └── report.ts
├── utils/
│   ├── format.ts           # fmt, fmtT, fmtPct
│   └── industry.ts         # getIndustryShort
├── styles/
│   └── globals.css         # 直接复制 prototype/styles.css
├── App.tsx
└── main.tsx
```

---

## 2. 关键替换对照表

### 2.1 路由：hash → React Router

**原型** (`app.jsx`)：
```js
function useHashRoute() { /* listens to hashchange */ }
location.hash = 'data-entry';
```

**生产**：
```tsx
// App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<AppShell />}>
      <Route index element={<Navigate to="/dashboard" />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="data-entry" element={<DataEntry />} />
      <Route path="data-import" element={<DataImport />} />
      <Route path="factor-library" element={<FactorLibrary />} />
      <Route path="organization" element={<Organization />} />
      <Route path="report" element={<ReportPage />} />
    </Route>
    <Route path="/login" element={<Login />} />
  </Routes>
</BrowserRouter>
```

Sidebar 用 `<NavLink to="..." />` 替代 `<a href="#...">`。

### 2.2 全局数据：`window.__CARBON_DATA` → API + Query

**原型**：
```js
const D = window.__CARBON_DATA;
const cur = D.aggregate(orgId, periodFilter);
```

**生产**：
```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardOverview } from '@/api/dashboard';

function Dashboard() {
  const { orgId } = useOrg();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', orgId],
    queryFn: () => fetchDashboardOverview({ orgId, ...periodFilter }),
  });
  if (isLoading) return <Skeleton />;
  // data.total, data.byScope, data.byMonth ...（结构同 API.md）
}
```

### 2.3 API client

```ts
// src/api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => {
    if (res.data.code !== 0) {
      throw new ApiError(res.data.code, res.data.message);
    }
    return res.data.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

```ts
// src/api/entries.ts
export const fetchEntries = (params: EntryListParams) =>
  api.get<EntryListResp>('/entries', { params });
export const createEntry = (body: EntryCreateBody) =>
  api.post<Entry>('/entries', body);
export const updateEntry = (id: string, body: EntryUpdateBody) =>
  api.put<Entry>(`/entries/${id}`, body);
export const deleteEntry = (id: string) =>
  api.delete(`/entries/${id}`);
```

### 2.4 组织上下文

`prototype/shell.jsx` 的 `OrgProvider` 几乎可以直接搬，把 `D.ORG_FLAT` 这些调用换成 `useQuery(['orgTree'], fetchOrgTree)`。

```tsx
// contexts/OrgContext.tsx
export function OrgProvider({ children }) {
  const { data: tree } = useQuery({ queryKey: ['orgTree'], queryFn: fetchOrgTree });
  const [orgId, setOrgId] = useState<string | null>(null);
  // 首次加载完后默认选 root
  useEffect(() => { if (tree && !orgId) setOrgId(tree.id); }, [tree]);
  // ...flatten / path / descendants 都用 useMemo 算
}
```

### 2.5 表单：把 mock 提交换成 mutation

**原型**：
```js
const handleSubmit = (data) => {
  setEntries(prev => [newEntry, ...prev]);
  toast.push('新增填报成功');
};
```

**生产**：
```tsx
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: createEntry,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entries'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    toast.success('新增填报成功');
    setModal(null);
  },
  onError: (err: ApiError) => {
    if (err.code === 40001) setErrors(err.data); // 字段错误回填
    else toast.error(err.message);
  },
});
```

### 2.6 批量导入：真文件上传

**原型**（`page-data.jsx` DataImport）：
```js
const pickFile = () => {
  setFile({ name: '排放数据导入模板_2025Q2.xlsx', size: 248*1024, rows: 124 });
  setStep(2);
};
const startImport = () => { setTimeout(() => setResult(mockResult), 1800); };
```

**生产**：
```tsx
const inputRef = useRef<HTMLInputElement>(null);

const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0];
  if (!f) return;
  setFile({ name: f.name, size: f.size, rawFile: f });
  setStep(2);
};

const startImport = async () => {
  setParsing(true);
  const form = new FormData();
  form.append('file', file.rawFile);
  form.append('conflictPolicy', options.conflictPolicy);
  form.append('importStatus', options.importStatus);
  try {
    const result = await api.post('/entries/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setResult(result);
    setStep(3);
  } finally {
    setParsing(false);
  }
};
```

### 2.7 报告 PDF 下载

```tsx
const handleExportPdf = async () => {
  const blob = await api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob as unknown as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportTitle}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## 3. TS 类型示例

```ts
// src/types/entry.ts
export interface Entry {
  id: string;
  orgId: string;
  orgName: string;
  orgCode: string;
  period: string;       // 'YYYY-MM'
  periodType: 'month' | 'quarter' | 'year';
  categoryCode: 'FUEL'|'PROCESS'|'FUGITIVE'|'ELEC'|'HEAT'|'TRANSPORT'|'WASTE'|'BUSINESS';
  factorId: string;
  factorName: string;
  quantity: number;
  unit: string;
  factorValue: number;
  factorUnit: string;
  scope: 1 | 2 | 3;
  emission: number;
  source: 'manual' | 'import' | 'api';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createBy: string;
  createDate: string;
  updateBy: string;
  updateDate: string;
}

export interface EntryListParams {
  orgId: string;
  includeDescendants?: boolean;
  period?: string;
  scope?: 1 | 2 | 3;
  category?: string;
  status?: Entry['status'];
  keyword?: string;
  page?: number;
  pageSize?: number;
}
```

---

## 4. 哪些可以直接复用 / 哪些要重写

| 文件 | 处理方式 |
|---|---|
| `styles.css` | ✅ **整个复制**到 `src/styles/globals.css`，不改 |
| `ui.jsx` 里的 `Button/Table/Modal/Tree/Tabs/Tag/Input/Select/Form/Pagination/Toast/Confirm` | ✅ 拆成单文件 + 加 TS 类型，逻辑不动 |
| `ui.jsx` 里的 `Icon` 组件（SVG path 字典） | ✅ 直接搬 |
| `shell.jsx` 的 `OrgProvider/OrgSwitcher/Header/Sidebar/PageHeader` | ⚠️ 结构搬，但 `D.ORG_FLAT` 调用换成 `useQuery` |
| `page-dashboard.jsx` 的 SVG 图表 (`Doughnut/StackedBar/HBar`) | ✅ 直接搬，零依赖 |
| `page-*.jsx` 的页面逻辑 | ⚠️ UI 部分搬，数据访问改为 API + Query |
| `page-report.jsx` 的 `ReportPreview` 组件 | ✅ 整块搬（后端 puppeteer 也会渲染这个页面） |
| `data.js` | ❌ **删掉**，做成后端 seed |
| `tweaks-panel.jsx` | 🟡 开发期保留，上线前移除或加 feature flag |
| `app.jsx` 里的 `useHashRoute` | ❌ 换成 React Router |

---

## 5. 环境变量

```bash
# .env.development
VITE_API_BASE=http://localhost:3000/api/v1

# .env.production
VITE_API_BASE=/api/v1
```

---

## 6. 部署清单

### 前端
```bash
pnpm build
# dist/ 拷到 nginx /usr/share/nginx/html/
```

nginx 配置：
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
  location /api/ {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### docker-compose.yml
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: carbon
      POSTGRES_USER: carbon
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: ['./pgdata:/var/lib/postgresql/data']
  redis:
    image: redis:7-alpine
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://carbon:${DB_PASSWORD}@postgres:5432/carbon
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]
  frontend:
    build: ./frontend
    ports: ['80:80']
    depends_on: [backend]
```

---

## 7. 上线前检查

- [ ] 移除所有 `console.log`
- [ ] 移除 Tweaks 面板（或加 `import.meta.env.DEV` 守卫）
- [ ] 处理 401 跳登录
- [ ] 全局错误边界 + 错误上报
- [ ] 接口超时与重试策略
- [ ] 大表分页与虚拟滚动（entries 表可能上万条）
- [ ] CSP / X-Frame-Options
- [ ] HTTPS + HSTS
- [ ] 数据库定时备份
- [ ] 日志收集（pino / winston → ELK）
