export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();

        const settings = { daily_limit: 100, retention_days: 30 }; // Defaults
        if (results) {
            results.forEach(row => {
                if (row.key === 'daily_limit') settings.daily_limit = parseInt(row.value);
                if (row.key === 'retention_days') settings.retention_days = parseInt(row.value);
            });
        }

        return new Response(JSON.stringify(settings), {
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
