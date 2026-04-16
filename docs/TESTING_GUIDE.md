# 测试指南

## 概述

本项目包含全面的测试，涵盖 API 客户端、同步服务和完整业务流程模拟。

## 测试环境配置

### 1. 配置测试环境

```bash
# 使用 .env.development 进行本地测试
# 此文件包含测试凭据和 dry-run 模式
cp .env.example .env.development

# 测试关键设置：
# YOUZAN_DRY_RUN=true  - 阻止真实的有赞 API 调用
# OIOC_BASE_URL - 使用测试/模拟服务器或真实的 OIOC 测试环境
```

### 2. 安装依赖

```bash
npm install
```

### 3. 生成模拟数据

```bash
node tests/mock-data.js
```

这将在 `database/db.json` 中生成测试数据：
- 2 个测试用户（admin、warehouse）
- 8 条同步日志记录
- 模拟防伪码

## 测试分类

### API 测试 (`tests/api/`)

#### 1. OIOC API 测试

测试第三方一物一码系统 API：

```bash
node tests/api/test-oioc-api.js
```

测试内容：
- 登录
- 产品查询
- 产品创建
- 代理商查询

#### 2. 有赞 API 测试

测试有赞电商平台 API：

```bash
node tests/api/test-youzan-api.js
```

测试内容：
- 令牌获取
- 商品详情
- 库存更新
- 订单详情
- 订单发货
- 订单备注更新

#### 3. 同步服务测试

测试同步服务方法：

```bash
node tests/api/test-sync.js
```

测试内容：
- 入库处理
- 订单创建处理
- 出库处理
- 退款处理
- 退货完成处理

#### 4. 产品查询测试

```bash
node tests/api/query-products.js
```

从 OIOC 系统查询所有产品。

#### 5. 登录调试测试

```bash
node tests/api/test-login-debug.js
```

OIOC 登录问题的调试工具。

### 流程测试 (`tests/flow/`)

#### 1. 完整流程模拟

最全面的测试 - 模拟完整业务流程：

```bash
node tests/flow/simulate-flow.js
```

模拟内容：
- **流程 1**：入库（5 件商品）
- **流程 2**：订单创建 + 出库（2 件商品）
- **流程 3**：退货（1 件商品）

生成详细日志文件：`tests/flow/logs/simulate-{时间戳}.log`

#### 2. 完整流程测试

测试所有 API 端点（需要真实服务器）：

```bash
# 先启动服务器
npm start

# 在另一个终端执行
node tests/flow/test-full-flow.js
```

测试内容：
- 健康检查
- 用户登录
- 统计 API
- 日志 API
- 用户管理
- 所有业务流程

#### 3. 同步服务流程测试

```bash
node tests/flow/test-sync-service.js
```

带日志记录的同步服务测试。

### 主测试运行器

```bash
# 运行完整测试套件
node tests/test-full-flow.js

# 或使用批处理脚本（Windows）
scripts\run-tests.bat
```

## 运行测试

### 快速测试

```bash
# 启动服务器
npm start

# 运行主测试
node tests/test-full-flow.js
```

### 完整测试套件

```bash
# 1. 生成模拟数据
node tests/mock-data.js

# 2. 启动服务器
npm start

# 3. 在另一个终端运行测试
node tests/test-full-flow.js

# 4. 运行 API 测试
node tests/api/test-oioc-api.js
node tests/api/test-youzan-api.js
node tests/api/test-sync.js

# 5. 运行流程模拟
node tests/flow/simulate-flow.js
```

### Windows 批处理脚本

```bash
scripts\start-local-test.bat
```

此脚本将：
1. 启动服务器
2. 等待服务器就绪
3. 运行完整测试套件

## 测试数据

### 模拟数据结构

```javascript
{
  users: [
    { id: 1, username: 'admin', role: 'admin' },
    { id: 2, username: 'warehouse', role: 'user' }
  ],
  syncLogs: [
    { type: 'inbound', status: 'success', data: {...} },
    { type: 'order_created', status: 'success', data: {...} },
    { type: 'outbound', status: 'success', data: {...} },
    { type: 'refund_created', status: 'success', data: {...} },
    { type: 'return_complete', status: 'success', data: {...} }
  ]
}
```

### 测试产品 ID

测试使用以下产品 ID（请在 OIOC 系统中配置）：

| 产品 ID | 名称 | 规格 |
|---------|------|------|
| `12479C06-1F34-42F8-A4EC-C0B7EF2561FD` | 橙花精油50ml | 50ml/瓶 |

### 测试仓库/代理商 ID

| ID | 类型 | 名称 |
|----|------|------|
| `FE7D844D-5CAB-4DB9-97FB-2C812C6F142D` | 仓库 | 成品仓 |
| `85110428-20CB-477E-9516-390A96320C7B` | 代理商 | 测试代理 |

## 测试结果

### 预期输出

```
========================================
  测试结果汇总
========================================
✅ 通过: 10
❌ 失败: 0
📊 总计: 10
📈 成功率: 100.0%
========================================
```

### 常见测试失败

1. **登录失败**
   - 检查 `.env` 中的 OIOC 凭据
   - 验证 OIOC_BASE_URL 可访问
   - 检查网络连接

2. **令牌获取失败**
   - 检查有赞凭据
   - 验证 YOUZAN_DRY_RUN 设置正确
   - 检查有赞 API 状态

3. **产品未找到**
   - 验证产品在 OIOC 系统中存在
   - 检查测试文件中的产品 ID
   - 确保已登录

4. **服务器无响应**
   - 确保服务器正在运行（`npm start`）
   - 检查端口 3000 是否可用
   - 验证健康端点：`curl http://localhost:3000/health`

## Dry Run 模式

用于不调用真实 API 的测试：

```bash
# 在 .env 中设置
YOUZAN_DRY_RUN=true
```

启用后：
- 有赞 API 调用返回模拟响应
- 无真实库存更新
- 无真实订单操作
- 适合开发测试

## 日志文件

### 测试日志

- 流程模拟：`tests/flow/logs/simulate-{时间戳}.log`
- 完整流程测试：`tests/flow/logs/test-{时间戳}.log`

### 应用日志

- 控制台输出
- `logs/` 目录（如已配置）
- PM2 日志：`~/.pm2/logs/dirun-oioc-*.log`

## 调试

### 启用详细日志

OIOC 客户端已包含详细日志：
- 请求详情（方法、URL、请求头、请求体）
- 响应详情（状态、数据）

### 检查数据库

```bash
# 查看数据库内容
cat database/db.json | python -m json.tool
# 或
cat database/db.json | jq
```

### 手动 API 测试

```bash
# 健康检查
curl http://localhost:3000/health

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取日志（替换 TOKEN）
curl http://localhost:3000/api/logs \
  -H "Authorization: Bearer TOKEN"
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: cp .env.example .env
      - run: node tests/mock-data.js
      - run: npm start &
      - run: sleep 5
      - run: node tests/test-full-flow.js
```

## 最佳实践

1. **开发时始终使用 dry-run 模式**
2. **测试前生成新的模拟数据**
3. **查看日志获取详细错误信息**
4. **验证环境变量正确**
5. **部署前运行完整流程测试**
6. **保持测试产品 ID 与 OIOC 系统同步**
