export async function onRequestGet(context) {
    const { env } = context;
    try {
        const stmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'daily_limit'");
        const result = await stmt.first();
        return new Response(JSON.stringify({ daily_limit: result ? parseInt(result.value) : 100 }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { daily_limit } = await request.json();
        if (typeof daily_limit !== 'number' || daily_limit < 0) {
            return new Response("Invalid limit", { status: 400 });
        }
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('daily_limit', ?)").bind(String(daily_limit)).run();
        return new Response(JSON.stringify({ success: true, daily_limit }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
