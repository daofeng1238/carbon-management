# 组织碳管理系统 · 快速启动

## 本地开发

### 前提
- Node.js 18+（已安装）
- PostgreSQL 15（或使用 Docker）

### 1. 启动 PostgreSQL（推荐 Docker 方式）
```bash
docker run -d --name carbon-pg \
  -e POSTGRES_DB=carbon \
  -e POSTGRES_USER=carbon \
  -e POSTGRES_PASSWORD=Carbon@2025DB \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 建表
```bash
psql postgres://carbon:Carbon@2025DB@localhost:5432/carbon \
  -f carbon-backend/src/database/migrations/001_init.sql
```

### 3. 启动后端
```bash
cd carbon-backend
cp .env.example .env    # 按需修改 DATABASE_URL
npm run start:dev
# 后端运行在 http://localhost:3000
```

### 4. 导入种子数据
```bash
cd carbon-backend
npm run seed
```

### 5. 启动前端
```bash
cd carbon-frontend
npm run dev
# 浏览器访问 http://localhost:5173
```

### 演示账号
| 用户名 | 密码 | 角色 |
|---|---|---|
| zhangzihan | Carbon@2025 | 集团管理员 |
| chenyanlin | Carbon@2025 | 板块管理员 |
| limingzhe | Carbon@2025 | 审核员 |
| wangxueting | Carbon@2025 | 填报员 |

---

## 服务器部署（Docker Compose）

### 前提
- 服务器已安装 Docker + Docker Compose
- 已克隆/上传项目代码

### 1. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env，修改 DB_PASSWORD 和 JWT_SECRET
```

### 2. 一键启动
```bash
docker-compose up -d --build
```
- 前端：`http://your-server-ip`
- 后端 API：`http://your-server-ip:3000/api/v1`

### 3. 初始化数据库（首次部署）
等待容器启动后：
```bash
docker-compose exec backend node dist/database/seeds/run-seed.js
```

### 4. 查看日志
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. 更新部署
```bash
git pull
docker-compose up -d --build
```

---

## 目录结构
```
组织碳后端/
├── carbon-backend/     # NestJS 后端
│   ├── src/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── factors/
│   │   ├── entries/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── database/seeds/  ← 种子数据
│   └── Dockerfile
├── carbon-frontend/    # Vite + React + TS 前端
│   ├── src/
│   │   ├── api/        ← API 封装层
│   │   ├── contexts/   ← AuthContext, OrgContext
│   │   ├── pages/      ← 6 个页面
│   │   └── styles/     ← globals.css
│   └── Dockerfile
├── docker-compose.yml
└── QUICKSTART.md       ← 本文件
```
