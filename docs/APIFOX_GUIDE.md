# 如何使用Apifox生成代码并整合到项目

## 一、在Apifox中选择代码生成方式

### 推荐选择：**JavaScript → axios**

原因：
1. ✅ 项目已经安装了axios
2. ✅ axios功能强大，支持拦截器、自动转换JSON
3. ✅ 代码简洁易读
4. ✅ 在Node.js环境中运行良好

### 其他选项说明：
- **fetch**: 浏览器原生API，但在Node.js中需要额外安装node-fetch
- **jQuery**: 主要用于浏览器环境，不适合Node.js后端项目
- **JavaScript**: 可能生成基于XMLHttpRequest的代码，较老旧

---

## 二、在Apifox中生成代码的步骤

### 步骤1：打开API文档
在Apifox中找到你的接口，例如"登录"接口

### 步骤2：生成代码
1. 点击接口右侧的"生成代码"按钮
2. 选择 **JavaScript** → **axios**
3. 复制生成的代码

### 步骤3：示例代码
Apifox生成的代码可能类似这样：

```javascript
// 登录接口
axios({
  method: 'post',
  url: 'https://v6api.xolo.kim/api/v1/login',
  headers: { 
    'Content-Type': 'application/json'
  },
  data: {
    username: 'cangku001',
    password: '123456'
  }
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error(error);
});
```

---

## 三、如何整合到项目中

### 方法1：直接使用（推荐）

将Apifox生成的代码改造为适合项目的格式：

```javascript
// 原始Apifox生成的代码
axios({
  method: 'post',
  url: 'https://v6api.xolo.kim/api/v1/login',
  headers: { 
    'Content-Type': 'application/json'
  },
  data: {
    username: 'cangku001',
    password: '123456'
  }
})

// 改造后的代码（整合到项目中）
async login() {
  try {
    const response = await this.axiosInstance.post('/login', {
      username: config.oioc.username,
      password: config.oioc.password,
    });
    
    this.token = response.data.token;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

### 方法2：使用async/await（推荐）

```javascript
// Apifox生成的Promise风格
axios.post('/login', { username: 'xxx', password: 'xxx' })
  .then(response => { console.log(response.data); })
  .catch(error => { console.error(error); });

// 改造为async/await风格
async login() {
  try {
    const response = await this.axiosInstance.post('/login', {
      username: config.oioc.username,
      password: config.oioc.password,
    });
    
    this.token = response.data.token;
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

---

## 四、完整示例：整合登录接口

### 1. Apifox生成的原始代码
```javascript
axios({
  method: 'post',
  url: 'https://v6api.xolo.kim/api/v1/auth/login',
  headers: { 
    'Content-Type': 'application/json'
  },
  data: {
    username: 'cangku001',
    password: '123456'
  }
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error(error);
});
```

### 2. 整合到 oioc.js 中
```javascript
async login() {
  try {
    // 使用项目的axiosInstance，baseURL已经配置好了
    const response = await this.axiosInstance({
      method: 'post',
      url: '/auth/login',  // 注意：只写相对路径，baseURL会自动拼接
      headers: { 
        'Content-Type': 'application/json'
      },
      data: {
        username: config.oioc.username,
        password: config.oioc.password,
      }
    });
    
    // 保存token
    this.token = response.data.token;
    
    // 设置后续请求的Authorization头
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

### 3. 简化版本（推荐）
```javascript
async login() {
  try {
    const response = await this.axiosInstance.post('/auth/login', {
      username: config.oioc.username,
      password: config.oioc.password,
    });
    
    this.token = response.data.token;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

---

## 五、其他接口示例

### 创建产品接口
```javascript
// Apifox生成的代码
axios.post('https://v6api.xolo.kim/api/v1/products', {
  name: '橙花精油',
  sku: 'SKU_001',
  spec: '50ml'
})

// 整合到项目中
async createProduct(productData) {
  try {
    const response = await this.axiosInstance.post('/products', productData);
    return response.data;
  } catch (error) {
    console.error('创建产品失败:', error);
    throw error;
  }
}
```

### 查询产品接口
```javascript
// Apifox生成的代码
axios.get('https://v6api.xolo.kim/api/v1/products/123')

// 整合到项目中
async getProduct(productId) {
  try {
    const response = await this.axiosInstance.get(`/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error('查询产品失败:', error);
    throw error;
  }
}
```

### 创建入库单接口
```javascript
// Apifox生成的代码
axios.post('https://v6api.xolo.kim/api/v1/orders/inbound', {
  productId: 'PRODUCT_001',
  quantity: 100,
  codes: ['CODE_1', 'CODE_2', ...]
})

// 整合到项目中
async createInboundOrder(orderData) {
  try {
    const response = await this.axiosInstance.post('/orders/inbound', orderData);
    return response.data;
  } catch (error) {
    console.error('创建入库单失败:', error);
    throw error;
  }
}
```

---

## 六、注意事项

### 1. URL处理
- ❌ 不要使用完整URL：`https://v6api.xolo.kim/api/v1/login`
- ✅ 使用相对路径：`/login` 或 `/auth/login`
- 原因：baseURL已经在axiosInstance中配置好了

### 2. 请求方法
Apifox可能生成两种格式：
```javascript
// 格式1：axios(config)
axios({
  method: 'post',
  url: '/login',
  data: { username: 'xxx' }
})

// 格式2：axios.method()
axios.post('/login', { username: 'xxx' })
```
两种都可以，推荐使用格式2，更简洁。

### 3. 错误处理
一定要添加try-catch，避免程序崩溃：
```javascript
async someMethod() {
  try {
    const response = await this.axiosInstance.post('/xxx', data);
    return response.data;
  } catch (error) {
    console.error('请求失败:', error);
    throw error;  // 重新抛出，让调用者处理
  }
}
```

### 4. 响应数据
axios会将响应包装在一个对象中：
```javascript
const response = await axios.post('/login', data);
// response.data 才是真正的响应数据
// response.status 是HTTP状态码
// response.headers 是响应头
```

---

## 七、快速整合流程

1. **在Apifox中生成代码**：选择 JavaScript → axios
2. **复制核心部分**：只复制URL、method、data等关键信息
3. **改造为async/await**：使用try-catch包裹
4. **使用axiosInstance**：替换axios为this.axiosInstance
5. **使用相对路径**：去掉baseURL部分
6. **添加错误处理**：console.error记录错误

---

## 八、测试生成的代码

创建一个测试文件来验证接口：

```javascript
// test-oioc-api.js
const oiocClient = require('./src/clients/oioc');

async function testLogin() {
  try {
    const result = await oiocClient.login();
    console.log('登录成功:', result);
  } catch (error) {
    console.error('登录失败:', error.message);
  }
}

testLogin();
```

运行测试：
```bash
node test-oioc-api.js
```
