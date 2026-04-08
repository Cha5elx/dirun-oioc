# API实现指南

## 第三方一物一码API (`src/clients/oioc.js`)

### 1. 登录接口
```javascript
async login() {
  // POST /api/login
  // 请求参数: { username, password }
  // 返回: { token: "xxx", expiresIn: 7200 }
  
  const response = await this.axiosInstance.post('/api/login', {
    username: config.oioc.username,
    password: config.oioc.password,
  });
  
  this.token = response.data.token;
  this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  
  return response.data;
}
```

### 2. 创建产品
```javascript
async createProduct(productData) {
  // POST /api/product/create
  // 请求参数: { name, sku, spec, ... }
  // 返回: { productId: "xxx", success: true }
  
  // 示例实现
  const response = await this.axiosInstance.post('/api/product/create', productData);
  return response.data;
}
```

### 3. 查询产品
```javascript
async getProduct(productId) {
  // GET /api/product/{productId}
  // 返回: { productId, name, sku, ... }
  
  const response = await this.axiosInstance.get(`/api/product/${productId}`);
  return response.data;
}
```

### 4. 创建代理商
```javascript
async createAgent(agentData) {
  // POST /api/agent/create
  // 请求参数: { name, contact, phone, ... }
  // 返回: { agentId: "xxx", success: true }
  
  const response = await this.axiosInstance.post('/api/agent/create', agentData);
  return response.data;
}
```

### 5. 查询代理商
```javascript
async getAgent(agentId) {
  // GET /api/agent/{agentId}
  // 返回: { agentId, name, contact, ... }
  
  const response = await this.axiosInstance.get(`/api/agent/${agentId}`);
  return response.data;
}
```

### 6. 创建入库单
```javascript
async createInboundOrder(orderData) {
  // POST /api/order/inbound/create
  // 请求参数: { 
  //   productId: "xxx",
  //   quantity: 100,
  //   codes: ["CODE_1", "CODE_2", ...],
  //   warehouseId: "xxx"
  // }
  // 返回: { orderId: "xxx", success: true }
  
  const response = await this.axiosInstance.post('/api/order/inbound/create', orderData);
  return response.data;
}
```

### 7. 创建出库单
```javascript
async createOutboundOrder(orderData) {
  // POST /api/order/outbound/create
  // 请求参数: {
  //   orderId: "xxx",  // 有赞订单号
  //   items: [
  //     { productId: "xxx", skuId: "xxx", quantity: 2 }
  //   ],
  //   address: { name, phone, province, city, district, address }
  // }
  // 返回: { orderId: "xxx", success: true }
  
  const response = await this.axiosInstance.post('/api/order/outbound/create', orderData);
  return response.data;
}
```

### 8. 创建退货单
```javascript
async createReturnOrder(orderData) {
  // POST /api/order/return/create
  // 请求参数: {
  //   orderId: "xxx",
  //   refundId: "xxx",
  //   items: [...]
  // }
  // 返回: { returnOrderId: "xxx", success: true }
  
  const response = await this.axiosInstance.post('/api/order/return/create', orderData);
  return response.data;
}
```

### 9. 查询订单条码
```javascript
async getOrderCodes(orderId) {
  // GET /api/order/{orderId}/codes
  // 返回: { codes: [{ code: "xxx", status: "xxx", ... }] }
  
  const response = await this.axiosInstance.get(`/api/order/${orderId}/codes`);
  return response.data;
}
```

### 10. 查询入库订单详情
```javascript
async getInboundOrderDetail(orderId) {
  // GET /api/order/inbound/{orderId}
  // 返回: { orderId, productId, quantity, codes: [...], status: "xxx" }
  
  const response = await this.axiosInstance.get(`/api/order/inbound/${orderId}`);
  return response.data;
}
```

### 11. 查询出库订单详情
```javascript
async getOutboundOrderDetail(orderId) {
  // GET /api/order/outbound/{orderId}
  // 返回: { orderId, logisticsNo, codes: [...], status: "xxx" }
  
  const response = await this.axiosInstance.get(`/api/order/outbound/${orderId}`);
  return response.data;
}
```

### 12. 查询退货订单详情
```javascript
async getReturnOrderDetail(orderId) {
  // GET /api/order/return/{orderId}
  // 返回: { orderId, codes: [...], status: "xxx" }
  
  const response = await this.axiosInstance.get(`/api/order/return/${orderId}`);
  return response.data;
}
```

