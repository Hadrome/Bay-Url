// 仪表盘 API - 返回今日统计数据
export async function onRequestGet(context) {
    const { env } = context;

    try {
        // 1. 获取今日访问次数
        const visitsQuery = `
            SELECT COUNT(*) as count 
            FROM visits 
            WHERE date(visit_time, 'unixepoch') = date('now')
        `;
        const visitsResult = await env.DB.prepare(visitsQuery).first();
        const todayVisits = visitsResult?.count || 0;

        // 2. 获取今日新增链接数
        const linksQuery = `
            SELECT COUNT(*) as count 
            FROM links 
            WHERE date(created_at, 'unixepoch') = date('now')
        `;
        const linksResult = await env.DB.prepare(linksQuery).first();
        const todayLinks = linksResult?.count || 0;

        return new Response(JSON.stringify({
            today: {
                visits: todayVisits,
                links: todayLinks
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
