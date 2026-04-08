# Node.js (JavaScript) 语法速查手册

> 本文档整理了项目中用到的所有JavaScript语法，并与Python进行对比说明。

---

## 一、模块导入导出

### JavaScript
```javascript
// 导入模块
const axios = require('axios');
const config = require('../config');

// 导出模块（单例模式）
module.exports = new OiocClient();

// 导出类
module.exports = OiocClient;
```

### Python 对比
```python
# 导入模块
import axios
from config import config

# 导出（Python中没有直接对应的概念）
# 通常通过 __init__.py 或直接导入类
```

**说明**：
- JavaScript使用 `require()` 导入模块
- JavaScript使用 `module.exports` 导出模块
- Python使用 `import` 导入模块

---

## 二、异步函数 (Async/Await)

### JavaScript
```javascript
// 定义异步函数
async function testLogin() {
  try {
    const result = await oiocClient.login();
    console.log('登录成功:', result);
    return result;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 调用异步函数
testLogin().catch(console.error);
```

### Python 对比
```python
# 定义异步函数
async def test_login():
    try:
        result = await oioc_client.login()
        print('登录成功:', result)
        return result
    except Exception as error:
        print('登录失败:', error)
        raise error

# 调用异步函数
import asyncio
asyncio.run(test_login())
```

**说明**：
- JavaScript的 `async/await` 与Python的 `async/await` 非常相似
- JavaScript用 `try-catch`，Python用 `try-except`
- JavaScript用 `console.log()`，Python用 `print()`

---

## 三、箭头函数

### JavaScript
```javascript
// 箭头函数
const testLogin = async () => {
  const result = await oiocClient.login();
  return result;
};

// 单行箭头函数
const add = (a, b) => a + b;

// 带函数体的箭头函数
const multiply = (a, b) => {
  return a * b;
};
```

### Python 对比
```python
# Python使用lambda表达式（类似箭头函数）
add = lambda a, b: a + b

# 但Python通常使用普通函数
def add(a, b):
    return a + b
```

**说明**：
- JavaScript箭头函数 `() => {}` 类似Python的lambda
- 但JavaScript箭头函数可以包含多行代码
- 箭头函数自动绑定 `this`

---

## 四、类和构造函数

### JavaScript
```javascript
class OiocClient {
  constructor() {
    this.baseUrl = config.oioc.baseUrl;
    this.token = null;
    this.syskey = 'DIRUN';
  }

  async login() {
    const response = await this.axiosInstance.post('/login/access-token', {
      account: config.oioc.username,
      password: config.oioc.password,
    });
    this.token = response.data.token;
    return response.data;
  }
}
```

### Python 对比
```python
class OiocClient:
    def __init__(self):
        self.base_url = config.oioc.base_url
        self.token = None
        self.syskey = 'DIRUN'
    
    async def login(self):
        response = await self.axios_instance.post('/login/access-token', {
            'account': config.oioc.username,
            'password': config.oioc.password,
        })
        self.token = response.data.token
        return response.data
```

**说明**：
- JavaScript用 `constructor()`，Python用 `__init__()`
- JavaScript用 `this`，Python用 `self`
- JavaScript方法不需要 `function` 关键字
- Python方法必须有 `self` 参数

---

## 五、对象和字典

### JavaScript
```javascript
// 创建对象
const params = {
  quantity: String(quantity),
  item_id: String(itemId),
  sku_id: skuId ? String(skuId) : '',
  type: type,
};

// 访问属性
console.log(params.quantity);
console.log(params['item_id']);

// 动态添加属性
const queryParams = {};
if (params.productID) queryParams.productID = params.productID;
if (params.productName) queryParams.productName = params.productName;
```

### Python 对比
```python
# 创建字典
params = {
    'quantity': str(quantity),
    'item_id': str(item_id),
    'sku_id': str(sku_id) if sku_id else '',
    'type': type,
}

# 访问属性
print(params['quantity'])

# 动态添加属性
query_params = {}
if params.get('productID'):
    query_params['productID'] = params['productID']
```

**说明**：
- JavaScript对象和Python字典类似
- JavaScript可以用点号访问属性：`obj.key`
- JavaScript也可以用方括号：`obj['key']`
- Python只能用方括号：`dict['key']`

---

## 六、模板字符串

### JavaScript
```javascript
const orderId = 'E20200828154641023700067';
const remark = `防伪码: ${codes.map(c => c.code || c).join(', ')}`;
const url = `/orders/${orderId}`;
const message = `订单 ${orderId} 已发货，物流单号: ${logisticsNo}`;
```

### Python 对比
```python
order_id = 'E20200828154641023700067'
remark = f"防伪码: {', '.join([c.get('code', c) for c in codes])}"
url = f"/orders/{order_id}"
message = f"订单 {order_id} 已发货，物流单号: {logistics_no}"
```

