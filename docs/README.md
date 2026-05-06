# DiRun OIOC — 有赞 × 一物一码 对接服务

连接**有赞商城**与**第三方一物一码系统**的中间件服务，实现入库、发货、退货的自动双向同步。

```
有赞商城 ←── Webhook/API ──→ 本服务 ←── Webhook/API ──→ 第三方一物一码系统
```

---

## 项目结构

```
dirun_oioc/
├── index.js                     # 服务入口 (Koa 3.x)
├── src/
│   ├── clients/
│   │   ├── oioc.js              # 一物一码 API 客户端
│   │   └── youzan.js            # 有赞 API 客户端
│   ├── controllers/
│   │   ├── admin.js             # 管理后台 API（产品/代理/单据/用户/日志）
│   │   └── webhook.js           # Webhook 处理（入库/出库/退货）
│   ├── services/
│   │   ├── sync.js              # 核心同步业务逻辑
│   │   ├── cleanup.js           # 日志定时清理 + 数据库自动备份
│   │   └── retryQueue.js        # 失败重试队列（指数退避）
│   ├── models/                  # 数据模型 (User, SyncLog, ProductMapping)
│   ├── middleware/
│   │   ├── auth.js              # JWT 认证 + RBAC 权限
│   │   └── verifySignature.js   # Webhook HMAC-SHA256 签名验证
│   ├── config/index.js          # 环境变量配置
│   ├── routes/index.js          # 路由定义
│   └── utils/
│       ├── logger.js            # Winston 日志
│       └── response.js          # 响应工具
├── admin/                       # Vue 3 管理后台 (Element Plus)
├── scripts/
│   ├── deploy-server.sh         # 服务器一键部署脚本
│   ├── update-server.sh         # 服务器更新脚本
│   └── import-products.js       # 有赞商品批量导入工具
├── tests/                       # 测试脚本
├── docs/                        # 文档
│   ├── 产品文档.md               # 完整产品文档
│   └── README.md                # 本文件
├── database/                    # SQLite 数据库文件
├── logs/                        # 日志输出
├── public/                      # 前端构建产物（已提交 Git）
├── ecosystem.config.js          # PM2 配置
└── package.json
```

---

## 快速开始

### 1. 安装依赖

```bash
# 后端
npm install

# 前端
cd admin && npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，必填项：

| 变量 | 说明 |
|------|------|
| `YOUZAN_CLIENT_ID` | 有赞应用 Client ID |
| `YOUZAN_CLIENT_SECRET` | 有赞应用 Client Secret |
| `YOUZAN_GRANT_ID` | 有赞授权 Grant ID |
| `OIOC_BASE_URL` | 一物一码系统 API 地址 |
| `OIOC_USERNAME` | 一物一码系统登录账号 |
| `OIOC_PASSWORD` | 一物一码系统登录密码 |
| `JWT_SECRET` | JWT 签名密钥（至少 32 位随机字符串） |

### 3. 启动开发环境

```bash
# 终端 1 — 后端（nodemon 热重载）
npm run dev                     # → http://localhost:3000

# 终端 2 — 前端（Vite 热更新）
cd admin && npm run dev         # → http://localhost:5173
```

> 开发时访问 `http://localhost:5173`，Vite 自动代理 API 请求到后端 `:3000`。

### 4. 生产构建

```bash
cd admin && npm run build       # 输出到 ../public/
```

---

## 管理后台

默认管理员账号：`cangku001` / `123456`（通过一物一码系统登录验证）

| 页面 | 功能 |
|------|------|
| 数据仪表盘 | 今日订单/入库/出库/退货统计 |
| 同步日志 | 同步操作记录，支持按类型/状态/时间筛选 |
| 有赞订单 | 有赞订单列表和详情 |
| 一物一码订单查询 | 按订单 ID 查询条码 |
| 产品管理 | 创建/查询 OIOC 产品，支持从有赞批量导入 |
| 代理管理 | 创建/查询 OIOC 代理 |
| 一物一码单据 | 创建/查询入库单、出库单、退货单 |
| 用户管理 | 用户 CRUD + 角色分配（admin/operator/viewer） |
| 产品映射 | 有赞 SKU ↔ OIOC 产品编码映射关系 |

---

## 业务流程

### 入库
```
OIOC Webhook ─→ 本服务 ─→ 创建入库单 ─→ 有赞加库存 ─→ 记录日志
```

### 发货
```
有赞 Webhook (订单付款) ─→ 本服务 ─→ 创建出库单
OIOC Webhook (出库)     ─→ 本服务 ─→ 有赞扣库存 + 发货 + 写防伪码
```

### 退货
```
有赞 Webhook (退货申请) ─→ 本服务 ─→ 创建退货单
OIOC Webhook (退货完成) ─→ 本服务 ─→ 有赞恢复库存
```

失败自动进入重试队列，指数退避重试（30s → 60s → 120s），最多 3 次。

---

## 部署

完整部署指南见 [产品文档.md](./产品文档.md) 第六章，这里列出关键步骤：

```bash
# 服务器一键部署
sudo bash scripts/deploy-server.sh

# 后续更新
bash scripts/update-server.sh
```

### Nginx 子域名配置示例

```
server {
    listen 80;
    server_name oioc.lanzhijingyou.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

### 有赞商品导入

```bash
node scripts/import-products.js
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [产品文档.md](./产品文档.md) | 完整产品手册（架构、API、运维、环境变量） |
| `DEPLOYMENT.md` | 详细部署指南 |
| `TESTING.md` | 本地测试指南 |

---

*最后更新: 2026-05-06*
