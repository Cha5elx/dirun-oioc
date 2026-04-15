# 部署指南

## 📦 部署脚本说明

本项目提供了4个部署脚本，支持灵活的部署方式：

### 1. `deploy-local.sh` - 本地推送脚本
**执行位置**：本地开发机器

**功能**：
- 初始化Git仓库（如果未初始化）
- 提交代码更改
- 推送到GitHub

**使用方法**：
```bash
bash deploy-local.sh
```

---

### 2. `deploy-server.sh` - 服务器部署脚本
**执行位置**：服务器

**功能**：
- 安装Node.js、PM2、Nginx
- 克隆项目代码
- 安装依赖
- 构建前端
- 配置环境变量
- 配置防火墙
- 启动服务
- 配置Nginx反向代理

**使用方法**：
```bash
# 首次部署
bash deploy-server.sh
```

**注意事项**：
- 需要修改脚本中的 `GITHUB_REPO` 变量为你的实际GitHub仓库地址
- 需要手动编辑 `.env` 文件填入真实配置

---

### 3. `update-server.sh` - 服务器更新脚本
**执行位置**：服务器

**功能**：
- 备份当前版本
- 拉取最新代码
- 更新依赖
- 重新构建前端（可选）
- 重启服务

**使用方法**：
```bash
bash update-server.sh
```

---

### 4. `deploy-all.sh` - 一键部署脚本
**执行位置**：本地开发机器

**功能**：
- 自动推送代码到GitHub
- 自动SSH到服务器执行部署

**使用方法**：
```bash
# 首次使用前，修改脚本中的配置：
# SERVER_USER="root"
# SERVER_IP="your-server-ip"

bash deploy-all.sh
```

---

## 🚀 快速开始

### 方式一：分步部署（推荐新手）

#### 步骤1：本地推送代码
```bash
# 在本地项目根目录
bash deploy-local.sh
```

#### 步骤2：服务器部署
```bash
# SSH登录服务器
ssh root@your-server-ip

# 上传部署脚本
# 方式1: 使用scp上传
# 本地执行: scp deploy-server.sh root@your-server-ip:/tmp/

# 方式2: 直接在服务器创建脚本
vi /tmp/deploy-server.sh
# 粘贴脚本内容，保存退出

# 执行部署
bash /tmp/deploy-server.sh

# 配置环境变量
cd /opt/dirun_oioc
vi .env
# 填入真实配置

# 重启服务
pm2 restart dirun-oioc
```

---

### 方式二：一键部署（推荐熟练用户）

```bash
# 修改配置
vi deploy-all.sh
# 修改 SERVER_USER 和 SERVER_IP

# 执行一键部署
bash deploy-all.sh
```

---

## ⚙️ 环境变量配置

部署后必须配置 `.env` 文件：

```bash
cd /opt/dirun_oioc
vi .env
```

必需配置项：
```env
# 有赞配置
YOUZAN_CLIENT_ID=your_client_id
YOUZAN_CLIENT_SECRET=your_client_secret
YOUZAN_GRANT_ID=your_grant_id
YOUZAN_DRY_RUN=false

# OIOC配置
OIOC_BASE_URL=https://api.oioc-provider.com
OIOC_USERNAME=your_username
OIOC_PASSWORD=your_password

# 服务器配置
PORT=3000
NODE_ENV=production
```

---

## 🔧 常用命令

### PM2 进程管理
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs dirun-oioc

# 实时日志
pm2 logs dirun-oioc --lines 100

# 重启服务
pm2 restart dirun-oioc

# 停止服务
pm2 stop dirun-oioc

# 删除服务
pm2 delete dirun-oioc
```

### Nginx 管理
```bash
# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 防火墙管理
```bash
# 查看开放的端口
sudo firewall-cmd --list-ports

# 开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 关闭端口
sudo firewall-cmd --permanent --remove-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 🔄 更新流程

### 本地更新
```bash
# 修改代码后
bash deploy-local.sh
```

### 服务器更新
```bash
# SSH登录服务器
ssh root@your-server-ip

# 执行更新脚本
cd /opt/dirun_oioc
bash update-server.sh
```

---

## 🐛 故障排查

### 1. 服务无法启动
```bash
# 查看详细错误日志
pm2 logs dirun-oioc --err

# 检查端口占用
netstat -tlnp | grep 3000

# 检查环境变量
cd /opt/dirun_oioc
cat .env
```

### 2. 前端无法访问
```bash
# 检查前端构建
ls -la public/

# 重新构建前端
cd admin
npm run build
cp -r dist/* ../public/
```

### 3. Nginx 502错误
```bash
# 检查服务是否运行
pm2 status

# 检查Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 4. 数据库权限问题
```bash
# 修改数据库文件权限
sudo chown -R $USER:$USER /opt/dirun_oioc/database
chmod -R 755 /opt/dirun_oioc/database
```

---

## 📊 性能优化

### 1. PM2 集群模式
```bash
# 启动多个实例
pm2 start index.js --name dirun-oioc -i max

# 或修改启动命令
pm2 start index.js --name dirun-oioc --instances 4
```

### 2. Nginx 缓存配置
在 `/etc/nginx/conf.d/dirun-oioc.conf` 中添加：
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 开启 Gzip 压缩
在 `/etc/nginx/nginx.conf` 中添加：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

---

## 🔐 安全建议

1. **修改SSH端口**
```bash
sudo vi /etc/ssh/sshd_config
# 修改 Port 22 为其他端口
sudo systemctl restart sshd
```

2. **禁用root登录**
```bash
# 创建普通用户
sudo adduser deploy
sudo usermod -aG wheel deploy

# 修改SSH配置
sudo vi /etc/ssh/sshd_config
# PermitRootLogin no
```

3. **配置SSL证书**
```bash
# 安装Certbot
sudo yum install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 0 1 * * /usr/bin/certbot renew --quiet
```

---

## 📝 部署检查清单

- [ ] 修改 `deploy-server.sh` 中的 GitHub 仓库地址
- [ ] 修改 `deploy-all.sh` 中的服务器IP和用户名
- [ ] 配置 `.env` 环境变量
- [ ] 检查服务是否正常启动
- [ ] 测试健康检查接口
- [ ] 测试Webhook回调地址
- [ ] 配置Nginx反向代理（可选）
- [ ] 配置SSL证书（可选）
- [ ] 设置防火墙规则
- [ ] 配置日志轮转

---

## 🆘 获取帮助

如遇问题，请检查：
1. 服务日志：`pm2 logs dirun-oioc`
2. Nginx日志：`/var/log/nginx/error.log`
3. 系统日志：`/var/log/messages`

---

## 📅 维护建议

1. **定期备份数据库**
```bash
# 添加定时任务
crontab -e
# 每天凌晨2点备份
0 2 * * * cp /opt/dirun_oioc/database/db.json /opt/backups/db_$(date +\%Y\%m\%d).json
```

2. **定期更新依赖**
```bash
cd /opt/dirun_oioc
npm update
cd admin && npm update
```

3. **监控服务状态**
```bash
# 安装PM2监控
pm2 install pm2-logrotate
```