**说明**：
- JavaScript用反引号 `` ` ``，Python用 `f""`
- 两者都使用 `${}` 或 `{}` 插入变量
- JavaScript的模板字符串可以换行

---

## 七、解构赋值

### JavaScript
```javascript
// 对象解构
const { orderId, logisticsNo, codes } = outboundData;

// 数组解构
const [first, second] = codes;

// 函数参数解构
async handleOutbound({ orderId, logisticsNo, codes, itemId, skuId }) {
  // ...
}
```

### Python 对比
```python
# 对象解构（Python中较少使用）
order_id = outbound_data.get('orderId')
logistics_no = outbound_data.get('logisticsNo')
codes = outbound_data.get('codes')

# 数组解构
first, second = codes

# 函数参数解构（Python不支持）
async def handle_outbound(data):
    order_id = data.get('orderId')
    logistics_no = data.get('logisticsNo')
```

**说明**：
- JavaScript的解构赋值非常强大
- Python的解构主要用于元组和列表
- JavaScript可以在函数参数中直接解构

---

## 八、数组方法

### JavaScript
```javascript
// map - 映射
const detailList = items.map(item => ({
  productID: item.item_id,
  expectedQty: item.num,
}));

// filter - 过滤
const successResults = results.filter(r => r.success);

// forEach - 遍历
codes.forEach(code => {
  console.log(code);
});

// join - 连接
const codeStr = codes.map(c => c.code || c).join(', ');

// find - 查找
const item = items.find(item => item.id === '123');
```

### Python 对比
```python
# map - 映射
detail_list = [
    {
        'productID': item['item_id'],
        'expectedQty': item['num'],
    }
    for item in items
]

# filter - 过滤
success_results = [r for r in results if r['success']]

# forEach - 遍历
for code in codes:
    print(code)

# join - 连接
code_str = ', '.join([c.get('code', c) for c in codes])

# find - 查找
item = next((item for item in items if item['id'] == '123'), None)
```

**说明**：
- JavaScript用箭头函数，Python用列表推导式
- JavaScript的 `map` 返回新数组
- Python的列表推导式更简洁

---

## 九、条件语句

### JavaScript
```javascript
// if-else
if (!orderId || !codes || codes.length === 0) {
  throw new Error('缺少必需参数: orderId 或 codes');
}

// 三元运算符
const skuId = skuId ? String(skuId) : '';

// 短路求值
if (itemId) {
  await this.youzanClient.subtractStock(itemId, skuId || '', quantity);
}
```

### Python 对比
```python
# if-else
if not order_id or not codes or len(codes) == 0:
    raise Exception('缺少必需参数: orderId 或 codes')

# 三元运算符
sku_id = str(sku_id) if sku_id else ''

# 短路求值
if item_id:
    await self.youzan_client.subtract_stock(item_id, sku_id or '', quantity)
```

**说明**：
- JavaScript用 `!` 取反，Python用 `not`
- JavaScript用 `||` 或运算，Python用 `or`
- JavaScript用 `&&` 与运算，Python用 `and`
- 三元运算符语法不同

---

## 十、循环

### JavaScript
```javascript
// for循环
for (const code of codes) {
  console.log(code);
}

// for...in（遍历键）
for (const key in params) {
  console.log(key, params[key]);
}

// for...of（遍历值）
for (const item of items) {
  console.log(item);
}
```

### Python 对比
```python
# for循环
for code in codes:
    print(code)

# 遍历键
for key in params:
    print(key, params[key])

# 遍历键值对
for key, value in params.items():
    print(key, value)
```

**说明**：
- JavaScript的 `for...of` 类似Python的 `for...in`
- JavaScript的 `for...in` 遍历键（索引）
- Python的 `for...in` 直接遍历值

---

## 十一、错误处理

### JavaScript
```javascript
try {
  const result = await this.oiocClient.login();
  if (!result || !result.token) {
    throw new Error('第三方系统登录失败：未返回token');
  }
  console.log('✅ 登录成功');
} catch (error) {
  console.error('❌ 登录失败:', error.message);
  throw error;
} finally {
  console.log('执行完成');
}
```

### Python 对比
```python
try:
    result = await self.oioc_client.login()
    if not result or not result.get('token'):
        raise Exception('第三方系统登录失败：未返回token')
    print('✅ 登录成功')
except Exception as error:
    print('❌ 登录失败:', str(error))
    raise
finally:
    print('执行完成')
```

**说明**：
- JavaScript用 `try-catch-finally`
- Python用 `try-except-finally`
- JavaScript用 `throw new Error()`
- Python用 `raise Exception()`

---

## 十二、文件操作

### JavaScript
```javascript
const fs = require('fs');
const path = require('path');

