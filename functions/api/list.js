export async function onRequestGet(context) {
    const { env } = context;

    try {
        // Get all links with visit count
        // Using a LEFT JOIN to count visits for each link
        const query = `
      SELECT 
        l.id, 
        l.url, 
        l.slug, 
        l.created_at,
        l.expires_at, 
        l.max_visits,
        l.note, 
        COUNT(v.id) as visits 
      FROM links l
      LEFT JOIN visits v ON l.id = v.link_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;

        const { results } = await env.DB.prepare(query).all();

        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ message: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
