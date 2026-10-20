# ANEKO 动漫社官网

ANEKO 动漫社官方网站与社团管理系统。包含面向公众的社团门户（首页、活动、作品展示、入社申请等）和面向管理员的后台（成员管理、内容审核、活动管理、数据看板等）。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | [Next.js 14](https://nextjs.org/)（App Router）+ React 18 + TypeScript |
| 样式 | Tailwind CSS + Framer Motion + Lucide Icons |
| 数据库 / 认证 | [Supabase](https://supabase.com/)（PostgreSQL + Auth + RLS） |
| 对象存储 | Cloudflare R2（图片上传，基于 `@aws-sdk/client-s3`） |
| 缓存 | Upstash Redis（可选） |

## 功能一览

### 前台（公众站点）

- **首页**：轮播横幅、社团简介、快捷入口、最新动态、精选作品
- **社团介绍** `/about`
- **活动日历** `/events`：活动列表与在线报名
- **活动签到** `/checkin`：限时定位打卡（天地图），填 CN + 定位即可签到，无需登录
- **作品展示** `/gallery`：插画 / 摄影 / Cosplay / 视频 / 手工作品，支持点赞
- **视频** `/videos`：上传的社团视频与哔哩哔哩视频，弹窗播放
- **AI 问答** `/ai`：向后台配置的 OpenAI 兼容模型提问，流式回答，多模型可切换
- **作品投稿** `/upload`：登录用户可上传作品（图片存入 Cloudflare R2）
- **新闻详情** `/posts/[id]`：公告 / 活动 / 分享 / 通知
- **入社申请** `/join`：在线填写入社申请表

### 后台 `/admin`（需登录，由 `middleware.ts` 强制鉴权）

- **数据看板**：成员数、待审作品、进行中活动、待处理申请等统计
- **成员管理**：成员资料、角色（admin / member）、状态管理
- **内容管理**：文章发布（草稿 / 发布、置顶、分类）
- **活动管理**：活动创建与编辑、报名名单管理
- **签到活动**：创建/开启限时定位打卡活动，地图查看签到者位置与 CN
- **作品审核**：投稿的审核（通过 / 拒绝）
- **视频管理**：上传视频到 R2（预签名直传，最大 500MB）或添加哔哩哔哩视频链接
- **AI 模型**：配置多个兼容 OpenAI API 格式的模型（API Base / Key / 模型 ID），API Key 仅存服务端、不回显；全局提示词统一约束所有模型的回答口径（固定问答、拒答规则）
- **申请处理**：入社申请、活动报名的审批
- **轮播管理**：首页 Hero 轮播图配置
- **站点设置**：社团名称、Logo、联系方式、公告横幅、注册开关等

## 项目结构

```
.
├── middleware.ts              # Supabase 会话刷新 + /admin 路由鉴权
├── src/
│   ├── app/
│   │   ├── (frontend)/        # 公众站点页面（首页 / about / events / gallery / join / posts / upload）
│   │   ├── admin/             # 后台管理页面
│   │   ├── api/               # API Routes（auth / events / posts / works / members / upload 等）
│   │   └── login/             # 登录页
│   ├── components/            # 通用 UI 组件（Header / Footer / HeroBanner 等）
│   ├── lib/                   # 工具库（supabase / r2 / redis / api-utils / client-api）
│   └── database.types.ts      # Supabase 生成的数据库类型定义
├── supabase/
│   ├── migrations/            # 数据库初始化迁移（建表、触发器、RLS 策略）
│   └── manual_sql/            # 需手动执行的补充 SQL
└── scripts/                   # 辅助脚本（生成类型、清理构建缓存、R2 上传测试）
```

## 快速开始

### 1. 环境要求

- Node.js 18+（推荐 20+）
- npm（以 `package-lock.json` 为准）
- 一个 Supabase 项目
- 一个 Cloudflare R2 存储桶（用于图片上传）

### 2. 配置环境变量

在项目根目录创建 `.env.local` 并填入你自己的配置（可参考仓库中的 `.env.example` 占位模板；出于安全考虑，真实的 `.env*` 文件均已在 `.gitignore` 中忽略，敏感信息请勿提交）：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 可发布密钥（anon / publishable） |
| `SUPABASE_SECRET_KEY` | Supabase 服务端密钥（仅服务端使用，切勿暴露到客户端） |
| `SUPABASE_PROJECT_REF` | Supabase 项目 Ref ID（用于 `npm run supabase:types` 生成类型） |
| `ADMIN_EMAIL` | 登录时输入用户名 `admin` 所映射到的管理员邮箱 |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API 凭据 |
| `R2_BUCKET_NAME` | R2 存储桶名称 |
| `R2_PUBLIC_URL` | R2 公开访问域名（用于图片 URL 拼接） |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis（可选，用于缓存；后台设置页可开关） |

> 注意：`.env.local` 包含敏感凭据，已在 `.gitignore` 中忽略，**请勿提交到仓库**。

### 3. 初始化数据库

在 Supabase SQL Editor（或通过 Supabase CLI）执行：

1. `supabase/migrations/20260618133000_init_aneko_schema.sql` —— 建表、触发器、RLS 策略
2. `supabase/manual_sql/` 目录下的补充 SQL（按文件名日期顺序执行）

主要数据表：`profiles`、`posts`、`events`、`event_registrations`、`event_applications`、`works`、`work_likes`、`join_applications`、`hero_slides`、`videos`、`site_settings`、`ai_models`、`ai_settings`、`checkin_activities`、`checkins`。

新用户注册后由数据库触发器 `handle_new_user` 自动创建 `profiles` 记录。

### 4. 安装依赖并启动

```bash
npm install
npm run dev
```

开发服务器默认运行在 <http://localhost:3000>。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建（构建后自动裁剪 `.next` 缓存） |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 代码检查 |
| `npm run supabase:types` | 通过 Supabase Management API 重新生成 `src/database.types.ts` |
| `npm run supabase:types:local` | 通过本地 Supabase CLI 生成类型 |

## 鉴权说明

- 登录基于 Supabase Auth（邮箱 + 密码），登录接口为 `POST /api/auth/login`
- 登录表单中输入用户名 `admin` 时，后端会将其映射为 `ADMIN_EMAIL` 对应的邮箱
- `middleware.ts` 拦截 `/admin/*` 路由：未登录用户会被重定向到 `/login?next=...`
- 后台各 API 在服务端校验用户角色（`profiles.role = 'admin'`），并结合 Supabase RLS 保护数据

## 图片上传

- 上传接口：`POST /api/upload`（需登录）
- 限制：仅支持 JPG / PNG / WebP / GIF，单文件最大 8 MB
- 文件经服务端写入 Cloudflare R2，返回 `R2_PUBLIC_URL` 下的公开地址
- 可运行 `node scripts/test-r2-upload.mjs` 验证 R2 配置是否正确

## 视频功能

- 后台「视频管理」支持两种来源：**上传视频文件**（浏览器经预签名 URL 直传 R2，不经过 Next.js 服务器）或**哔哩哔哩链接**（自动提取 BV 号，前台 iframe 播放）
- 添加 B 站链接时会自动获取官方封面、标题和简介填入表单（也可手动点「自动获取封面和标题」按钮）
- 上传限制：MP4 / WebM / MOV / MKV，单文件最大 500MB（推荐 MP4/H.264 以保证浏览器兼容）
- 流程：`POST /api/videos/upload-url`（管理员）签发预签名 PUT 地址 → 浏览器直传 R2 → `POST /api/videos` 保存记录；删除视频记录时会同步清理 R2 文件

### Cloudflare R2 CORS 配置（视频直传必需）

浏览器直传 R2 走的是跨域请求，必须在 Cloudflare 控制台 → R2 存储桶 → Settings → CORS policy 中添加以下规则（替换为你的生产域名；现有图片上传走服务端、不需要此配置）：

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR_PRODUCTION_ORIGIN"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "content-length", "x-amz-*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

未配置时的症状：后台上传视频浏览器报 CORS 错误（服务端无任何日志）。

## 部署

### 顶部搜索与 Upstash Vector

顶部搜索支持公开文章、活动、审核通过作品和启用的视频。搜索在服务端调用 Upstash Vector，浏览器不会收到密钥。未配置 Vector 或调用失败时自动使用标题/正文关键词查询。文章结果进入详情页，活动、作品和视频结果进入对应栏目页。

1. 在 Upstash 创建 **带内置 Embedding 模型** 的 Vector 索引，选择支持中文的多语言模型。本实现通过文本 `data` 自动生成向量，不适用于仅接受手动数值向量的索引。
2. 配置服务端环境变量 `UPSTASH_VECTOR_REST_URL`、`UPSTASH_VECTOR_REST_TOKEN`（读写 Token）和可选 `UPSTASH_VECTOR_NAMESPACE`（默认 `aneko-public`，不同站点/环境请使用不同命名空间）。这些变量不要加 `NEXT_PUBLIC_` 前缀；Redis 的 URL/Token 不能代替 Vector 凭据。
3. 重启应用，管理员进入 **系统设置 → 站内搜索 → 同步搜索索引**，分页导入现有内容。无需新增数据库表。索引处理可能有短暂延迟。

通过网站 API 新增、编辑、审核、撤回和删除内容时，会自动尝试同步索引；失败不会回滚已保存内容，可在设置页重新同步。直接修改 Supabase 数据后也应重新同步。查询每次都会从 Supabase 核对公开状态并读取当前标题/摘要，不直接展示索引中保存的旧文本。同步按钮执行公开内容的幂等补录，不清空命名空间；站外删除或同步失败留下的旧向量不会显示，但可能影响召回率，需要在 Upstash 控制台清理后重新导入。

公开接口 `GET /api/search?q=...` 限制输入为 1–200 字，每 IP 每分钟 30 次；有 Redis 时共享计数，否则沿用项目的进程内限流。管理员补录接口 `POST /api/admin/search/reindex` 校验管理员权限，每次处理最多 50 条。长正文当前索引前 4000 字，结果最多 20 条；可在验证实际搜索质量后再扩展分块索引。

项目可部署到 Vercel 或任何支持 Next.js 的 Node.js 环境：

1. 在平台中配置上表中的环境变量
2. 确保使用 Node.js 运行时（上传接口声明了 `runtime = 'nodejs'`）
3. 执行 `npm run build && npm run start`