// 检查文件是否存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 写入文件
const logLine = JSON.stringify(logEntry) + '\n';
fs.appendFileSync(this.logFile, logLine);

// 路径拼接
this.logFile = path.join(__dirname, '../../logs/sync.log');
```

### Python 对比
```python
import os
import json

# 检查文件是否存在
if not os.path.exists(log_dir):
    os.makedirs(log_dir, exist_ok=True)

# 写入文件
log_line = json.dumps(log_entry) + '\n'
with open(self.log_file, 'a') as f:
    f.write(log_line)

# 路径拼接
self.log_file = os.path.join(os.path.dirname(__file__), '../../logs/sync.log')
```

**说明**：
- JavaScript用 `fs` 模块
- Python用 `os` 模块
- JavaScript的 `Sync` 后缀表示同步操作
- Python通常用 `with` 语句处理文件

---

## 十三、类型转换

### JavaScript
```javascript
// 转字符串
const quantity = String(100);

// 转数字
const num = Number('123');

// 转布尔值
const bool = Boolean(1);

// 数组转字符串
const str = codes.join(', ');
```

### Python 对比
```python
# 转字符串
quantity = str(100)

# 转数字
num = int('123')

# 转布尔值
bool_val = bool(1)

# 列表转字符串
str_val = ', '.join(codes)
```

**说明**：
- JavaScript用 `String()`、`Number()`、`Boolean()`
- Python用 `str()`、`int()`、`bool()`
- 数组转字符串的方法相同

---

## 十四、对象方法

### JavaScript
```javascript
// Object.keys - 获取所有键
const keys = Object.keys(response.data);

// Object.values - 获取所有值
const values = Object.values(params);

// Object.entries - 获取键值对
const entries = Object.entries(params);
```

### Python 对比
```python
# 获取所有键
keys = params.keys()

# 获取所有值
values = params.values()

# 获取键值对
entries = params.items()
```

**说明**：
- JavaScript需要用 `Object.keys()` 等方法
- Python直接用字典的方法

---

## 十五、默认参数

### JavaScript
```javascript
// 函数默认参数
async updateStock(itemId, skuId, quantity, type = '0') {
  // ...
}

// 对象默认值
const params = {
  out_stype: logisticsData.out_stype || '1',
  out_sid: logisticsData.out_sid || '',
};
```

### Python 对比
```python
# 函数默认参数
async def update_stock(item_id, sku_id, quantity, type='0'):
    # ...

# 字典默认值
params = {
    'out_stype': logistics_data.get('out_stype', '1'),
    'out_sid': logistics_data.get('out_sid', ''),
}
```

**说明**：
- JavaScript用 `||` 提供默认值
- Python用 `dict.get(key, default)` 提供默认值

---

## 十六、展开运算符

### JavaScript
```javascript
// 数组展开
const newArray = [...oldArray, newItem];

// 对象展开
const newParams = {
  ...params,
  quantity: String(quantity),
};

// 函数参数展开
await this.axiosInstance.post('/orders/order-and-detail/', {
  ...orderData,
  orderSource: 'API',
});
```

### Python 对比
```python
# 列表展开
new_array = [*old_array, new_item]

# 字典展开（Python 3.5+）
new_params = {
    **params,
    'quantity': str(quantity),
}

# 函数参数展开
await self.axios_instance.post('/orders/order-and-detail/', {
    **order_data,
    'orderSource': 'API',
})
```

**说明**：
- JavaScript用 `...` 展开运算符
- Python用 `**` 展开字典，`*` 展开列表

---

## 十七、JSON操作

### JavaScript
```javascript
// 对象转JSON字符串
const logLine = JSON.stringify(logEntry) + '\n';

// JSON字符串转对象
const data = JSON.parse(response.data);

// 格式化JSON
const formatted = JSON.stringify(data, null, 2);
```

### Python 对比
```python
import json

# 对象转JSON字符串
log_line = json.dumps(log_entry) + '\n'

# JSON字符串转对象
data = json.loads(response.data)

# 格式化JSON
formatted = json.dumps(data, indent=2)
```

**说明**：
- JavaScript内置 `JSON` 对象
- Python需要 `import json`
- 方法名略有不同

---

## 十八、Axios HTTP请求

### JavaScript
```javascript
const axios = require('axios');

// 创建axios实例
const axiosInstance = axios.create({
  baseURL: this.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// GET请求
const response = await this.axiosInstance.get('/products/', {
  params: queryParams,
});

// POST请求
const response = await this.axiosInstance.post('/login/access-token', {
  account: config.oioc.username,
  password: config.oioc.password,
});
```

### Python 对比
```python
import requests

# 创建session
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
})

