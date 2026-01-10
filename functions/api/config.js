export async function onRequestGet(context) {
    const { env } = context;
    try {
        const stmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'turnstile_site_key'");
        const result = await stmt.first();

        return new Response(JSON.stringify({
            turnstile_site_key: result ? result.value : null
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
