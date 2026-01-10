// 生成样式化的错误页面
function generateErrorPage(title, message, emoji) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - BayUrl</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
            background: #f5f5f7;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            position: relative;
        }
        body::before {
            content: '';
            position: fixed;
            top: -50%; left: -50%; right: -50%; bottom: -50%;
            background:
                radial-gradient(circle at 50% 50%, rgba(0, 122, 255, 0.15), transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 59, 48, 0.1), transparent 40%),
                radial-gradient(circle at 20% 80%, rgba(94, 92, 230, 0.15), transparent 40%);
            z-index: -1;
            filter: blur(80px);
        }
        .card {
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: saturate(180%) blur(24px);
            -webkit-backdrop-filter: saturate(180%) blur(24px);
            border-radius: 28px;
            padding: 48px;
            box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.4);
            text-align: center;
            max-width: 480px;
        }
        .emoji {
            font-size: 64px;
            margin-bottom: 24px;
        }
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }
        p {
            font-size: 16px;
            color: #86868b;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            background: #007aff;
            color: white;
            text-decoration: none;
            border-radius: 99px;
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: #0062cc;
            transform: scale(1.02);
        }
        footer {
            margin-top: 32px;
            font-size: 13px;
            color: #aeaeb2;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="emoji">${emoji}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">返回首页</a>
        <footer>BayUrl 短链服务</footer>
    </div>
</body>
</html>`;
}

export async function onRequest(context) {
    const { request, env, params, next } = context;
    const slug = params.slug;

    // 1. If root path, pass to static assets (index.html)
    if (!slug) {
        return next();
    }

    // 2. If valid filename (has extension) or is 'admin' path, pass to static assets
    if (slug.includes('.') || slug === 'admin') {
        return next();
    }

    // 3. Query the database for the slug
    const stmt = env.DB.prepare("SELECT * FROM links WHERE slug = ?");
    const link = await stmt.bind(slug).first();

    if (!link) {
        return new Response(
            generateErrorPage("链接不存在", "您访问的短链接不存在或已被删除。", "🔗"),
            { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
    }

    // Check expiration
    if (link.expires_at && link.expires_at < Date.now() / 1000) {
        return new Response(
            generateErrorPage("链接已过期", "此短链接已超过有效期，无法继续访问。", "⏰"),
            { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
    }

    // Check max_visits (One-time view / Burn after reading)
    if (link.max_visits) {
        const countStmt = env.DB.prepare("SELECT COUNT(*) as count FROM visits WHERE link_id = ?");
        const countResult = await countStmt.bind(link.id).first();
        if (countResult && countResult.count >= link.max_visits) {
            return new Response(
                generateErrorPage("阅后即焚", "此链接设置为仅可访问一次，内容已销毁。", "🔥"),
                { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
        }
    }

    // Async logging
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const referer = request.headers.get("Referer") || "unknown";

    context.waitUntil(
        env.DB.prepare(
            "INSERT INTO visits (link_id, ip, user_agent, referer) VALUES (?, ?, ?, ?)"
        )
            .bind(link.id, ip, userAgent, referer)
            .run()
    );

    return Response.redirect(link.url, 302);
}
