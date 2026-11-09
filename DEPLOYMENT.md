# 完整功能部署：GitHub Pages + Render + Neon

这是保留登录、商品、收藏、购物车、订单、AI advisor 和肤质分析的部署方案。当前支付是项目演示，不会真实扣款。托管可选择免费额度；AI、邮件和天气仍受各自账户的额度与权限限制。

## 1. 准备 GitHub 仓库

当前 `origin` 是学校 GitLab。GitHub Pages 需要另一个 GitHub 仓库；不要把现有 `origin` 改掉。GitHub Free 使用 Pages 通常需要公开仓库，公开前确认代码可以对外分享。

先在 GitHub 建一个空仓库。仓库名可以叫 `skin_care`，这是沿用本地项目名，也可以自选。拿到真实仓库链接后再添加第二个远端并推送。GitHub、Render、Neon 的连接工具也可以协助后续操作。

仓库地址决定前端地址。例如仓库为 `https://github.com/alice/skin_care`，Pages 地址通常为 `https://alice.github.io/skin_care/`。这里的 `alice` 必须换成你的 GitHub 用户名；`skin_care` 必须换成真实仓库名。不要直接照抄示例。

## 2. 创建 Neon 数据库

在 [Neon](https://console.neon.tech/) 新建 Free 项目，区域尽量选 Frankfurt，以接近 Render 后端。项目名如 `selfglow` 只是你自己选的管理标签。

数据库需要支持 `pgvector`，用于商品和用户资料的向量搜索。现有迁移包含 `CREATE EXTENSION IF NOT EXISTS vector`，不需要另写建表 SQL。

在 Connect 中取得数据库连接字符串，包含主机、数据库名、用户名、密码和 SSL 参数。迁移与首次导入可使用 Neon 的直接连接（关闭 connection pooling），保留 `sslmode=require`。Render 的 `DATABASE_URL` 也可以先使用这个直接连接地址；不要使用本机的 `localhost`。

数据库连接字符串是密钥：只填在本机未追踪的环境文件或 Render 的 Environment 中，不要放入 GitHub 仓库或前端变量。

## 3. 首次初始化新数据库

在本机另开一个终端，并进入项目的 `backend` 目录。此处只操作刚建的空 Neon 数据库，不迁移本机用户和订单。

```bash
read -s 'DATABASE_URL?Paste the NEW Neon database URL: '
export DATABASE_URL
```

上面命令适用于本项目当前使用的 zsh：`read -s` 会隐藏粘贴的密码；`export` 让后面的 Prisma 和 Node 命令读取这个地址。它不会改写现有 `backend/.env`。已有进程环境变量优先于该文件中的开发数据库地址。

```bash
npm ci --include=dev
npx prisma generate
npm run db:deploy
npm run import:products
npm run import:product-embeddings
```

逐条执行，前一条失败就先处理错误，不继续下一条。

| 命令 | 为什么需要 |
| --- | --- |
| `npm ci --include=dev` | 按锁文件安装依赖，也安装执行迁移需要的 Prisma CLI |
| `prisma generate` | 生成与当前数据库模型对应的客户端 |
| `db:deploy` | 应用已有迁移，创建表和 vector 扩展；不会执行数据库重置 |
| `import:products` | 从仓库 CSV 导入商品 |
| `import:product-embeddings` | 导入仓库已有的商品向量，不为这一步调用 AI API |

商品导入会同步目录，并可能删除 CSV 中已移除的商品及其关联数据，所以只对确认的新空数据库运行这一步。后续 Render 重启和发布只执行迁移，不会重新导入或清空商品。

检查日志中的导入数量；向量出现缺失或歧义的 skipped 项需要核对。之后关闭这个终端，避免把部署数据库地址带入日常开发命令。

## 4. 部署 Render 后端

连接代码所在 GitHub 仓库，使用仓库根目录的 [render.yaml](render.yaml) 创建 Blueprint。它创建一个 Free Web Service，不创建 Render 数据库。

`selfglow-api` 是配置中自选的服务名，可以改；最终的 `onrender.com` 域名以 Render 实际给出的地址为准。

如果通过 Web Service 手动创建，设置如下：

| 设置 | 值 | 来源 |
| --- | --- | --- |
| Root Directory | `backend` | 仓库中 Node 后端所在目录 |
| Runtime | Node | 后端使用 Node.js / Express |
| Build Command | `npm ci --include=dev && npx prisma generate` | 安装后端依赖并生成数据库客户端 |
| Start Command | `npm run start:deploy` | 先应用迁移，再启动 API |
| Health Check Path | `/api/test` | 项目已有的 API 检查地址；它只检查 HTTP 服务，不检查 AI 和邮件 |
| Instance Type | Free | 低流量演示选择免费实例 |

在 Render 填入以下环境变量：

| 变量 | 填什么、从哪里来 |
| --- | --- |
| `DATABASE_URL` | 上一步新建的 Neon 连接字符串 |
| `JWT_SECRET` | Blueprint 自动生成；手动建服务时使用密码生成器生成随机密钥，用来签署登录令牌 |
| `FRONTEND_URL` | 前端的 **origin**，如 `https://alice.github.io`。不要包含 `/skin_care/` 或 `/#/`，因为浏览器 CORS 只发送协议和域名 |
| `BACKEND_URL` | Render 实际分配的公开 HTTPS 地址；可在首次创建后补填 |
| `OPENAI_API_KEY` | 你已有的、具备模型调用权限及可用额度的 OpenAI API 密钥 |
| `BREVO_API_KEY` | Brevo 的 HTTP API 密钥；账户注册验证码和订单确认依赖它 |
| `BREVO_SENDER_EMAIL` | 你在 Brevo 验证过的发件地址 |
| `REQUIRE_EMAIL_VERIFICATION` | `true`，启用登录前的邮件验证 |
| `OPENWEATHER_API_KEY` | 可选，OpenWeather 账户中的密钥；不填则缺少天气个性化，其他功能可运行 |

不要手动设置 `PORT`，Render 会注入。`NODE_VERSION=22`、`NODE_ENV=production` 已写进 Blueprint。项目使用 Brevo HTTPS API 发信，可避开 Render 免费实例对 SMTP 端口的限制。

部署成功后，打开实际后端地址的 `/api/test`，应看到 `{"message":"API works"}`。空商品列表通常表示只建了表，还没执行第 3 步导入。

## 5. 发布 GitHub Pages 前端

在 GitHub 仓库设置中：

1. **Settings → Pages → Source** 选择 **GitHub Actions**，让工作流构建和发布网页。
2. **Settings → Secrets and variables → Actions → Variables** 添加仓库变量 `VITE_API_URL`，值为 Render 的公开 HTTPS 后端地址，例如 `https://实际服务名.onrender.com`。不要加 `/api`，因为项目请求路径已带 `/api`。
3. 在 **Actions** 中找到 **Deploy frontend to GitHub Pages**，点击 **Run workflow**。

`VITE_API_URL` 是公开地址，所以使用 Variable 即可；它会打进浏览器代码，不能存放数据库密码或 API 密钥。

工作流暂时只允许手动运行，以便你先准备好数据库和后端。它使用 `frontend/package-lock.json` 安装依赖，并上传 `frontend/apps/web/dist`。

工作流自动设置两个部署参数：

| 变量 | 作用 |
| --- | --- |
| `VITE_BASE_PATH` | 来自 GitHub Pages 的实际 base path，用于加载脚本、样式和商品图片；支持仓库子路径和根域名 |
| `VITE_ROUTER_MODE=hash` | 使用 `#/shop` 一类地址，刷新页面时服务器仍能返回首页 |

本地不设这些参数时，仍使用根路径和 BrowserRouter。参考文件为 `frontend/apps/web/.env.example`，无需为本地开发改成线上地址。

## 6. 上线后逐项验证

- 从 Pages 链接进入，检查商品图片、筛选、详情，并刷新 `#/shop`。
- 注册自己的测试账户，收到验证码后登录。
- 添加收藏和购物车，刷新确认数据仍在。
- 提交一次模拟订单，检查订单记录及确认邮件。
- 用 AI advisor 提问，检查英语回复、商品推荐和逐步输出。
- 上传自己的测试照片，检查肤质分析和资料保存。
- 有天气密钥时，允许定位并检查天气建议。

如果请求被 CORS 拒绝，先核对 Render `FRONTEND_URL` 是 Pages 域名的 origin。如果请求发往 `localhost:5050`，核对 GitHub 的 `VITE_API_URL` 并重新运行发布工作流。

## 免费方案的范围

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) 用于本项目演示；其条款不允许把 Pages 当作实际经营电商的免费托管。
- [Render Free](https://render.com/docs/free) 会在 15 分钟无访问后休眠，下一次访问可能等待约一分钟；免费后端不适合作为正式生产服务。不要用会在 30 天后到期的 Render 免费 PostgreSQL 作为长期数据库。
- [Neon Free](https://neon.com/pricing) 有数据库存储和计算额度限制；照片以数据形式保存到数据库，会占用这些额度。
- AI advisor、肤质分析、图片生成需要相应 API 额度；免费托管不包含 AI 费用。

部署参考：[Vite GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)、[Render Blueprint 配置](https://render.com/docs/blueprint-spec)、[Neon 与 Prisma](https://neon.com/docs/guides/prisma)。
