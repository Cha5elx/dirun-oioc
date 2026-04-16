# 项目结构文档

## 概述

本项目是一个中间件服务，用于集成**有赞**电商平台与**第三方一物一码**系统。主要处理库存同步、订单履约、退货退款处理和防伪码追踪。

## 目录结构

```
dirun_oioc/
├── admin/                      # Vue 3 管理后台前端
│   ├── src/
│   │   ├── api/               # API 客户端
│   │   ├── layouts/           # 布局组件
│   │   ├── router/            # Vue Router 配置
│   │   ├── store/             # Pinia 状态管理
│   │   ├── styles/            # CSS 样式
│   │   └── views/             # Vue 组件
│   ├── index.html             # 入口 HTML
│   ├── package.json           # 前端依赖
│   └── vite.config.js         # Vite 配置
│
├── API文档/                    # API 文档
│   └── oioc/                  # OIOC API 参考
│       ├── 创建产品.md
│       ├── 创建代理.md
│       ├── 创建入库出库退货单.md
│       ├── 查询产品.md
│       ├── 查询代理.md
│       ├── 查询入库订单详情.md
│       ├── 查询出库订单详情.md
│       ├── 查询订单条码.md
│       ├── 查询退货订单详情.md
│       ├── 登录.md
│       └── 请求接口说明.md
│
├── database/                   # 数据库文件
│   └── db.json                # JSON 数据库（存储用户和日志）
│
├── docs/                       # 项目文档
│   ├── plans/                 # 实施计划
│   ├── README.md              # 主要文档
│   ├── PROJECT_STRUCTURE.md   # 本文件
│   ├── DEPLOYMENT_GUIDE.md    # 部署说明
│   ├── TESTING_GUIDE.md       # 测试说明
│   └── ... (其他文档)
│
├── logs/                       # 日志输出目录
│   └── (日志文件)
│
├── public/                     # 静态文件
│   └── index.html             # 由 Koa 提供服务
│
├── scripts/                    # 部署和工具脚本
│   ├── deploy-all.sh          # 完整部署脚本
│   ├── deploy-local.sh        # 本地部署脚本
│   ├── deploy-server.sh       # 服务器部署脚本
│   ├── update-server.sh       # 服务器更新脚本
│   ├── run-tests.bat          # Windows 测试运行器
│   └── start-local-test.bat   # 本地测试启动器
│
├── src/                        # 后端源代码
│   ├── clients/               # API 客户端
│   │   ├── oioc.js            # 第三方 OIOC API 客户端
│   │   └── youzan.js          # 有赞 API 客户端
│   │
│   ├── config/                # 配置
│   │   └── index.js           # 环境配置
│   │
│   ├── controllers/           # 请求处理器
│   │   ├── admin.js           # 管理 API 控制器
│   │   └── webhook.js         # Webhook 控制器
│   │
│   ├── middleware/            # Express 中间件
│   │   └── auth.js            # JWT 认证
│   │
│   ├── models/                # 数据模型
│   │   ├── index.js           # 模型导出
│   │   ├── database.js        # SQLite 连接
│   │   ├── jsonDb.js          # JSON 数据库操作
│   │   ├── syncLog.js         # 同步日志模型
│   │   └── user.js            # 用户模型
│   │
│   ├── routes/                # API 路由
│   │   └── index.js           # 路由定义
│   │
│   ├── services/              # 业务逻辑
│   │   └── sync.js            # 同步服务
│   │
│   └── cloud-function.js      # 云函数入口
│
├── tests/                      # 测试文件
│   ├── api/                   # API 测试
│   │   ├── apifox_导出api.js  # API 参考
│   │   ├── query-products.js  # 产品查询测试
│   │   ├── test-login-debug.js
│   │   ├── test-oioc-api.js   # OIOC API 测试
│   │   ├── test-sync.js       # 同步服务测试
│   │   └── test-youzan-api.js # 有赞 API 测试
│   │
│   ├── flow/                  # 流程测试
│   │   ├── simulate-flow.js   # 完整流程模拟
│   │   ├── test-full-flow.js  # 完整流程测试
│   │   └── test-sync-service.js
│   │
│   ├── mock-data.js           # 模拟数据生成器
│   └── test-full-flow.js      # 主测试运行器
│
├── .env.example                # 环境变量模板
├── .gitignore                  # Git 忽略规则
├── index.js                    # 主服务器入口
├── package.json                # 后端依赖
├── serverless.yml              # 腾讯云配置
└── template.yaml               # 阿里云配置
```

## 核心组件

### 后端 (src/)

#### API 客户端 (`src/clients/`)

