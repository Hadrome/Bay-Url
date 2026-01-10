document.addEventListener('DOMContentLoaded', () => {
    // --- Utils: Toast System ---
    function showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.9)';
            toast.style.transition = 'all 0.3s cubic-bezier(0.32, 0, 0.67, 0)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Utils: Toast System ---
    function showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.9)';
            toast.style.transition = 'all 0.3s cubic-bezier(0.32, 0, 0.67, 0)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

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
            submitBtn.textContent = '处理中...';

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
                        slug: slugInput.value.trim() || undefined,
                        expiration: document.getElementById('expirationSelect').value // Send expiration
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error(data.message || '今日限额已满');
                    }
                    throw new Error(data.message || '生成链接失败');
                }

                const fullUrl = `${window.location.origin}/${data.slug}`;
                shortUrlLink.href = fullUrl;
                shortUrlLink.textContent = fullUrl;
                resultDiv.classList.add('visible');

                showToast('短链接生成成功！');

                // Auto Copy
                navigator.clipboard.writeText(fullUrl).then(() => {
                    showToast('已自动复制到剪贴板 ✅');
                }).catch(err => {
                    console.error('Auto copy failed:', err);
                });

                // Clear inputs on success
                urlInput.value = '';
                slugInput.value = '';

            } catch (err) {
                console.error("Shorten Error:", err);
                errorMsg.textContent = err.message || "请求发生未知错误";
                errorMsg.style.display = 'block';
                showToast(err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '缩短链接';
            }
        });

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shortUrlLink.href).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已复制';
                copyBtn.style.background = 'var(--primary)';
                copyBtn.style.color = '#fff';

                showToast('链接已复制到剪贴板');

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                    copyBtn.style.color = '';
                }, 2000);
            });
        });
    }

    // Admin Dashboard Logic
    const adminLogin = document.getElementById('adminLogin');
    if (adminLogin) {
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
                    showDashboard();
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
                        <a href="${link.url}" target="_blank" class="link-origin" title="${link.url}">${link.url}</a>
                        <div class="link-meta">
                            ${link.visits || 0} 次访问 • ${new Date(link.created_at * 1000).toLocaleDateString()}
                            ${link.max_visits ? ' • <span class="badge">阅后即焚</span>' : ''}
                            ${link.expires_at ? ` • 📅 ${new Date(link.expires_at * 1000).toLocaleDateString()} 过期` : ''}
                            ${link.note ? `<div style="margin-top:4px; font-size:12px; color:#666;">📝 ${link.note}</div>` : ''}
                        </div>
                    </div>
                    <div class="actions" style="display:flex; gap:8px;">
                        <button onclick="updateNote(${link.id}, '${link.note || ''}')" class="note-btn" style="background:rgba(255,149,0,0.1); color:#ff9500;">备注</button>
                        <button onclick="updateLink(${link.id})" class="edit-btn" style="background:rgba(0,122,255,0.1); color:#007aff;">有效期</button>
                        <button onclick="deleteLink(${link.id})" class="delete-btn">删除</button>
                    </div>
                </div>
            `).join('');
        };

        const showDashboard = () => {
            adminLogin.classList.add('hidden');
            dashboard.classList.remove('hidden');
            document.querySelector('.container').classList.add('wide'); // Widen Layout
            if (dashboard.classList.contains('hidden')) dashboard.style.display = 'block';
            if (adminLogin.classList.contains('hidden')) adminLogin.style.display = 'none';
        };

        const logout = () => {
            localStorage.removeItem('adminToken');
            authToken = null;
            location.reload();
        };

        // Attach to window for onclick access
        window.deleteLink = async (id) => {
            if (!confirm('确定要删除吗？')) return;
            try {
                const response = await fetch(`/api/delete?id=${id}`, {
                    method: 'DELETE',
                    headers: { 'Admin-Token': authToken }
                });
                if (response.ok) {
                    showToast('链接已删除');
                    loadLinks();
                    loadDashboard(); // Reload stats
                } else {
                    showToast('删除失败', 'error');
                }
            } catch (err) {
                showToast('操作失败', 'error');
            }
        };


        window.updateNote = async (id, currentNote) => {
            const newNote = prompt("修改备注：", currentNote);
            if (newNote === null) return;

            try {
                const response = await fetch('/api/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Admin-Token': authToken },
                    body: JSON.stringify({ id, action: 'set_note', value: newNote })
                });
                if (response.ok) {
                    showToast('备注已更新');
                    loadLinks();
                } else {
                    showToast('更新失败', 'error');
                }
            } catch (e) {
                showToast('请求失败', 'error');
            }
        };

        window.updateLink = async (id) => {
            const input = prompt("设置有效期：\n输入天数 (如 30)\n输入 0 代表永久有效\n输入 -1 代表阅后即焚 (1次访问)", "30");
            if (input === null) return;

            const val = parseInt(input);
            if (isNaN(val)) {
                showToast('请输入有效数字', 'error');
                return;
            }

            let body = {};
            if (val === -1) {
                body = { id, action: 'set_1_time' };
            } else {
                body = { id, action: 'set_expiry_days', value: val };
            }

            try {
                const response = await fetch('/api/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Admin-Token': authToken },
                    body: JSON.stringify(body)
                });
                if (response.ok) {
                    showToast('有效期已更新');
                    loadLinks();
                } else {
                    showToast('更新失败', 'error');
                }
            } catch (e) {
                showToast('请求失败', 'error');
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
                if (!response.ok) return;

                const data = await response.json();

                document.getElementById('todayVisits').textContent = data.today.visits;
                document.getElementById('todayLinks').textContent = data.today.links;

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
                // Determine retention days (need to fetch from DB via settings API? 
                // Currently settings API only returns daily_limit? Let's check settings.js or modify it.
                // Or just rely on default 30 if not set. Wait, settings.js needs update to return all settings?
                // For now, let's assume settings API returns *all* settings or modify it.
                if (data.retention_days !== undefined) {
                    document.getElementById('retentionDaysInput').value = data.retention_days;
                }
            } catch (err) {
                console.error("Settings Error:", err);
            }
        }

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = settingsForm.querySelector('button');
                const originalText = btn.textContent;
                btn.textContent = '保存中...';
                btn.disabled = true;

                const limit = parseInt(document.getElementById('dailyLimitInput').value);
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Admin-Token': authToken
                        },
                        body: JSON.stringify({
                            daily_limit: limit
                        })
                    });
                    if (response.ok) {
                        showToast('系统设置已更新');
                    } else {
                        showToast('保存失败', 'error');
                    }
                } catch (err) {
                    showToast('保存错误: ' + err.message, 'error');
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            });
        }

        // Data Clean Logic
        const cleanForm = document.getElementById('cleanForm');
        if (cleanForm) {
            cleanForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!confirm("确定要清理旧日志吗？这无法撤销。")) return; // Double confirmation

                const btn = cleanForm.querySelector('button');
                const originalText = btn.textContent;
                btn.textContent = '清理中...';
                btn.disabled = true;

                const days = parseInt(document.getElementById('retentionDaysInput').value);
                try {
                    const response = await fetch('/api/clean', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Admin-Token': authToken
                        },
                        body: JSON.stringify({ retention_days: days })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showToast(data.message || '清理完成');
                    } else {
                        showToast(data.error || '清理失败', 'error');
                    }
                } catch (err) {
                    showToast('清理错误: ' + err.message, 'error');
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            });
        }

        function renderChart(trendData) {
            const ctx = document.getElementById('trendChart');
            if (!ctx) return;

            // Destroy existing chart if any
            if (window.myTrendChart) {
                window.myTrendChart.destroy();
            }

            window.myTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.length ? trendData.map(d => new Date(d.date).toLocaleDateString()) : ['今日'],
                    datasets: [{
                        label: '每日访问量',
                        data: trendData.length ? trendData.map(d => d.visits) : [0],
                        borderColor: '#007aff',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#007aff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Critical for custom height
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            border: { display: false },
                            grid: {
                                borderDash: [4, 4],
                                color: 'rgba(0,0,0,0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: { family: 'Inter', size: 11 },
                                color: '#8e8e93',
                                maxTicksLimit: 5
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: 'Inter', size: 11 },
                                color: '#8e8e93'
                            }
                        }
                    }
                }
            });
        }
    }
});
