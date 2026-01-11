// 访问记录查询 API
// 解析 User-Agent 获取设备和浏览器信息
function parseUserAgent(ua) {
    if (!ua || ua === 'unknown') {
        return { device: '未知', browser: '未知' };
    }

    // 设备类型检测
    let device = 'PC';
    if (/Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        device = '手机';
    } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
        device = '平板';
    }

    // 浏览器检测
    let browser = '其他';
    if (/Edg\//i.test(ua)) {
        browser = 'Edge';
    } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
        browser = 'Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
        browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
        browser = 'Firefox';
    } else if (/MSIE|Trident/i.test(ua)) {
        browser = 'IE';
    } else if (/Opera|OPR/i.test(ua)) {
        browser = 'Opera';
    }

    return { device, browser };
}

// 格式化时间戳
function formatTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = Math.min(parseInt(url.searchParams.get('pageSize')) || 20, 100);
        const offset = (page - 1) * pageSize;

        // 获取总数
        const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM visits').first();
        const total = countResult?.total || 0;
        const totalPages = Math.ceil(total / pageSize) || 1;

        // 获取访问记录，关联 links 表获取短链接信息
        const query = `
            SELECT 
                v.id,
                v.ip,
                v.user_agent,
                v.referer,
                v.visit_time,
                l.slug,
                l.url
            FROM visits v
            LEFT JOIN links l ON v.link_id = l.id
            ORDER BY v.visit_time DESC
            LIMIT ? OFFSET ?
        `;

        const { results } = await env.DB.prepare(query).bind(pageSize, offset).all();

        // 处理数据，解析 User-Agent
        const data = results.map(row => {
            const { device, browser } = parseUserAgent(row.user_agent);
            return {
                id: row.id,
                slug: row.slug || '已删除',
                url: row.url || '',
                ip: row.ip || '未知',
                device,
                browser,
                referer: row.referer === 'unknown' ? '直接访问' : (row.referer || '直接访问'),
                visit_time: formatTime(row.visit_time)
            };
        });

        return new Response(JSON.stringify({
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