| 文件 | 用途 |
|------|------|
| `oioc.js` | 第三方一物一码系统 API 客户端。处理登录、产品管理、订单创建（入库/出库/退货）和订单查询。 |
| `youzan.js` | 有赞电商平台 API 客户端。处理令牌管理、库存更新、订单操作和物流。 |

#### 控制器 (`src/controllers/`)

| 文件 | 用途 |
|------|------|
| `webhook.js` | 处理来自有赞和 OIOC 系统的传入 webhook。将消息路由到相应的同步服务方法。 |
| `admin.js` | 管理面板 API 端点。处理用户认证、日志查询、统计和防伪码验证。 |

#### 服务 (`src/services/`)

| 文件 | 用途 |
|------|------|
| `sync.js` | 核心同步服务。实现业务逻辑：入库（增加库存）、订单创建（出库单）、出库（发货）、退款创建和退货完成。 |

#### 模型 (`src/models/`)

| 文件 | 用途 |
|------|------|
| `jsonDb.js` | 基于 JSON 文件的数据库操作 |
| `user.js` | 用户模型，包含 CRUD 操作 |
| `syncLog.js` | 同步日志模型 |
| `database.js` | SQLite 数据库连接（备选方案） |

### 前端 (admin/)

使用 Element Plus UI 组件的 Vue 3 应用：

| 目录 | 用途 |
|------|------|
| `views/` | 仪表盘、登录、日志、查询、用户管理页面 |
| `api/` | 基于 Axios 的 API 客户端 |
| `store/` | Pinia 状态管理（用户认证） |
| `router/` | Vue Router 配置 |

## 数据流

### 流程 1：入库（商品采购入库）

```
OIOC 系统 → POST /webhook/oioc (type: inbound)
    → SyncService.handleInbound()
    → YouzanClient.addStock()
    → OIOC: 创建入库单（可选）
```

### 流程 2：订单与出库（销售发货）

```
有赞 → POST /webhook/youzan (type: trade_TradePaid)
    → SyncService.handleOrderCreated()
    → OIOC: 创建出库单

OIOC 系统 → POST /webhook/oioc (type: outbound)
    → SyncService.handleOutbound()
    → YouzanClient.subtractStock()
    → YouzanClient.shipOrder()
    → YouzanClient.updateOrderRemark() (防伪码)
```

### 流程 3：退货与退款（退货退款）

```
有赞 → POST /webhook/youzan (type: trade_TradeRefundCreated)
    → SyncService.handleRefund()
    → OIOC: 创建退货单

OIOC 系统 → POST /webhook/oioc (type: return_complete)
    → SyncService.handleReturnComplete()
    → YouzanClient.addStock()
```

## 配置

### 环境变量 (.env)

| 变量 | 说明 |
|------|------|
| `YOUZAN_CLIENT_ID` | 有赞应用客户端 ID |
| `YOUZAN_CLIENT_SECRET` | 有赞应用密钥 |
| `YOUZAN_GRANT_ID` | 有赞授权 ID |
| `YOUZAN_DRY_RUN` | 设为 'true' 可在不调用真实 API 的情况下测试 |
| `OIOC_BASE_URL` | 第三方 OIOC 系统 API URL |
| `OIOC_USERNAME` | OIOC 系统用户名 |
| `OIOC_PASSWORD` | OIOC 系统密码 |
| `PORT` | 服务器端口（默认：3000） |
| `NODE_ENV` | 环境（development/production） |

## 关键文件

| 文件 | 用途 |
|------|------|
| `index.js` | 主服务器入口点。初始化 Koa 应用、数据库和路由。 |
| `src/cloud-function.js` | 无服务器部署的云函数入口。 |
| `serverless.yml` | 腾讯云函数配置。 |
| `template.yaml` | 阿里云函数计算配置。 |

## API 端点

### Webhooks

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/webhook/youzan` | 接收有赞事件 |
| POST | `/webhook/oioc` | 接收 OIOC 事件 |
| GET | `/health` | 健康检查 |

### 管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/users` | 用户列表（需认证） |
| POST | `/api/users` | 创建用户（需认证） |
| PUT | `/api/users/:id` | 更新用户（需认证） |
| DELETE | `/api/users/:id` | 删除用户（需认证） |
| GET | `/api/logs` | 获取同步日志（需认证） |
| GET | `/api/stats/summary` | 获取统计信息（需认证） |
| GET | `/api/query/code/:code` | 查询防伪码（需认证） |

## 安全注意事项

1. **切勿提交 `.env` 文件** - 使用 `.env.example` 作为模板
2. **JWT 认证** - 管理 API 需要 Bearer 令牌
3. **Dry Run 模式** - 测试时设置 `YOUZAN_DRY_RUN=true`
4. **令牌管理** - OIOC 令牌缓存在内存中；有赞令牌自动刷新
