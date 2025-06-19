# Serverless-BBS / CFWorker BBS

纯基于 Cloudflare Worker + Pages 的类似 Discuz!3.5 程序.

## 安装教程

安装 wrangler
> (部分本机系统例如 macOS 需要考虑 sudo)
```bash
npm i --global wrangler
```

克隆代码
```bash
git clone https://github.com/serverless-bbs/serverless-bbs.git
cd serverless-bbs
```

初始化D1数据库
```bash
# 假设您当前在 serverless-bbs/ 目录下
cd worker

# --local 为本机调试
npx wrangler d1 migrations apply community-db --local
```

安装后端依赖
```bash
# 假设您当前在 serverless-bbs/ 目录下
cd worker
yarn
```

安装前端依赖
```bash
# 假设您当前在 serverless-bbs/ 目录下
cd ui
yarn
```


启动后端
```bash
# 假设您当前在 serverless-bbs/ 目录下
cd worker
yarn
```

启动前端
```bash
# 假设您当前在 serverless-bbs/ 目录下
cd ui
yarn
```

## 线上部署

线上部署需要将 `wrangler.toml` 内 d1、r2 等配置修改为您的真实的业务配置。

```bash
# 假设您当前在 serverless-bbs/ 目录下
npx wrangler deploy
```

## 截图

![首页](docs/1.png)
![版块页](docs/2.png)
![帖子页](docs/3.png)
![他人资料页](docs/4.png)
![他人发帖页](docs/5.png)
![上传头像](docs/6.png)


## 版本
版权不所有 (Copyleft) 授权。随意使用，但风险、后果与责任自担。