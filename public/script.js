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

            errorMsg.style.display = 'none';
            resultDiv.classList.remove('visible');
            submitBtn.disabled = true;
            submitBtn.textContent = '处理中...';

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
                        expiration: document.getElementById('expirationSelect').value
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

                navigator.clipboard.writeText(fullUrl).then(() => {
                    showToast('已自动复制到剪贴板 ✅');
                }).catch(err => {
                    console.error('Auto copy failed:', err);
                });

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

        // 分页和筛选状态
        let currentPage = 1;
        let pageSize = 20;
        let searchQuery = '';
        let selectedIds = new Set();

        const loadLinks = async (page = 1, search = '') => {
            currentPage = page;
            searchQuery = search;

            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    pageSize: pageSize.toString()
                });
                if (search) params.append('search', search);

                const response = await fetch(`/api/list?${params}`, {
                    headers: { 'Admin-Token': authToken }
                });

                if (response.status === 401) {
                    throw new Error('未授权');
                }

                const result = await response.json();
                renderLinks(result.data || []);
                renderPagination(result.pagination);
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
            // 显示全选容器和批量删除按钮
            const selectAllContainer = document.getElementById('selectAllContainer');
            const batchDeleteBtn = document.getElementById('batchDeleteBtn');

            if (selectAllContainer) selectAllContainer.style.display = links.length > 0 ? 'block' : 'none';

            // 清空选中状态
            selectedIds.clear();
            updateBatchDeleteBtn();

            if (!Array.isArray(links) || links.length === 0) {
                linkList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无数据</div>';
                return;
            }

            linkList.innerHTML = links.map(link => `
                <div class="link-item" data-id="${link.id}">
                    <div style="display:flex; align-items:flex-start; gap:12px; flex:1; min-width:0;">
                        <input type="checkbox" class="link-checkbox" data-id="${link.id}" 
                            style="width:18px; height:18px; margin-top:4px; cursor:pointer; flex-shrink:0;">
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
                    </div>
                    <div class="actions">
                        <button onclick="updateNote(${link.id}, '${(link.note || '').replace(/'/g, "\\'")}')" class="note-btn" style="background:rgba(255,149,0,0.1); color:#ff9500;">备注</button>
                        <button onclick="updateLink(${link.id})" class="edit-btn" style="background:rgba(0,122,255,0.1); color:#007aff;">有效期</button>
                        <button onclick="deleteLink(${link.id})" class="delete-btn">删除</button>
                    </div>
                </div>
            `).join('');

            // 绑定复选框事件
            document.querySelectorAll('.link-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = parseInt(e.target.dataset.id);
                    if (e.target.checked) {
                        selectedIds.add(id);
                    } else {
                        selectedIds.delete(id);
                    }
                    updateBatchDeleteBtn();
                    updateSelectAllCheckbox();
                });
            });
        };

        const renderPagination = (pagination) => {
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
            const pageInfo = document.getElementById('pageInfo');

            if (!pagination) return;

            pageInfo.textContent = `第 ${pagination.page} / ${pagination.totalPages} 页 (共 ${pagination.total} 条)`;
            prevBtn.disabled = pagination.page <= 1;
            nextBtn.disabled = pagination.page >= pagination.totalPages;
        };

        const updateBatchDeleteBtn = () => {
            const btn = document.getElementById('batchDeleteBtn');
            const countSpan = document.getElementById('selectedCount');
            if (btn && countSpan) {
                countSpan.textContent = selectedIds.size;
                btn.style.display = selectedIds.size > 0 ? 'inline-block' : 'none';
            }
        };

        const updateSelectAllCheckbox = () => {
            const selectAll = document.getElementById('selectAllCheckbox');
            const checkboxes = document.querySelectorAll('.link-checkbox');
            if (selectAll && checkboxes.length > 0) {
                selectAll.checked = selectedIds.size === checkboxes.length;
                selectAll.indeterminate = selectedIds.size > 0 && selectedIds.size < checkboxes.length;
            }
        };

        // 全选事件
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.link-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const id = parseInt(cb.dataset.id);
                    if (e.target.checked) {
                        selectedIds.add(id);
                    } else {
                        selectedIds.delete(id);
                    }
                });
                updateBatchDeleteBtn();
            });
        }

        // 批量删除事件
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', async () => {
                if (selectedIds.size === 0) return;
                if (!confirm(`确定要删除选中的 ${selectedIds.size} 个链接吗？`)) return;

                try {
                    const response = await fetch('/api/delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Admin-Token': authToken
                        },
                        body: JSON.stringify({ ids: Array.from(selectedIds) })
                    });

                    if (response.ok) {
                        showToast(`已删除 ${selectedIds.size} 个链接`);
                        selectedIds.clear();
                        loadLinks(currentPage, searchQuery);
                        loadDashboard();
                    } else {
                        showToast('批量删除失败', 'error');
                    }
                } catch (err) {
                    showToast('操作失败', 'error');
                }
            });
        }

        // 搜索事件
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                loadLinks(1, searchInput.value.trim());
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    loadLinks(1, searchInput.value.trim());
                }
            });
        }

        // 分页事件
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) loadLinks(currentPage - 1, searchQuery);
            });
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                loadLinks(currentPage + 1, searchQuery);
            });
        }

        const showDashboard = () => {
            adminLogin.classList.add('hidden');
            dashboard.classList.remove('hidden');
            document.querySelector('.container').classList.add('wide');
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
                    loadLinks(currentPage, searchQuery);
                    loadDashboard();
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
                    loadLinks(currentPage, searchQuery);
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
                    loadLinks(currentPage, searchQuery);
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

        // --- 访问记录功能 ---
        let visitsPage = 1;
        const visitsPageSize = 20;
        const visitsList = document.getElementById('visitsList');

        async function loadVisits(page = 1) {
            visitsPage = page;
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    pageSize: visitsPageSize.toString()
                });

                const response = await fetch(`/api/visits?${params}`, {
                    headers: { 'Admin-Token': authToken }
                });

                if (!response.ok) {
                    visitsList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">加载失败</div>';
                    return;
                }

                const result = await response.json();
                renderVisits(result.data || []);
                renderVisitsPagination(result.pagination);
            } catch (err) {
                console.error('Load Visits Error:', err);
                visitsList.innerHTML = '<div style="text-align:center;color:red;padding:20px;">加载失败</div>';
            }
        }

        function renderVisits(visits) {
            if (!Array.isArray(visits) || visits.length === 0) {
                visitsList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">暂无访问记录</div>';
                return;
            }

            visitsList.innerHTML = visits.map(v => `
                <div class="visit-item">
                    <div class="visit-info">
                        <div class="visit-slug">
                            <span class="visit-badge">🔗</span>
                            <a href="/${v.slug}" target="_blank">/${v.slug}</a>
                        </div>
                        <div class="visit-details">
                            <span class="visit-tag">📍 ${v.ip}</span>
                            <span class="visit-tag">📱 ${v.device}</span>
                            <span class="visit-tag">🌐 ${v.browser}</span>
                        </div>
                        <div class="visit-meta">
                            <span>⚡ 来源: ${v.referer.length > 40 ? v.referer.substring(0, 40) + '...' : v.referer}</span>
                            <span>⏰ ${v.visit_time}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function renderVisitsPagination(pagination) {
            const prevBtn = document.getElementById('visitsPrevBtn');
            const nextBtn = document.getElementById('visitsNextBtn');
            const pageInfo = document.getElementById('visitsPageInfo');

            if (!pagination) return;

            pageInfo.textContent = `第 ${pagination.page} / ${pagination.totalPages} 页 (共 ${pagination.total} 条)`;
            prevBtn.disabled = pagination.page <= 1;
            nextBtn.disabled = pagination.page >= pagination.totalPages;
        }

        // 访问记录分页事件
        const visitsPrevBtn = document.getElementById('visitsPrevBtn');
        const visitsNextBtn = document.getElementById('visitsNextBtn');
        const refreshVisitsBtn = document.getElementById('refreshVisitsBtn');

        if (visitsPrevBtn) {
            visitsPrevBtn.addEventListener('click', () => {
                if (visitsPage > 1) loadVisits(visitsPage - 1);
            });
        }
        if (visitsNextBtn) {
            visitsNextBtn.addEventListener('click', () => {
                loadVisits(visitsPage + 1);
            });
        }
        if (refreshVisitsBtn) {
            refreshVisitsBtn.addEventListener('click', () => {
                loadVisits(1);
                loadDashboard();
                showToast('已刷新');
            });
        }

        // 登录后加载访问记录
        if (authToken) {
            loadVisits();
        }
    }
});
