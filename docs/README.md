# 有赞与第三方一物一码系统对接服务

## 项目结构

```
dirun_oioc/
├── src/
│   ├── config/           # 配置管理
│   │   └── index.js
│   ├── clients/          # API客户端
│   │   ├── oioc.js      # 第三方一物一码API
│   │   └── youzan.js    # 有赞API
│   ├── services/         # 业务逻辑层
│   │   └── sync.js      # 同步服务
│   ├── controllers/      # 控制器
│   │   └── webhook.js   # Webhook处理
│   ├── routes/           # 路由
│   │   └── index.js
│   └── cloud-function.js # 云函数入口
├── index.js              # 本地服务入口
├── test-sync.js          # 测试脚本
├── .env.example          # 环境变量示例
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：
- 有赞配置：client_id, client_secret, grant_id
- 第三方一物一码配置：base_url, username, password

### 3. 填写API实现

#### 第三方一物一码API (`src/clients/oioc.js`)
需要实现的方法：
- `login()` - 登录获取token
- `createProduct()` - 创建产品
- `getProduct()` - 查询产品
- `createAgent()` - 创建代理商
- `getAgent()` - 查询代理商
- `createInboundOrder()` - 创建入库单
- `createOutboundOrder()` - 创建出库单
- `createReturnOrder()` - 创建退货单
- `getOrderCodes()` - 查询订单条码
- `getInboundOrderDetail()` - 查询入库订单详情
- `getOutboundOrderDetail()` - 查询出库订单详情
- `getReturnOrderDetail()` - 查询退货订单详情

#### 有赞API (`src/clients/youzan.js`)
需要实现的方法：
- `getToken()` - 获取access_token
- `callApi()` - 调用API通用方法
- `updateStock()` - 更新库存
- `getOrder()` - 获取订单详情
- `shipOrder()` - 订单发货
- `updateOrderRemark()` - 更新订单备注
- `getProduct()` - 获取商品详情
- `handleRefund()` - 处理退款

### 4. 运行测试

```bash
npm test
```

### 5. 启动服务

```bash
npm start
```

服务启动后，可以访问：
- 健康检查：http://localhost:3000/health
- 有赞Webhook：http://localhost:3000/webhook/youzan
- OIOC Webhook：http://localhost:3000/webhook/oioc

## 业务流程

### 流程1：商品采购入库
1. 第三方系统推送入库数据到 `/webhook/oioc`
2. 同步服务自动给有赞加库存

### 流程2：销售发货
1. 有赞推送订单到 `/webhook/youzan`
2. 同步服务在第三方系统创建出库单
3. 仓库扫码发货后，第三方推送发货数据到 `/webhook/oioc`
4. 同步服务自动操作有赞（扣库存、发货、写防伪码）

### 流程3：退货退款
1. 有赞推送退货申请到 `/webhook/youzan`
2. 同步服务在第三方创建退货单
3. 仓库扫码退货后，第三方推送退货数据到 `/webhook/oioc`
4. 同步服务自动给有赞加回库存

## 部署到云函数

### 阿里云函数计算

1. 修改 `template.yaml` 配置
2. 使用 `fun deploy` 部署
3. 入口函数：`src/cloud-function.js`

### 腾讯云云函数

1. 在云函数控制台创建函数
2. 上传代码包
3. 入口函数：`src/cloud-function.js`

## 开发建议

1. **先实现API客户端**：先完成 `oioc.js` 和 `youzan.js` 中的API实现
2. **本地测试**：使用 `test-sync.js` 测试业务流程
3. **Webhook测试**：使用 ngrok 或类似工具暴露本地端口，测试Webhook回调
4. **日志记录**：建议添加日志库（如 winston）记录详细日志
5. **错误处理**：完善错误处理和重试机制
6. **数据持久化**：建议添加数据库存储同步记录

## 注意事项

1. **安全性**：不要将 `.env` 文件提交到版本控制
2. **Token管理**：建议实现token自动刷新机制
3. **幂等性**：Webhook处理要保证幂等性，避免重复处理
4. **超时处理**：API调用要设置合理的超时时间
5. **监控告警**：建议添加监控和告警机制
