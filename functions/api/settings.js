export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();

        const settings = {
            daily_limit: 100,
            retention_days: 30,
            turnstile_site_key: '',
            turnstile_secret_key: ''
        };

        if (results) {
            results.forEach(row => {
                if (row.key === 'daily_limit') settings.daily_limit = parseInt(row.value);
                if (row.key === 'retention_days') settings.retention_days = parseInt(row.value);
                if (row.key === 'turnstile_site_key') settings.turnstile_site_key = row.value;
                if (row.key === 'turnstile_secret_key') settings.turnstile_secret_key = row.value;
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
        const body = await request.json();

        // Handle daily_limit
        if (body.daily_limit !== undefined) {
            const limit = parseInt(body.daily_limit);
            if (limit >= 0) {
                await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('daily_limit', ?)").bind(String(limit)).run();
            }
        }

        // Handle retention_days
        if (body.retention_days !== undefined) {
            const days = parseInt(body.retention_days);
            if (days >= 1) {
                await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('retention_days', ?)").bind(String(days)).run();
            }
        }

        // Handle Turnstile keys
        if (body.turnstile_site_key !== undefined) {
            await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('turnstile_site_key', ?)").bind(String(body.turnstile_site_key)).run();
        }
        if (body.turnstile_secret_key !== undefined) {
            await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('turnstile_secret_key', ?)").bind(String(body.turnstile_secret_key)).run();
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
