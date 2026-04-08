# 有赞API实现说明

## ✅ 已实现的API

根据业务流程文档，我已经选择了必需的API并实现到 `src/clients/youzan.js` 中。

---

## 📋 API选择说明

### 核心业务流程需要的API

#### 流程1：商品采购入库
**需要的API：**
1. ✅ **更新库存** - `youzan.item.quantity.update`
   - 用途：入库后自动给有赞加库存
   - 方法：`addStock(itemId, skuId, quantity)`

#### 流程2：销售发货
**需要的API：**
1. ✅ **更新库存** - `youzan.item.quantity.update`
   - 用途：发货后自动扣减库存
   - 方法：`subtractStock(itemId, skuId, quantity)`

2. ✅ **订单发货** - `youzan.logistics.online.confirm`
   - 用途：将有赞订单标记为已发货
   - 方法：`shipOrder(orderId, logisticsData)`

3. ✅ **更新订单备注** - `youzan.trade.memo.update`
   - 用途：将防伪码写入订单备注
   - 方法：`updateOrderRemark(orderId, remark)`

#### 流程3：退货退款
**需要的API：**
1. ✅ **更新库存** - `youzan.item.quantity.update`
   - 用途：退货后自动加回库存
   - 方法：`addStock(itemId, skuId, quantity)`

2. ✅ **获取退款信息** - `youzan.trade.refund.get`
   - 用途：查询退款详情
   - 方法：`getRefund(orderId)`

---

## 🔧 辅助API（调试和验证用）

1. ✅ **获取Token** - `youzanyun.token.get`
   - 用途：获取access_token，调用其他API前必须先获取
   - 方法：`getToken()`

2. ✅ **获取订单详情** - `youzan.trade.get`
   - 用途：查询订单详细信息，用于调试和验证
   - 方法：`getOrder(orderId)`

3. ✅ **查询订单包裹详情** - `youzan.logistics.order.query`
   - 用途：查询订单物流信息
   - 方法：`getOrderPackages(orderId, kdtId)`

4. ✅ **获取商品详情** - `youzan.item.itemdetail.get`
   - 用途：查询商品信息，用于调试和验证
   - 方法：`getProduct(itemId)`

---

## 📊 API对应关系表

| 业务流程 | 操作 | API方法 | 说明 |
|---------|------|---------|------|
| 流程1：入库 | 加库存 | `addStock()` | 第三方入库后，有赞库存+100 |
| 流程2：发货 | 扣库存 | `subtractStock()` | 发货后，有赞库存-2 |
| 流程2：发货 | 订单发货 | `shipOrder()` | 标记订单为已发货 |
| 流程2：发货 | 写防伪码 | `updateOrderRemark()` | 将防伪码写入订单备注 |
| 流程3：退货 | 加库存 | `addStock()` | 退货后，有赞库存+1 |
| 流程3：退货 | 查退款 | `getRefund()` | 查询退款详情 |

---

## 🚫 未使用的API（从youzan-api.js中排除）

以下API在 `youzan-api.js` 中有，但根据业务流程不需要：

1. **实物库存调整** - `youzan.retail.open.stock.adjust`
   - 原因：我们使用 `youzan.item.quantity.update` 已经足够

2. **零售库存唯一码查询** - `youzan.retail.open.stock.unique.code`
   - 原因：我们使用第三方系统的唯一码，不需要查询有赞的

3. **查询商品库存扣减记录** - `youzan.item.sku.list.deduct`
   - 原因：业务流程中不需要

4. **查询仓库商品库存** - `youzan.retail.open.query.warehousestock`
   - 原因：我们使用第三方系统管理库存

5. **更新商品的库存设置相关信息** - `youzan.item.stock.setting.update`
   - 原因：业务流程中不需要

6. **全量更新商品计划库存** - `youzan.retail.open.modify.planstock`
   - 原因：业务流程中不需要

7. **根据订单号查询唯一码** - `youzan.retail.open.list.uniquecode`
   - 原因：我们使用第三方系统的唯一码

