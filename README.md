<p align="center">
  <img src="public/logo.png" alt="BayUrl Logo" width="120" />
</p>

<h1 align="center">BayUrl</h1>
<p align="center">
  <strong>基于 Cloudflare Pages 的现代化短链接服务</strong>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/Database-D1-5865F2" alt="D1 Database">
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🚀 **零成本托管** | 基于 Cloudflare Pages + D1，免费额度充足 |
| 🔗 **自定义短码** | 支持随机生成或自定义个性化后缀 |
| 📊 **访问统计** | 记录点击量、IP 地址、设备类型、浏览器 |
| ⏰ **链接有效期** | 支持永久/限时/阅后即焚模式 |
| ✏️ **链接编辑** | 可修改目标链接、备注、有效期 |
| 🛡️ **安全管理** | Token 鉴权的管理后台 + XSS 防护 |
| 🎨 **极光 UI** | Apple 风格设计，动态渐变背景 |
| ⚡ **极速响应** | Cloudflare 边缘网络，毫秒级跳转 |

---

## 📦 快速部署

### 方案一：网页控制台部署（推荐）

#### 第 1 步：Fork 项目
点击右上角 **Fork** 按钮，将项目克隆到你的 GitHub 账号。

#### 第 2 步：创建 Cloudflare Pages 项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create application** → 切换到 **Pages** 标签
3. 点击 **Connect to Git**，选择你 Fork 的仓库
4. 构建设置保持默认：
   - Framework preset: `None`
   - Build command: _(留空)_
   - Build output directory: `public`
5. 点击 **Save and Deploy**

#### 第 3 步：创建 D1 数据库
1. 进入 **Workers & Pages** → **D1 SQL Database** → **Create**
2. 输入数据库名（如 `bay-url-db`）

#### 第 4 步：绑定数据库
1. 回到 Pages 项目 → **Settings** → **Functions** → **D1 database bindings**
2. 添加绑定：
   - Variable name: `DB`
   - D1 database: 选择刚创建的数据库

#### 第 5 步：初始化数据表
在 D1 控制台依次执行以下 SQL：

```sql
-- 命令 1: 创建 links 表
CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, note TEXT, created_at INTEGER DEFAULT (unixepoch()), expires_at INTEGER, max_visits INTEGER, visits INTEGER DEFAULT 0);
```

```sql
-- 命令 2: 创建 visits 表
CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id INTEGER NOT NULL, ip TEXT, user_agent TEXT, referer TEXT, visit_time INTEGER DEFAULT (unixepoch()), FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE);
```

```sql
-- 命令 3: 创建索引
CREATE INDEX IF NOT EXISTS idx_slug ON links(slug); CREATE INDEX IF NOT EXISTS idx_link_id ON visits(link_id);
```

```sql
-- 命令 4: 创建 settings 表
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT); INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_limit', '100');
```

#### 第 6 步：设置管理员密码
1. Pages 项目 → **Settings** → **Environment variables**
2. 添加变量：
   - Variable name: `ADMIN_TOKEN`
   - Value: _设置一个复杂密码_

#### 第 7 步：重新部署
回到 **Deployments** 标签，点击最新部署右侧的 ⋮ → **Retry deployment**

🎉 **完成！** 访问你的 `*.pages.dev` 域名即可使用。

---

### 方案二：命令行部署

```bash
# 克隆项目
git clone https://github.com/<your-username>/bay-url.git
cd bay-url

# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 创建数据库
npx wrangler d1 create bay-url-db
# 复制输出的 database_id，替换 wrangler.toml 中的值

# 初始化表结构
npx wrangler d1 execute bay-url-db --remote --file=./schema.sql

# 部署
npm run deploy
```

> 部署后在 Cloudflare Dashboard 设置 `ADMIN_TOKEN` 环境变量。

---

## 🛠️ 管理后台

访问 `/admin.html`，输入 `ADMIN_TOKEN` 登录。

**可用功能：**
- 📋 查看所有短链接及访问统计
- ✏️ 修改目标链接、备注、有效期
- 🗑️ 单个/批量删除链接
- 🔍 搜索过滤
- 👀 查看详细访问记录

---

## 🧪 本地开发

```bash
npm run dev
# 访问 http://localhost:8788
```

---

## 📁 项目结构

```
bay-url/
├── public/              # 静态资源
│   ├── index.html       # 首页
│   ├── admin.html       # 管理后台
│   ├── script.js        # 前端逻辑
│   ├── style.css        # 样式
│   └── logo.png         # Logo
├── functions/           # Cloudflare Functions
│   ├── [slug].js        # 短链跳转处理
│   ├── _middleware.js   # 鉴权中间件
│   └── api/             # API 接口
├── schema.sql           # 数据库结构
└── wrangler.toml        # Cloudflare 配置
```

---

## 📄 License

MIT © BayMaxen
