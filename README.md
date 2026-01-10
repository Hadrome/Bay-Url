# ☁️ BayUrl - Cloudflare 极简短链服务

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**BayUrl** 是一个运行在 Cloudflare Pages 上的现代化短链接服务。它无需购买服务器，利用 Cloudflare 的全球边缘网络和 D1 数据库，提供极速、免费、稳定的短链生成与重定向服务。

![BayUrl Screenshot](public/screenshot.png)

## ✨ 核心特性

- 🚀 **零成本托管**：基于 Cloudflare Pages + D1，完全免费额度充足。
- 🔗 **自定义短码**：支持随机生成或自定义个性化后缀。
- 📊 **访问统计**：内置后台，记录点击量、IP 地址和用户设备。
- 🛡️ **安全管理**：带鉴权的管理后台，轻松管理所有链接。
- 🎨 **精美 UI**：原生 HTML/CSS 构建的现代化亮色主题，无需构建步骤。
- ⚡ **极速响应**：利用 Cloudflare 边缘网络，毫秒级跳转。

---

## 📖 部署教程

由于本项目依赖 `public` 静态目录，必须使用 **Cloudflare Pages** 进行部署。请勿使用 Workers 部署按钮（会导致静态资源失效）。

### 方案一：网页控制台部署 (推荐)

这种方式无需接触命令行，全在网页上操作。

#### 1. Fork 项目
点击右上角的 **Fork** 按钮，将本项目克隆到你自己的 GitHub 账号下。

#### 2. 创建 Cloudflare Pages 项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Compute (Workers & Pages)** -> **Overview**。
3. 点击 **Create Application**。
4. **关键步骤**：点击切换到 **Pages** 标签页（不要留在 Workers 页面）。
5. 点击 **Connect to Git**。
6. 选择 `<your-username>/bay-url` 仓库，点击 **Begin setup**。
7. **Build settings** 保持默认：
   - Project name: `bay-url`
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: (空)
   - Build output directory: `public` (务必确认此项)
8. 点击 **Save and Deploy**。

#### 3. 创建并绑定数据库
项目部署完成后，需要设置数据库：
1. 在 Cloudflare 侧边栏选择 **Compute (Workers & Pages)** -> **D1 SQL Database**。
2. 点击 **Create**，输入数据库名（例如 `bay-url-db`），点击创建。
3. 回到你的 Pages 项目页面，点击 **Settings** -> **Functions**。
4. 找到 **D1 database bindings** 部分，点击 **Add binding**：
   - **Variable name**: `DB` (必须是大写 DB)
   - **D1 database**: 选择你刚才创建的数据库
5. 点击 **Save**。

#### 4. 初始化数据库表
1. 在你的 Pages 项目页面，点击顶部的 **Deployments** 标签。
2. 这一步需要重新部署才能让数据库绑定生效。你可以点击最新一次部署右侧的三点图标 -> **Retry deployment**。
3. **重要：初始化表结构**。
   目前 Cloudflare Pages 界面暂不支持直接执行 SQL 文件。你需要通过 Cloudflare 网页控制台手动执行 `schema.sql` 的内容，或者使用本地 Wrangler CLI（见下方说明）。
   
   **简便方法（网页控制台执行 SQL）：**
   Cloudflare 网页控制台通常需要单行 SQL。请依次复制以下 **3条** 命令到 D1 控制台执行：

   **命令 1 (创建 links 表):**
   ```sql
   CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, created_at INTEGER DEFAULT (unixepoch()), expires_at INTEGER);
   ```

   **命令 2 (创建 visits 表):**
   ```sql
   CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id INTEGER NOT NULL, ip TEXT, user_agent TEXT, referer TEXT, visit_time INTEGER DEFAULT (unixepoch()), FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE);
   ```

   **命令 3 (创建索引):**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_slug ON links(slug); CREATE INDEX IF NOT EXISTS idx_link_id ON visits(link_id);
   ```

   **命令 4 (创建 settings 表):**
   ```sql
   CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT); INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_limit', '100');
   ```

#### 5. 设置管理员密码
1. 回到 Pages 项目 -> **Settings** -> **Environment variables**。
2. 点击 **Add variable**：
   - **Variable name**: `ADMIN_TOKEN`
   - **Value**: 设置一个复杂的密码（用于登录管理后台）
3. 点击 **Save**。



🎉 **部署完成！** 访问你的 `*.pages.dev` 域名即可使用。

---

### 方案二：命令行手动部署 (CLI)

适合熟悉命令行的开发者。

#### 1. 环境准备
确保已安装 [Node.js](https://nodejs.org/)。

```bash
# 1. 克隆项目
git clone https://github.com/<your-username>/bay-url.git
cd bay-url

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login
```

#### 2. 创建与配置数据库
```bash
# 创建 D1 数据库
npx wrangler d1 create bay-url-db

# ⚠️ 复制控制台输出的 database_id
```

打开 `wrangler.toml` 文件，修改 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "bay-url-db"
database_id = "替换为你复制的ID"
```

#### 3. 初始化表结构

```bash
# 生产环境初始化
npx wrangler d1 execute bay-url-db --remote --file=./schema.sql
```

#### 4. 部署上线

```bash
npm run deploy
```

#### 5. 设置环境变量
前往 Cloudflare Dashboard 设置 `ADMIN_TOKEN` 环境变量（参考方案一的第 5 步）。

---

## 🛠️ 管理后台使用

1. 浏览器访问 `/admin.html`。
2. 输入你在环境变量中设置的 `ADMIN_TOKEN`。
3. 即可查看、搜索和删除短链接。

## 🧩 开发指南

### 本地运行

```bash
npm run dev
```
访问 `http://localhost:8788` 进行调试。本地数据将存储在 `.wrangler` 目录中。

---

## 📄 License

MIT © [BayMaxen]