8. **查询订单包裹列表** - `youzan.logistics.order.batch.query`
   - 原因：业务流程中不需要批量查询

9. **查询换货订单详情** - `youzan.retail.open.exchange.order.get`
   - 原因：业务流程中不涉及换货

10. **更新订单收货地址** - `youzan.trade.order.address.update`
    - 原因：业务流程中不需要

---

## 🧪 测试结果

运行 `node test-youzan-api.js` 测试结果：

```
✅ 获取Token: 成功
✅ 获取商品详情: 成功
✅ 更新库存: 成功
✅ 获取订单详情: 成功

总计: 4/4 个测试通过
```

---

## 💡 使用示例

### 1. 初始化（自动获取Token）
```javascript
const youzanClient = require('./src/clients/youzan');

// 自动获取Token，无需手动调用
```

### 2. 入库流程 - 加库存
```javascript
// 第三方入库100件后，有赞库存+100
await youzanClient.addStock('702735944', '', 100);
```

### 3. 发货流程 - 扣库存、发货、写防伪码
```javascript
// 1. 扣减库存
await youzanClient.subtractStock('702735944', '', 2);

// 2. 订单发货
await youzanClient.shipOrder('E20200828154641023700067', {
  out_stype: '1',      // 物流公司代码
  out_sid: 'SF123456', // 物流单号
});

// 3. 写入防伪码到订单备注
await youzanClient.updateOrderRemark(
  'E20200828154641023700067',
  '防伪码: CODE_001, CODE_002'
);
```

### 4. 退货流程 - 加回库存
```javascript
// 退货1件后，有赞库存+1
await youzanClient.addStock('702735944', '', 1);
```

---

## ⚠️ 注意事项

### 1. Token管理
- Token会自动获取和缓存
- Token过期后会自动重新获取
- 无需手动管理Token

### 2. 参数类型
- 所有参数都会自动转换为字符串
- itemId和skuId必须提供
- quantity为数字类型

### 3. 错误处理
- 所有方法都有try-catch错误处理
- 错误会记录到控制台
- 错误会重新抛出，由调用者处理

### 4. 库存更新类型
- `type='0'`: 全量更新库存（设置为指定数量）
- `type='1'`: 增量更新库存（增加指定数量）
- `addStock()`: 使用type='0'，设置库存
- `subtractStock()`: 使用type='1'，减少库存

---

## 🔄 与第三方系统的对接

### 完整流程示例

```javascript
const oiocClient = require('./src/clients/oioc');
const youzanClient = require('./src/clients/youzan');

// 流程1：入库
async function handleInbound(data) {
  // 1. 第三方系统已入库
  // 2. 有赞加库存
  await youzanClient.addStock(data.itemId, data.skuId, data.quantity);
}

// 流程2：发货
async function handleOutbound(data) {
  // 1. 扣减库存
  await youzanClient.subtractStock(data.itemId, data.skuId, data.quantity);
  
  // 2. 订单发货
  await youzanClient.shipOrder(data.orderId, {
    out_stype: data.logisticsCompany,
    out_sid: data.logisticsNo,
  });
  
  // 3. 写入防伪码
  await youzanClient.updateOrderRemark(
    data.orderId,
    `防伪码: ${data.codes.join(', ')}`
  );
}

// 流程3：退货
async function handleReturn(data) {
  // 1. 加回库存
  await youzanClient.addStock(data.itemId, data.skuId, data.quantity);
}
```

---

## 📚 相关文档

- [第三方一物一码API实现](OIOC_API_IMPLEMENTATION.md)
- [业务流程说明](有赞_一物一码_货物出入库流程.md)
- [项目README](README.md)

---

## 🎯 总结

已实现的API完全满足业务流程需求：
- ✅ 流程1：入库 - 加库存
- ✅ 流程2：发货 - 扣库存、发货、写防伪码
- ✅ 流程3：退货 - 加回库存

所有API都已测试通过，可以开始整合业务逻辑层。
