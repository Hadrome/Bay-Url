export async function onRequestGet(context) {
    const { env } = context;

    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get today's visits
        // Assuming visits table has visit_time as unix epoch in seconds
        const visitsQuery = `
            SELECT COUNT(*) as count 
            FROM visits 
            WHERE date(visit_time, 'unixepoch') = date('now')
        `;
        const visitsResult = await env.DB.prepare(visitsQuery).first();
        const todayVisits = visitsResult.count;

        // 2. Get today's created links
        // Assuming links table has created_at as unix epoch in seconds
        const linksQuery = `
            SELECT COUNT(*) as count 
            FROM links 
            WHERE date(created_at, 'unixepoch') = date('now')
        `;
        const linksResult = await env.DB.prepare(linksQuery).first();
        const todayLinks = linksResult.count;

        // 3. Get 7-day trend
        // We need a series of dates for the last 7 days
        // SQLite doesn't have a generate_series easily available in D1 workers usually, 
        // so we'll do a group by and fill in gaps in JS or just return what we have.
        // Let's get data for last 7 days.
        const trendQuery = `
            SELECT 
                date(visit_time, 'unixepoch') as date, 
                COUNT(*) as visits
            FROM visits 
            WHERE visit_time >= unixepoch('now', '-6 days')
            GROUP BY date
            ORDER BY date
        `;
        const { results: trendResults } = await env.DB.prepare(trendQuery).all();

        return new Response(JSON.stringify({
            today: {
                visits: todayVisits,
                links: todayLinks
            },
            trend: trendResults
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
