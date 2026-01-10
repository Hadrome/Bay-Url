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
                console.error("Load Links Error:", err);
                if (err.message === '未授权') {
                    showToast("Token 错误或过期，请重新登录", "error");
                    logout();
                } else {
                    linkList.innerHTML = `<div style="text-align:center;color:red;padding:20px;">
                        加载失败: ${err.message}<br>
                        <small style="color:#666">请检查 Cloudflare 后台 D1 数据库是否初始化成功</small>
                    </div>`;
                    showDashboard(); // Force show dashboard to display the error
                }
            }
        };

        const renderLinks = (links) => {
            if (!Array.isArray(links)) links = [];
            if (links.length === 0) {
                linkList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无数据</div>';
                return;
            }
            linkList.innerHTML = links.map(link => `
                <div class="link-item">
                    <div class="link-info">
                        <a href="/${link.slug}" target="_blank" class="link-slug">/${link.slug}</a>
                        <div class="link-origin" title="${link.url}">${link.url}</div>
                        <div class="link-meta">
                            ${link.visits || 0} 次访问 • ${new Date(link.created_at * 1000).toLocaleDateString()}
                        </div>
                    </div>
                    <button onclick="deleteLink(${link.id})" class="delete-btn">删除</button>
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
        if (authToken) {
            loadLinks();
            loadDashboard();
            loadSettings();
        }

        // --- Dashboard & Settings Logic ---

        async function loadDashboard() {
            try {
                const response = await fetch('/api/dashboard', {
                    headers: { 'Admin-Token': authToken }
                });
                if (!response.ok) return; // Silent fail for duplicate calls or auth issues handled elsewhere

                const data = await response.json();

                // Update stats cards
                document.getElementById('todayVisits').textContent = data.today.visits;
                document.getElementById('todayLinks').textContent = data.today.links;

                // Render Chart
                renderChart(data.trend);
            } catch (err) {
                console.error("Dashboard Error:", err);
            }
        }

        async function loadSettings() {
            try {
                const response = await fetch('/api/settings', { headers: { 'Admin-Token': authToken } });
                const data = await response.json();
                if (data.daily_limit !== undefined) {
                    document.getElementById('dailyLimitInput').value = data.daily_limit;
                }
            } catch (err) {
                console.error("Settings Error:", err);
            }
        }

        // Settings Form Handler
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const limit = parseInt(document.getElementById('dailyLimitInput').value);
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Admin-Token': authToken
                        },
                        body: JSON.stringify({ daily_limit: limit })
                    });
                    if (response.ok) {
                        alert('设置已保存');
                    } else {
                        alert('保存失败');
                    }
                } catch (err) {
                    alert('保存错误: ' + err.message);
                }
            });
        }

        function renderChart(trendData) {
            const ctx = document.getElementById('trendChart');
            if (!ctx) return;

            // Destroy existing chart if any (simple implicit check via window prop if strictly needed, but let's assume reload on login)

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.map(d => new Date(d.date).toLocaleDateString()),
                    datasets: [{
                        label: '每日访问量',
                        data: trendData.map(d => d.visits),
                        borderColor: '#0071e3',
                        backgroundColor: 'rgba(0, 113, 227, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }
});
