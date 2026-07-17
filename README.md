# IVSAP — 智能视频流分析平台

Intelligent Video Stream Analysis Platform

基于 AI 的实时视频流分析与工单管理平台，支持多路视频流接入、算法检测、告警处置与工单分发全流程。

## 快速开始（前端演示模式）

无需后端服务，直接启动前端即可查看演示数据。

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 **http://localhost:3000**

> 演示模式使用内置 Mock 数据（`src/db.js`），所有操作保存在浏览器 localStorage 中，刷新不丢失。

## 完整部署（前后端 + 数据库）

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 14 |
| npm | ≥ 9 |

### 1. 启动数据库

方式一：使用 Docker

```bash
docker compose up postgres -d
```

方式二：本地 PostgreSQL

```bash
# 创建数据库
createdb stream_analyzer
```

### 2. 初始化后端

```bash
# 安装后端依赖
cd server && npm install

# 执行数据库迁移
npm run migrate

# 导入种子数据
npm run seed

# 启动后端服务（默认端口 3001）
npm run dev
```

### 3. 启动前端

```bash
# 回到项目根目录
cd ..

# 使用真实后端模式
npm run dev
```

> 首次访问会显示登录页，演示账号：`admin` / `123456`

### Docker 一键部署

```bash
# 启动全部服务（PostgreSQL + 后端 API）
docker compose up -d

# 安装前端依赖并启动
npm install
npm run dev
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器（端口 3000） |
| `npm run dev:server` | 启动后端 API 服务（端口 3001） |
| `npm run build` | 构建前端生产版本到 `dist/` |
| `npm run preview` | 预览构建后的前端 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 导入种子数据 |
| `npm run setup` | 一键安装后端依赖 + 迁移 + 种子数据 |

## 项目结构

```
src/
├── main.js              # 应用入口 — 初始化引导
├── app.js               # App 命名空间 — 导航、状态、常量
├── api.js               # API 客户端 — 桥接后端 REST 接口
├── db.js                # 数据层 — Mock 数据 + localStorage 持久化
├── style.css            # 全局样式
├── utils/
│   ├── dom.js           # DOM 工具 — $, html, toast, modal, escapeHtml
│   └── flv.js           # FLV 播放器（含重试机制）
└── pages/
    ├── dashboard.js     # 工作台 — 概览统计、视频流、实时告警
    ├── streams.js       # 推流管理 — CRUD + 批量操作
    ├── detection.js     # 检测项目 — 算法配置、ROI 区域
    ├── algorithms.js    # 算法管理 — 类型 + Prompt 提示词
    ├── alerts.js        # 告警中心 — 过滤、处置、合并工单
    ├── tickets.js       # 工单分发 — 列表/看板、分配、验收
    ├── users.js         # 人员权限 — 用户、角色、排班日历
    └── system.js        # 系统设置 — 大模型配置、日志保留
server/
├── index.js             # Express 服务入口
├── config.js            # 服务配置（端口、JWT、数据库）
├── db/                  # 数据库层
│   ├── pool.js          # PostgreSQL 连接池
│   ├── migrate.js       # 数据库迁移脚本
│   ├── seed.js          # 种子数据
│   └── migrations/      # SQL 迁移文件
├── routes/              # REST 路由
│   ├── auth.js          # 登录认证
│   ├── streams.js       # 视频流 CRUD
│   ├── detections.js    # 检测项目 CRUD
│   ├── alerts.js        # 告警管理
│   ├── tickets.js       # 工单管理
│   ├── users.js         # 人员管理
│   ├── roles.js         # 角色权限
│   ├── depts.js         # 部门管理
│   ├── algorithms.js    # 算法管理
│   └── system.js        # 系统设置
├── middleware/           # 中间件（JWT 验证等）
├── Dockerfile
└── package.json
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | 原生 JavaScript（无框架）、Vite、flv.js |
| 后端 | Node.js、Express、WebSocket |
| 数据库 | PostgreSQL |
| 部署 | Docker、Docker Compose |

## 配置

### 前端（`vite.config.js`）

```js
server: {
  port: 3000,             // 开发服务器端口
  proxy: {
    '/api': 'http://localhost:3001',  // API 代理
    '/ws':  'ws://localhost:3001',     // WebSocket 代理
  },
}
```

### 后端（环境变量或 `server/config.js`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | API 服务端口 |
| `JWT_SECRET` | `stream-analyzer-dev-secret-...` | JWT 签名密钥（生产环境务必修改） |
| `DB_HOST` | `localhost` | 数据库地址 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `stream_analyzer` | 数据库名 |
| `DB_USER` | `postgres` | 数据库用户 |
| `DB_PASSWORD` | `postgres` | 数据库密码 |
| `CORS_ORIGIN` | `http://localhost:3000` | 允许的前端域名 |

## 功能特性

- **实时视频流接入** — 支持 RTSP、RTMP、HTTP-FLV 协议
- **AI 算法检测** — 人员入侵、烟火检测、物品遗留、区域越界
- **智能告警** — 按置信度自动生成告警，支持自定义规则
- **工单流转** — 分配→处理→验收全流程，看板/列表双视图
- **大模型集成** — 可配置多组 API（OpenAI、通义千问、DeepSeek）
- **排班日历** — 值班人员排班管理
- **角色权限** — 细粒度页面访问控制
