export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { url, slug: customSlug, expiration } = await request.json();

        if (!url) {
            return new Response(JSON.stringify({ message: "URL is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // --- Check Daily Limit ---
        try {
            // 1. Get Limit
            const limitStmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'daily_limit'");
            const limitResult = await limitStmt.first();
            const dailyLimit = limitResult ? parseInt(limitResult.value) : 100;

            if (dailyLimit > 0) {
                // 2. Count today's links
                const countStmt = env.DB.prepare("SELECT COUNT(*) as count FROM links WHERE date(created_at, 'unixepoch') = date('now')");
                const countResult = await countStmt.first();
                const todayCount = countResult.count;

                if (todayCount >= dailyLimit) {
                    return new Response(JSON.stringify({ message: `今日创建链接已达上限 (${dailyLimit}条)，请明日再试` }), {
                        status: 429,
                        headers: { "Content-Type": "application/json" }
                    });
                }
            }
        } catch (e) {
            console.error("Limit check failed", e);
        }
        // -------------------------

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return new Response(JSON.stringify({ message: "Invalid URL format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        let slug = customSlug;
        if (!slug) {
            // Generate random 6-char slug
            slug = Math.random().toString(36).substring(2, 8);
        }

        // Check if slug exists
        const existing = await env.DB.prepare("SELECT slug FROM links WHERE slug = ?").bind(slug).first();
        if (existing) {
            return new Response(JSON.stringify({ message: "Slug already exists" }), {
                status: 409,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Insert into DB
        // Calculate Expiration
        let expires_at = null;
        let max_visits = null;

        // expiration is already destructured from line 5
        const expVal = expiration || 'none';

        if (expVal === '1_time') {
            max_visits = 1;
        } else if (expVal === '1_day') {
            expires_at = Math.floor(Date.now() / 1000) + 86400;
        } else if (expVal === '7_days') {
            expires_at = Math.floor(Date.now() / 1000) + (86400 * 7);
        } else if (expVal === '30_days') {
            expires_at = Math.floor(Date.now() / 1000) + (86400 * 30);
        }

        await env.DB.prepare("INSERT INTO links (url, slug, expires_at, max_visits, created_at) VALUES (?, ?, ?, ?, unixepoch())")
            .bind(url, slug, expires_at, max_visits)
            .run();

        return new Response(JSON.stringify({ slug, url }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ message: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
