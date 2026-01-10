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
        const expiration = (await request.json()).expiration || 'none'; // Re-read body carefully or destructure above

        // Fix: Cannot read body twice. Need to restructure top of function.
        // Let's rewrite the body parsing part or this block.
        // Wait, I can't re-read stream.
        // I need to use the destructuring from line 5.

        // RE-PLAN: see below target content logic.
        // I will replace the INSERT block and rely on variables set earlier.
        // But variables aren't set earlier. I need to modify the TOP of the file too or just do it here if I have access.
        // The top of file extracted `url, slug, turnstileToken`. I didn't extract `expiration`.
        // I need to use `multi_replace` to fix both top and bottom or just `replace` top first.

        // Let's just REPLACE THE WHOLE FILE CONTENT CHUNK or use multi_replace.
        // Actually, just fetching `expiration` at top is better.

        // Let's do a multi_replace on shorten.js to:
        // 1. Extract expiration at top.
        // 2. Logic before INSERT.
        // 3. Update INSERT statement.


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
