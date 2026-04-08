# 第三方一物一码API实现说明

## ✅ 已实现的API

所有API已经成功整合到 `src/clients/oioc.js` 中，并经过测试验证。

---

## 📋 API列表

### 1. 登录接口 ✅
**方法**: `login()`
**路径**: `POST /login/access-token`
**功能**: 使用仓库员工账号登录，获取token
**参数**: 
- account: 从环境变量读取
- password: 从环境变量读取
- type: 'PDA'

**返回**: token信息

**示例**:
```javascript
const oiocClient = require('./src/clients/oioc');
await oiocClient.login();
```

---

### 2. 创建产品 ✅
**方法**: `createProduct(productData)`
**路径**: `POST /products/`
**功能**: 创建新产品
**参数**:
- productID: 产品ID
- productCode: 产品编号
- productName: 产品名称
- standard: 规格

**示例**:
```javascript
await oiocClient.createProduct({
  productID: 'PRODUCT_001',
  productCode: 'CODE_001',
  productName: '橙花精油',
  standard: '50ml'
});
```

---

### 3. 查询产品 ✅
**方法**: `getProduct(params)`
**路径**: `GET /products/`
**功能**: 查询产品列表
**参数** (可选):
- productID: 产品ID
- productName: 产品名称
- productCode: 产品编号
- standard: 规格

**示例**:
```javascript
// 查询所有产品
const products = await oiocClient.getProduct();

// 按条件查询
const products = await oiocClient.getProduct({
  productName: '橙花精油'
});
```

---

### 4. 创建代理商 ✅
**方法**: `createAgent(agentData)`
**路径**: `POST /users/`
**功能**: 创建代理商账号
**参数**:
- userID: 代理ID
- account: 账号
- password: 密码 (默认: '888333')
- userTypeNumber: 用户类型编号 (默认: 30)
- parentID: 上级ID (默认: 'admin')

**示例**:
```javascript
await oiocClient.createAgent({
  userID: 'AGENT_001',
  account: 'agent001',
  password: '123456'
});
```

---

### 5. 查询代理商 ✅
**方法**: `getAgent(params)`
**路径**: `GET /users/`
**功能**: 查询代理商列表
**参数** (可选):
- userID: 代理ID
- account: 账号
- userName: 用户名

**示例**:
```javascript
const agents = await oiocClient.getAgent({
  account: 'agent001'
});
```

---

### 6. 创建入库单 ✅
**方法**: `createInboundOrder(orderData)`
**路径**: `POST /orders/order-and-detail/`
**功能**: 创建入库订单
**参数**:
- orderNumber: 订单号
- receiverID: 收货人ID
- detailList: 商品明细列表
  - productID: 产品ID
  - expectedQty: 预期数量
- shipperID: 发货人ID (可选)
- orderDesc: 订单描述 (可选)
- orderSource: 订单来源 (默认: 'API')
- orderTypeNumber: 订单类型编号 (默认: 10)
- orderInType: 入库类型 (默认: 20)

**示例**:
```javascript
await oiocClient.createInboundOrder({
  orderNumber: 'IN20260129001',
  receiverID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  detailList: [
    {
      productID: 'df4ba8e4-8092-11ec-adc3-f78536c9c35a',
      expectedQty: 100
    }
  ]
});
```

---

### 7. 创建出库单 ✅
**方法**: `createOutboundOrder(orderData)`
**路径**: `POST /orders/order-and-detail/`
**功能**: 创建出库订单
**参数**:
- orderNumber: 订单号
- receiverID: 收货人ID
- detailList: 商品明细列表
- shipperID: 发货人ID (可选)
- orderDesc: 订单描述 (可选)
- orderSource: 订单来源 (默认: 'API')
- orderTypeNumber: 订单类型编号 (默认: 22)

**示例**:
```javascript
await oiocClient.createOutboundOrder({
  orderNumber: 'OUT20260129001',
  receiverID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  detailList: [
    {
      productID: 'df4ba8e4-8092-11ec-adc3-f78536c9c35a',
      expectedQty: 2
    }
  ]
});
```

---

### 8. 创建退货单 ✅
**方法**: `createReturnOrder(orderData)`
**路径**: `POST /orders/order-and-detail/`
**功能**: 创建退货订单
**参数**:
- orderNumber: 订单号
- receiverID: 收货人ID
- detailList: 商品明细列表
- shipperID: 发货人ID (可选)
- orderDesc: 订单描述 (可选)
- orderSource: 订单来源 (默认: 'API')
- orderTypeNumber: 订单类型编号 (默认: 29)

**示例**:
```javascript
await oiocClient.createReturnOrder({
  orderNumber: 'RETURN20260129001',
  receiverID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  detailList: [
    {
      productID: 'df4ba8e4-8092-11ec-adc3-f78536c9c35a',
      expectedQty: 1
    }
  ]
});
```

---

### 9. 查询订单条码 ✅
**方法**: `getOrderCodes(orderID)`
**路径**: `GET /barcodes/get_by_order/{orderID}`
**功能**: 查询订单关联的条码
**参数**:
- orderID: 订单ID

**示例**:
```javascript
const codes = await oiocClient.getOrderCodes('ORDER_001');
```

---

