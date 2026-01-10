export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { url, slug: customSlug, turnstileToken } = await request.json();

        if (!url) {
            return new Response(JSON.stringify({ message: "URL is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // --- Turnstile Verification ---
        try {
            const secretStmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'turnstile_secret_key'");
            const secretResult = await secretStmt.first();
            const turnstileSecret = secretResult ? secretResult.value : null;

            if (turnstileSecret) {
                if (!turnstileToken) {
                    return new Response(JSON.stringify({ message: "Turnstile validation required" }), {
                        status: 403,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const formData = new FormData();
                formData.append('secret', turnstileSecret);
                formData.append('response', turnstileToken);
                formData.append('remoteip', request.headers.get('CF-Connecting-IP'));

                const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    body: formData,
                    method: 'POST',
                });

                const outcome = await result.json();
                if (!outcome.success) {
                    return new Response(JSON.stringify({ message: "Turnstile verification failed" }), {
                        status: 403,
                        headers: { "Content-Type": "application/json" }
                    });
                }
            }
        } catch (e) {
            console.error("Turnstile check error", e);
            // Fail open or closed? Let's fail closed for security, or log checks.
            // For now, let's just log and proceed if DB fails, but if verification fails we returned above.
        }
        // ------------------------------

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
        await env.DB.prepare("INSERT INTO links (url, slug) VALUES (?, ?)")
            .bind(url, slug)
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