---

## 有赞API (`src/clients/youzan.js`)

### 1. 获取Token
```javascript
async getToken() {
  // 参考文档: https://doc.youzanyun.com/doc#/content/27032/27033
  const resp = await youzanyun.token.get({
    authorize_type: 'silent',
    client_id: this.clientId,
    client_secret: this.clientSecret,
    grant_id: this.grantId,
    refresh: true,
  });
  
  this.token = resp.data.access_token;
  return this.token;
}
```

### 2. 调用API通用方法
```javascript
async callApi(api, version, params) {
  // 参考文档: https://doc.youzanyun.com/doc#/content/27032/27034
  if (!this.token) {
    await this.getToken();
  }
  
  const resp = await youzanyun.client.call({
    api,
    version,
    token: this.token,
    params,
  });
  
  return resp.data;
}
```

### 3. 更新库存
```javascript
async updateStock(skuId, quantity, action = 'add') {
  // API: youzan.item.quantity.update
  // 版本: 1.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { sku_id, quantity, action_type }
  // action_type: 'add' 增加, 'subtract' 减少
  
  return await this.callApi('youzan.item.quantity.update', '1.0.0', {
    sku_id: skuId,
    quantity: quantity,
    action_type: action,
  });
}
```

### 4. 获取订单详情
```javascript
async getOrder(orderId) {
  // API: youzan.trade.get
  // 版本: 4.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { tid }
  
  return await this.callApi('youzan.trade.get', '4.0.0', {
    tid: orderId,
  });
}
```

### 5. 订单发货
```javascript
async shipOrder(orderId, logisticsData) {
  // API: youzan.logistics.online.confirm
  // 版本: 1.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { tid, out_stype, out_sid, ... }
  
  return await this.callApi('youzan.logistics.online.confirm', '1.0.0', {
    tid: orderId,
    out_stype: logisticsData.out_stype,
    out_sid: logisticsData.out_sid,
  });
}
```

### 6. 更新订单备注
```javascript
async updateOrderRemark(orderId, remark) {
  // API: youzan.trade.remark.update
  // 版本: 1.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { tid, remark }
  
  return await this.callApi('youzan.trade.remark.update', '1.0.0', {
    tid: orderId,
    remark: remark,
  });
}
```

### 7. 获取商品详情
```javascript
async getProduct(itemId) {
  // API: youzan.item.get
  // 版本: 1.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { item_id }
  
  return await this.callApi('youzan.item.get', '1.0.0', {
    item_id: itemId,
  });
}
```

### 8. 处理退款
```javascript
async handleRefund(orderId, refundData) {
  // API: youzan.trade.refund.get
  // 版本: 1.0.0
  // 文档: https://doc.youzanyun.com/doc#/content/27032/27034
  // 参数: { tid }
  
  return await this.callApi('youzan.trade.refund.get', '1.0.0', {
    tid: orderId,
  });
}
```

---

## 有赞Webhook事件类型

### 订单相关
- `trade_TradeCreated` - 订单创建
- `trade_TradePaid` - 订单支付
- `trade_TradeSold` - 订单完成
- `trade_TradeClosed` - 订单关闭
- `trade_TradeRefundCreated` - 退款申请
- `trade_TradeRefundSuccess` - 退款成功

### 物流相关
- `trade_TradeExpressCreated` - 物流创建
- `trade_TradeExpressUpdated` - 物流更新

### 商品相关
- `item_ItemAdd` - 商品创建
- `item_ItemUpdate` - 商品更新
- `item_ItemDelete` - 商品删除

参考文档: https://doc.youzanyun.com/doc#/content/27032/27035

---

## 第三方一物一码Webhook事件类型

### 入库相关
- `inbound` - 入库通知
- `inbound_complete` - 入库完成

### 出库相关
- `outbound` - 出库通知
- `outbound_complete` - 出库完成

### 退货相关
- `return_created` - 退货单创建
- `return_complete` - 退货完成

---

## 开发建议

1. **错误处理**: 每个API调用都应该有try-catch
2. **重试机制**: 网络错误时自动重试
3. **日志记录**: 记录所有API调用和响应
4. **Token刷新**: 自动刷新过期的token
5. **请求限流**: 避免频繁调用API
6. **数据验证**: 验证请求参数和响应数据
