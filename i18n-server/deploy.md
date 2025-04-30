# i18nexus 翻译管理器部署指南

本指南将帮助你将 i18nexus 翻译管理器部署到远程服务器。

## 系统要求

- Node.js 14.x 或更高版本
- npm 6.x 或更高版本
- 支持 Linux、Windows 或 macOS

## 部署步骤

### 1. 准备服务器

确保服务器已安装 Node.js 和 npm：

```bash
# 检查Node.js版本
node -v

# 检查npm版本
npm -v
```

### 2. 获取代码

通过以下方式之一获取代码：

- 使用 Git 克隆仓库
- 直接上传代码到服务器
- 从发布版本下载代码包

### 3. 安装依赖

在项目目录中运行：

```bash
npm install --production
```

### 4. 配置环境

根据你的环境需要，修改部署配置文件：

1. 打开`deploy.config.js`
2. 修改相应环境的配置项
   - PORT: 服务器端口
   - HOST: 服务器主机名或 IP
   - AUTO_OPEN_BROWSER: 是否自动打开浏览器
   - TEMP_TRANSLATIONS_FILE: 临时翻译文件路径
   - UPLOADS_DIR: 上传目录路径

### 5. 启动服务

使用以下命令启动服务：

```bash
# 开发环境
NODE_ENV=development node start.js

# 测试环境
NODE_ENV=testing node start.js

# 生产环境
NODE_ENV=production node start.js
```

Windows 环境使用：

```batch
set NODE_ENV=production && node start.js
```

### 6. 后台运行（Linux/Unix）

在生产环境中，你可能希望服务在后台运行：

```bash
# 使用nohup
nohup NODE_ENV=production node start.js > server.log 2>&1 &

# 或者使用PM2
npm install -g pm2
pm2 start server.js --name="i18n-server"
```

### 7. 配置为服务（可选）

对于 Linux 系统，你可以配置为系统服务：

1. 创建 systemd 服务文件 `/etc/systemd/system/i18n-server.service`：

[Unit]
Description=i18nexus Translation Management Server
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/i18n-server
ExecStart=/usr/bin/node start.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
