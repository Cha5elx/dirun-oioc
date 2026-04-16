# 部署指南

## 前置条件

- Node.js 16.x 或更高版本
- npm 或 yarn
- Git
- PM2（用于生产环境）
- Nginx（可选，用于反向代理）

## 本地开发环境搭建

### 1. 克隆仓库

```bash
git clone <repository-url>
cd dirun_oioc
```

### 2. 安装依赖

```bash
# 后端依赖
npm install

# 前端依赖
cd admin
npm install
cd ..
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入配置
# 必需配置项：
# - YOUZAN_CLIENT_ID
# - YOUZAN_CLIENT_SECRET
# - YOUZAN_GRANT_ID
# - OIOC_BASE_URL
# - OIOC_USERNAME
# - OIOC_PASSWORD
```

### 4. 构建前端

```bash
cd admin
npm run build
cp -r dist/* ../public/
cd ..
```

### 5. 启动开发服务器

```bash
# 启动后端（自动重载）
npm run dev

# 或正常启动后端
npm start

# 在另一个终端启动前端开发服务器
npm run admin:dev
```

### 6. 验证安装

- 健康检查：http://localhost:3000/health
- 管理后台：http://localhost:3000
- 默认账号：admin / admin123

## 服务器部署

### 方式一：使用部署脚本

```bash
# 在项目根目录执行
bash scripts/deploy-all.sh
```

此脚本将：
1. 推送代码到 GitHub
2. 通过 SSH 部署到服务器
3. 安装依赖
4. 构建前端
5. 配置环境变量
6. 使用 PM2 启动服务

### 方式二：手动部署

#### 步骤 1：准备服务器

```bash
# 安装 Node.js（CentOS/RHEL）
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx（可选）
sudo yum install -y nginx
sudo systemctl enable nginx
```

#### 步骤 2：克隆并设置

```bash
# 创建项目目录
sudo mkdir -p /opt/dirun_oioc
cd /opt/dirun_oioc

# 克隆仓库
git clone <repository-url> .

# 安装依赖
npm install
cd admin && npm install && npm run build && cp -r dist/* ../public/ && cd ..
```

#### 步骤 3：配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env
vi .env

# 设置生产环境值：
# NODE_ENV=production
# YOUZAN_DRY_RUN=false
```

#### 步骤 4：启动服务

```bash
# 使用 PM2 启动
pm2 start index.js --name dirun-oioc

# 设置开机自启
pm2 startup
pm2 save
```

#### 步骤 5：配置 Nginx（可选）

```nginx
# /etc/nginx/conf.d/dirun-oioc.conf
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 测试并重启 Nginx
sudo nginx -t
sudo systemctl restart nginx
```

## 云函数部署

### 腾讯云（serverless.yml）

```bash
# 安装 Serverless Framework
npm install -g serverless

# 部署
serverless deploy
```

### 阿里云（template.yaml）

```bash
# 安装 Fun
npm install -g @alicloud/fun

# 部署
fun deploy
```

## 部署后验证

### 1. 健康检查

```bash
curl http://localhost:3000/health
# 预期结果：{"status":"ok","timestamp":"..."}
```

### 2. 管理员登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 预期结果：{"code":0,"data":{"token":"..."}}
```

### 3. Webhook 端点

```bash
# 测试有赞 webhook
curl -X POST http://localhost:3000/webhook/youzan \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'

# 测试 OIOC webhook
curl -X POST http://localhost:3000/webhook/oioc \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'
```

## 服务管理

### PM2 命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs dirun-oioc

# 重启服务
pm2 restart dirun-oioc

# 停止服务
pm2 stop dirun-oioc

# 删除服务
pm2 delete dirun-oioc
```

### 日志文件

- PM2 日志：`~/.pm2/logs/`
- 应用日志：`logs/` 目录
- 同步日志：存储在 `database/db.json`

## 故障排查

### 常见问题

1. **端口已被占用**
   ```bash
   # 查找占用 3000 端口的进程
   lsof -i :3000
   # 终止进程
   kill -9 <PID>
   ```

2. **权限被拒绝**
   ```bash
   # 修复权限
   sudo chown -R $USER:$USER /opt/dirun_oioc
   ```

3. **数据库初始化失败**
   ```bash
   # 检查数据库文件
   ls -la database/
   # 重新初始化
   rm database/db.json
   npm start
   ```

4. **前端构建失败**
   ```bash
   # 清除 node_modules 并重新安装
   cd admin
   rm -rf node_modules
   npm install
   npm run build
   ```

## 安全检查清单

- [ ] 修改默认管理员密码
- [ ] 在生产环境设置 `YOUZAN_DRY_RUN=false`
- [ ] 配置防火墙规则
- [ ] 启用 HTTPS（通过 Nginx）
- [ ] 设置日志轮转
- [ ] 配置数据库备份
- [ ] 检查 `.gitignore` 确保敏感文件不被提交
