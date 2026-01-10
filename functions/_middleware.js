export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // Define protected paths
    const protectedPaths = ["/api/list", "/api/delete", "/api/settings", "/api/dashboard"];

    if (protectedPaths.some(path => url.pathname.startsWith(path))) {
        const token = request.headers.get("Admin-Token");
        const secretToken = env.ADMIN_TOKEN;

        if (!secretToken || token !== secretToken) {
            return new Response("Unauthorized", { status: 401 });
        }
    }

    return next();
}
