# wallet.js - 支持多链的钱包服务

目前支持以下:
- ETH
- ERC20
- TRC20
---

## 1. 部署

### 1.1 环境
本文档预设安装环境是centos 7，其他环境略作调整即可

### 1.2. 安装node v14
```
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash
sudo yum install nodejs
```

### 1.3. 配置环境
创建 wallet.js/.env
```
# 项目名
PROJECT_NAME=wallet

# RabbitMQ配置
AMQP_HOST=127.0.0.1
AMQP_PORT=5672
AMQP_VHOST=/

# MYSQL数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=123456
MYSQL_DATABASE=wallet

# REDIS配置
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=

DB_LOG=0
LOG_LEVEL=error

# 根助记词
MNEMONIC=`your mnemonic`

# 签名密钥
SIGN_SECRET=`your secret`

# 以太坊节点地址
ETH_NODE=`your node`

# 工作消息队列名
WORKER_QUEUE=walletq

# API服务端口
API_PORT=9000
```

### 1.4. 安装nodejs库
```
npm i
```

### 1.5. 编译ts代码
```
npm run build
```

### 1.6. 创建数据库
```
CREATE DATABASE wallet DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.7. 初始化数据库
```
node dist/tools/initdb.js
```

### 1.8. 启动服务
```
pm2 start all.yml
```
