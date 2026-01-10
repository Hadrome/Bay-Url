document.addEventListener('DOMContentLoaded', () => {
    // URL Shortener Logic
    const shortenForm = document.getElementById('shortenForm');
    if (shortenForm) {
        const urlInput = document.getElementById('urlInput');
        const slugInput = document.getElementById('slugInput');
        const submitBtn = shortenForm.querySelector('button[type="submit"]');
        const resultDiv = document.getElementById('result');
        const shortUrlLink = document.getElementById('shortUrl');
        const copyBtn = document.getElementById('copyBtn');
        const errorMsg = document.getElementById('errorMsg');

        shortenForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // UI Reset
            errorMsg.style.display = 'none';
            resultDiv.classList.remove('visible');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span style="opacity:0.8">处理中...</span>';

            // Auto-fix URL protocol
            let rawUrl = urlInput.value.trim();
            if (!/^https?:\/\//i.test(rawUrl)) {
                rawUrl = 'https://' + rawUrl;
            }

            try {
                const response = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: rawUrl,
                        slug: slugInput.value.trim() || undefined
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || '生成链接失败');
                }

                const fullUrl = `${window.location.origin}/${data.slug}`;
                shortUrlLink.href = fullUrl;
                shortUrlLink.textContent = fullUrl;
                resultDiv.classList.add('visible');

                // Clear inputs on success
                urlInput.value = '';
                slugInput.value = '';

            } catch (err) {
                console.error("Shorten Error:", err);
                errorMsg.textContent = err.message || "请求发生未知错误";
                errorMsg.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '缩短链接';
            }
        });

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shortUrlLink.href).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✨ 已复制';
                copyBtn.style.borderColor = 'var(--success-color)';
                copyBtn.style.color = 'var(--success-color)';

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.borderColor = '';
                    copyBtn.style.color = '';
                }, 2000);
            });
        });
    }

    // Admin Dashboard Logic (Keep original logic but adapt to new styles if needed later)
    // For now, the existing logic is sufficient as it shares basic classes.
    const adminLogin = document.getElementById('adminLogin');
    if (adminLogin) {
        // ... (existing admin logic can remain mostly same, just ensuring selectors match)
        const dashboard = document.getElementById('dashboard');
        const loginForm = document.getElementById('loginForm');
        const tokenInput = document.getElementById('tokenInput');
        const linkList = document.getElementById('linkList');
        const logoutBtn = document.getElementById('logoutBtn');

        let authToken = localStorage.getItem('adminToken');

        const loadLinks = async () => {
            try {
                const response = await fetch('/api/list', {
                    headers: { 'Admin-Token': authToken }
                });

                if (response.status === 401) {
                    throw new Error('未授权');
                }

                const links = await response.json();
                renderLinks(links);
                showDashboard();
            } catch (err) {
                logout();
            }
        };

        const renderLinks = (links) => {
            if (links.length === 0) {
                linkList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无数据</div>';
                return;
            }
            linkList.innerHTML = links.map(link => `
                <div class="link-item" style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid #eee;">
                    <div class="link-info">
                        <a href="/${link.slug}" target="_blank" style="font-weight:600;color:#0071e3;text-decoration:none;">/${link.slug}</a>
                        <div style="font-size:12px;color:#999;margin-top:4px;">${link.url}</div>
                        <div style="font-size:12px;color:#bbb;margin-top:2px;">
                            ${link.visits || 0} 次访问 • ${new Date(link.created_at * 1000).toLocaleDateString()}
                        </div>
                    </div>
                    <button onclick="deleteLink(${link.id})" style="width:auto;padding:6px 12px;font-size:12px;background:#ffeeee;color:#ff3b30;border-radius:6px;">删除</button>
                </div>
            `).join('');
        };

        const showDashboard = () => {
            adminLogin.classList.add('hidden'); // Ensure CSS has .hidden { display: none }
            dashboard.classList.remove('hidden');
            if (dashboard.classList.contains('hidden')) dashboard.style.display = 'block'; // Fallback
            if (adminLogin.classList.contains('hidden')) adminLogin.style.display = 'none'; // Fallback
        };

        const logout = () => {
            localStorage.removeItem('adminToken');
            authToken = null;
            location.reload();
        };

        window.deleteLink = async (id) => {
            if (!confirm('确定要删除吗？')) return;
            try {
                const response = await fetch(`/api/delete?id=${id}`, {
                    method: 'DELETE',
                    headers: { 'Admin-Token': authToken }
                });
                if (response.ok) loadLinks();
            } catch (err) {
                alert('操作失败');
            }
        };

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            authToken = tokenInput.value;
            localStorage.setItem('adminToken', authToken);
            loadLinks();
        });

        if (logoutBtn) logoutBtn.addEventListener('click', logout);
        if (authToken) loadLinks();
    }
});
