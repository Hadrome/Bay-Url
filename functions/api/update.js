export async function onRequestPost(context) {
    const { request, env } = context;

    // Middleware: Check Admin Token
    const token = request.headers.get("Admin-Token");
    if (!token || token !== env.ADMIN_TOKEN) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const { id, action, value } = await request.json();

        if (!id) {
            return new Response(JSON.stringify({ error: "ID required" }), { status: 400 });
        }

        let stmt;
        if (action === 'set_expiry_days') {
            // value = days from now. 0 = permanent.
            let expires_at = null;
            if (value > 0) {
                expires_at = Math.floor(Date.now() / 1000) + (value * 86400);
            }
            stmt = env.DB.prepare("UPDATE links SET expires_at = ?, max_visits = NULL WHERE id = ?").bind(expires_at, id);
        } else if (action === 'set_1_time') {
            stmt = env.DB.prepare("UPDATE links SET expires_at = NULL, max_visits = 1 WHERE id = ?").bind(id);
        } else if (action === 'set_note') {
            stmt = env.DB.prepare("UPDATE links SET note = ? WHERE id = ?").bind(value, id);
        } else {
            return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
        }

        await stmt.run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