# GET请求
response = session.get(f'{base_url}/products/', params=query_params)

# POST请求
response = session.post(f'{base_url}/login/access-token', json={
    'account': config.oioc.username,
    'password': config.oioc.password,
})
```

**说明**：
- JavaScript用 `axios`
- Python用 `requests`
- JavaScript的 `params` 对应Python的 `params`
- JavaScript的 `data` 对应Python的 `json`

---

## 十九、常用快捷语法

### JavaScript
```javascript
// 空值合并运算符
const value = null ?? 'default';  // 'default'

// 可选链操作符
const name = user?.profile?.name;  // 如果user或profile为null，返回undefined

// 逻辑或赋值
let a = null;
a ||= 'default';  // a = 'default'

// 逻辑与赋值
let b = 'value';
b &&= 'new value';  // b = 'new value'
```

### Python 对比
```python
# 空值合并
value = None or 'default'  # 'default'

# 可选链（Python没有，需要判断）
name = user.get('profile', {}).get('name') if user else None

# 逻辑或赋值
a = None
a = a or 'default'

# 逻辑与赋值
b = 'value'
b = b and 'new value'
```

---

## 二十、项目中的典型代码模式

### 模式1：异步函数调用
```javascript
// JavaScript
async function testInbound() {
  try {
    const result = await syncService.handleInbound(inboundData);
    console.log('结果:', result);
    return result.success;
  } catch (error) {
    console.error('错误:', error);
    return false;
  }
}
```

```python
# Python
async def test_inbound():
    try:
        result = await sync_service.handle_inbound(inbound_data)
        print('结果:', result)
        return result['success']
    except Exception as error:
        print('错误:', error)
        return False
```

### 模式2：类定义
```javascript
// JavaScript
class SyncService {
  constructor() {
    this.oiocClient = oiocClient;
    this.youzanClient = youzanClient;
  }

  async handleInbound(inboundData) {
    const { productId, itemId, quantity } = inboundData;
    // ...
  }
}

module.exports = new SyncService();
```

```python
# Python
class SyncService:
    def __init__(self):
        self.oioc_client = oioc_client
        self.youzan_client = youzan_client
    
    async def handle_inbound(self, inbound_data):
        product_id = inbound_data.get('productId')
        item_id = inbound_data.get('itemId')
        quantity = inbound_data.get('quantity')
        # ...

sync_service = SyncService()
```

### 模式3：数组处理
```javascript
// JavaScript
const detailList = items.map(item => ({
  productID: item.item_id,
  expectedQty: item.num,
}));

const successCount = results.filter(r => r.success).length;
```

```python
# Python
detail_list = [
    {
        'productID': item['item_id'],
        'expectedQty': item['num'],
    }
    for item in items
]

success_count = len([r for r in results if r['success']])
```

---

## 二十一、命名约定对比

| 类型 | JavaScript | Python |
|------|-----------|--------|
| 变量名 | `camelCase` | `snake_case` |
| 函数名 | `camelCase` | `snake_case` |
| 类名 | `PascalCase` | `PascalCase` |
| 常量 | `UPPER_CASE` | `UPPER_CASE` |
| 私有属性 | `_private` | `_private` |

---

## 二十二、常见陷阱

### 1. this 绑定
```javascript
// JavaScript中this的绑定问题
class Example {
  constructor() {
    this.name = 'test';
  }

  // 箭头函数自动绑定this
  arrowMethod = () => {
    console.log(this.name);  // 正确
  }

  // 普通方法需要手动绑定
  normalMethod() {
    console.log(this.name);  // 可能出错
  }
}
```

### 2. 异步错误处理
```javascript
// 必须用try-catch包裹await
try {
  const result = await someAsyncFunction();
} catch (error) {
  console.error(error);
}

// 或者用.catch()
someAsyncFunction().catch(console.error);
```

### 3. 对象引用
```javascript
// JavaScript对象是引用传递
const obj1 = { name: 'test' };
const obj2 = obj1;
obj2.name = 'changed';
console.log(obj1.name);  // 'changed' (obj1也被修改了)

// 需要深拷贝
const obj3 = { ...obj1 };  // 浅拷贝
const obj4 = JSON.parse(JSON.stringify(obj1));  // 深拷贝
```

---

## 总结

JavaScript和Python的主要区别：

1. **异步处理**：两者都用 `async/await`，但错误处理不同
2. **对象访问**：JavaScript可以用点号，Python只能用方括号
3. **数组操作**：JavaScript用方法链，Python用列表推导式
4. **this绑定**：JavaScript需要注意this的绑定问题
5. **模块系统**：JavaScript用require/module.exports，Python用import

掌握这些语法后，你就可以轻松阅读和修改这个项目的代码了！
