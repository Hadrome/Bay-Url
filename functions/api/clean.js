export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { retention_days } = await request.json();

        // Default to 30 days if invalid
        const days = parseInt(retention_days) || 30;

        if (days < 1) {
            return new Response(JSON.stringify({ message: "保留天数必须大于 0" }), { status: 400 });
        }

        // 1. Save setting
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('retention_days', ?)").bind(String(days)).run();

        // 2. Execute Clean (visits older than X days)
        // Note: SQLite D1 uses unixepoch for calculations
        // 'now' gives current unix timestamp. -X days subtracts.
        // We delete logs where visit_time is less than the cutoff.

        const result = await env.DB.prepare(`
            DELETE FROM visits 
            WHERE visit_time < unixepoch('now', '-' || ? || ' days')
        `).bind(String(days)).run();

        return new Response(JSON.stringify({
            success: true,
            message: `清理完成，已删除 ${result.meta.changes} 条过期日志`,
            deleted: result.meta.changes
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
