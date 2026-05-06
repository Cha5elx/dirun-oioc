# DiRun OIOC

有赞商城与一物一码系统对接中间件，实现入库、发货、退货自动双向同步。

---

## 技术栈

Node.js + Koa + SQLite / Vue 3 + Element Plus

---

## 快速开始

```bash
# 后端
npm install
cp .env.example .env   # 编辑 .env 填入真实配置
npm run dev             # → http://localhost:3000

# 前端
cd admin && npm install
npm run dev             # → http://localhost:5173
```

---

## 生产部署

```bash
# 构建前端
cd admin && npm run build

# 服务器部署
sudo bash scripts/deploy-server.sh
```

通过 Nginx 反向代理配置子域名，详见 [产品文档](./产品文档.md)。

---

## 完整文档

[产品文档.md](./产品文档.md) — 架构设计、API 参考、运维指南、环境变量等。