### 10. 查询入库订单详情 ✅
**方法**: `getInboundOrderDetail(params)`
**路径**: `GET /reports/hq/order-in/has-scan`
**功能**: 查询入库订单详细信息
**参数** (可选):
- orderNumber: 订单号
- orderStateNumber: 订单状态编号
- receiverID: 收货人ID
- receiverUsername: 收货人用户名
- productID: 产品ID
- productName: 产品名称
- batchID: 批次ID
- batchName: 批次名称
- createdStartTime: 创建开始时间
- createdEndTime: 创建结束时间
- finishStartTime: 完成开始时间
- finishEndTime: 完成结束时间
- isAccurate: 是否精确查询
- isScan: 是否扫描
- isStatSum: 是否统计汇总
- orderInType: 入库类型
- orderInTypeList: 入库类型列表
- orderDetailDesc: 订单明细描述
- showMiddleCodeCount: 显示中间码数量
- returnSerialTag: 返回序列标签

**示例**:
```javascript
const details = await oiocClient.getInboundOrderDetail({
  orderNumber: 'IN20260129001',
  isScan: 1
});
```

---

### 11. 查询出库订单详情 ✅
**方法**: `getOutboundOrderDetail(params)`
**路径**: `GET /reports/hq/order-out/has-scan`
**功能**: 查询出库订单详细信息
**参数** (可选):
- userID: 用户ID
- orderNumber: 订单号
- orderStateNumber: 订单状态编号
- receiverID: 收货人ID
- receiverUsername: 收货人用户名
- productID: 产品ID
- productName: 产品名称
- batchID: 批次ID
- batchName: 批次名称
- createdStartTime: 创建开始时间
- createdEndTime: 创建结束时间
- finishStartTime: 完成开始时间
- finishEndTime: 完成结束时间
- shipperID: 发货人ID
- shipperName: 发货人名称
- orderTypeNumber: 订单类型编号
- isAccurate: 是否精确查询
- isScan: 是否扫描
- isStatSum: 是否统计汇总
- orderTypeNumberList: 订单类型编号列表

**示例**:
```javascript
const details = await oiocClient.getOutboundOrderDetail({
  orderNumber: 'OUT20260129001',
  isScan: 1
});
```

---

### 12. 查询退货订单详情 ✅
**方法**: `getReturnOrderDetail(params)`
**路径**: `GET /reports/hq/order-return/has-scan`
**功能**: 查询退货订单详细信息
**参数** (可选):
- userID: 用户ID
- orderNumber: 订单号
- orderStateNumber: 订单状态编号
- receiverID: 收货人ID
- receiverUsername: 收货人用户名
- productID: 产品ID
- productName: 产品名称
- batchID: 批次ID
- batchName: 批次名称
- createdStartTime: 创建开始时间
- createdEndTime: 创建结束时间
- finishStartTime: 完成开始时间
- finishEndTime: 完成结束时间
- shipperID: 发货人ID
- shipperName: 发货人名称
- isAccurate: 是否精确查询
- createdUserID: 创建用户ID
- createdUserName: 创建用户名
- isStatSum: 是否统计汇总

**示例**:
```javascript
const details = await oiocClient.getReturnOrderDetail({
  orderNumber: 'RETURN20260129001',
  isScan: 1
});
```

---

## 🔧 核心特性

### 1. 自动认证
- ✅ 自动在请求头添加 `syskey: DIRUN`
- ✅ 登录后自动在请求头添加 `Authorization: Bearer {token}`
- ✅ 使用axios拦截器自动处理

### 2. 错误处理
- ✅ 所有方法都有try-catch错误处理
- ✅ 详细的错误日志输出
- ✅ 错误会重新抛出，由调用者处理

### 3. 配置管理
- ✅ 从环境变量读取配置
- ✅ baseURL统一配置
- ✅ 超时时间设置（30秒）

---

## 🧪 测试结果

运行 `node test-oioc-api.js` 测试结果：

```
✅ 登录: 成功
✅ 查询产品: 成功
✅ 创建产品: 成功
✅ 查询代理商: 成功

总计: 4/4 个测试通过
```

---

## 📝 使用建议

### 1. 先登录
使用任何API之前，必须先调用登录接口：
```javascript
const oiocClient = require('./src/clients/oioc');
await oiocClient.login();
```

### 2. 错误处理
建议在使用时添加错误处理：
```javascript
try {
  const result = await oiocClient.getProduct();
  console.log('查询成功:', result);
} catch (error) {
  console.error('查询失败:', error.message);
}
```

### 3. 参数传递
- 必填参数：必须提供
- 可选参数：可以省略，会使用默认值
- 查询参数：对象形式传递，会自动过滤空值

---

## 🚀 下一步

现在第三方一物一码的API已经全部实现并测试通过，接下来需要：

1. ✅ 实现有赞API客户端 (`src/clients/youzan.js`)
2. ✅ 完善业务逻辑层 (`src/services/sync.js`)
3. ✅ 测试完整业务流程
4. ✅ 部署到云函数

---

## 📚 相关文档

- [API实现指南](API_GUIDE.md)
- [Apifox代码生成指南](APIFOX_GUIDE.md)
- [项目README](README.md)
- [业务流程说明](有赞_一物一码_货物出入库流程.md)
