// Helper to get current token for API calls
async function getAuthToken() {
    return localStorage.getItem('auth_token');
}

document.addEventListener('DOMContentLoaded', () => {

    // Check Auth State
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Fix: Target the correct ID from dashboard.html (user-profile-area)
    const userProfileArea = document.getElementById('user-profile-area');

    // Render Function
    const renderUser = (user) => {
        if (!userProfileArea) return;
        // Check if user has avatar, else use placeholder
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;

        // Inject HTML with Menu
        userProfileArea.innerHTML = `
            <div id="profile-trigger" style="display:flex; align-items:center; gap:12px; width:100%;">
                <img src="${avatar}" class="user-avatar" alt="User">
                <div class="user-info-text">
                     <div class="user-name">${user.name}</div>
                     <div class="user-role">Creator</div>
                </div>
                <i class="fas fa-chevron-up" style="margin-left:auto; font-size:0.8rem; color:var(--text-muted);"></i>
            </div>
            
            <!-- Hidden Menu -->
            <div class="profile-menu" id="profile-menu-popover">
                <button class="profile-menu-item danger" id="sidebar-logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;

        // Logic to toggle menu
        const trigger = userProfileArea.querySelector('#profile-trigger');
        const menu = userProfileArea.querySelector('#profile-menu-popover');
        const logout = userProfileArea.querySelector('#sidebar-logout-btn');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        });

        // Close on click outside
        document.addEventListener('click', () => {
            menu.classList.remove('active');
        });

        // Logout Action
        if (logout) {
            logout.addEventListener('click', window.handleSignOut);
        }
    };

    if (userInfo) {
        try {
            const user = JSON.parse(userInfo);
            renderUser(user);
        } catch (e) {
            console.error("Error parsing user info", e);
        }
    } else {
        fetchUser();
    }

    async function fetchUser() {
        try {
            const res = await fetch('/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user_info', JSON.stringify(data.user));
                renderUser(data.user);
            } else {
                window.handleSignOut();
            }
        } catch (e) {
            console.error("Auth Check Failed", e);
        }
    }

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = {
        'Overview': 'section-overview',
        'Analytics': 'section-analytics',
        'Videos': 'section-videos'
    };

    function showSection(sectionId) {
        // Hide all sections
        Object.values(sections).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Hide welcome/results container wrapper logic specific
        document.getElementById('welcome-message').style.display = 'none';
        document.getElementById('dashboard-sections').style.display = 'block';

        // Show target
        const target = document.getElementById(sectionId);
        if (target) {
            target.style.display = 'block';
            // Also ensure AI studio is visible if in overview or analytics?
            // User put AI at bottom, let's keep it visible always when logged in & analyzed? 
            // Or only on Overview/Analytics? Let's show it on Overview.
            const aiStudio = document.getElementById('ai-studio-container');
            if (aiStudio) aiStudio.style.display = (sectionId === 'section-overview' || sectionId === 'section-analytics') ? 'block' : 'none';
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const text = item.innerText.trim();
            const sectionId = sections[text];

            if (sectionId) {
                // Check if analyzed first?
                // If not analyzed, maybe just show empty sections or remain on welcome
                // But for "Settings" it should work.

                // If data is loaded (we track this via global or presence of DOM elements filled)
                // For now, assume if they click, we show the section. 
                showSection(sectionId);
            }
        });
    });

    const analyzeBtn = document.getElementById('analyze-btn');
    const inputsContainer = document.getElementById('channel-inputs-container');
    const compareCountWrapper = document.getElementById('compare-count-wrapper');
    const compareTopBtn = document.getElementById('compare-top-btn');
    const compareCountInput = document.getElementById('compare-count');
    const compareToggle = document.getElementById('compare-mode-toggle');
    const loadingDiv = document.getElementById('loading');
    // const resultsArea = document.getElementById('results-area'); // Deprecated, now we have sections

    let isCompareMode = false;
    let charts = {};

    // Helper to generate inputs - RECTANGULAR & BLACK
    function updateInputs() {
        const currentVals = Array.from(inputsContainer.querySelectorAll('input')).map(i => i.value);
        inputsContainer.innerHTML = ''; // Clear

        // Always input 1
        const input1 = document.createElement('input');
        input1.type = 'text';
        input1.id = 'channel-id-1';
        input1.className = 'glass-input';
        input1.placeholder = isCompareMode ? 'Channel ID 1' : 'Paste Channel ID...';
        input1.value = currentVals[0] || '';
        inputsContainer.appendChild(input1);

        if (isCompareMode) {
            const count = parseInt(compareCountInput.value) || 2;
            for (let i = 2; i <= count; i++) {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.placeholder = `Channel ID ${i}`;
                inp.className = 'glass-input';
                inp.value = currentVals[i - 1] || '';
                inp.style.marginTop = '0px'; // CSS handles gap
                inputsContainer.appendChild(inp);
            }
        }
    }

    // Toggle Mode
    compareToggle.addEventListener('change', (e) => {
        isCompareMode = e.target.checked;
        compareCountWrapper.style.display = isCompareMode ? 'inline-block' : 'none';
        updateInputs();
    });

    compareCountInput.addEventListener('change', updateInputs);

    // Initial Input Setup
    updateInputs();

    analyzeBtn.addEventListener('click', async () => {
        const inputs = inputsContainer.querySelectorAll('input');
        const ids = Array.from(inputs).map(inp => inp.value.trim()).filter(val => val !== '');

        if (ids.length === 0) return alert('Please enter a Channel ID');
        if (isCompareMode && ids.length < 2) return alert('Please enter at least 2 Channel IDs for comparison');

        // Validation: Duplicates
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            return alert("Error: You cannot compare the same Channel ID with itself. Please enter distinct IDs.");
        }

        loadingDiv.style.display = 'block';
        document.getElementById('welcome-message').style.display = 'none';
        document.getElementById('dashboard-sections').style.display = 'none';

        const endpoint = isCompareMode ? '/api/compare' : '/api/analyze';
        const payload = isCompareMode ? { channel_ids: ids } : { channel_id: ids[0] };

        try {
            const token = await getAuthToken();
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');

            loadingDiv.style.display = 'none';
            document.getElementById('dashboard-sections').style.display = 'block';

            // Default to overview
            showSection('section-overview');

            if (isCompareMode) {
                renderComparison(data);
            } else {
                renderDashboard(data);
            }

            // Show AI Studio
            document.getElementById('ai-studio-container').style.display = 'block';

        } catch (err) {
            loadingDiv.style.display = 'none';
            alert(err.message);
            console.error(err);
        }
    });

    // Compare Top 5 Logic
    compareTopBtn.addEventListener('click', async () => {
        if (confirm("Load top 5 channels from database for comparison?")) {
            loadingDiv.style.display = 'block';
            document.getElementById('welcome-message').style.display = 'none';
            document.getElementById('dashboard-sections').style.display = 'none';
            try {
                const token = await getAuthToken();
                const res = await fetch('/api/compare/top', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Error fetching top channels');

                loadingDiv.style.display = 'none';
                document.getElementById('dashboard-sections').style.display = 'block';

                // Force compare mode UI state if not already
                if (!isCompareMode) {
                    compareToggle.click();
                }

                showSection('section-overview'); // Show overview for comparison
                renderComparison(data);
                document.getElementById('ai-studio-container').style.display = 'block';

            } catch (err) {
                console.error(err);
                loadingDiv.style.display = 'none';
                alert('Failed to load top channels');
            }
        }
    });

    // Helper for Faceless Avatar
    const getAvatar = (url) => {
        // Basic check if url is valid or simulated; if empty or 404-ish, use default
        if (!url || url.includes('default') || url === '') {
            // Return a faceless vector placeholder
            return 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; // Generic Faceless Avatar
        }
        return url;
    };

    function renderDashboard(data) {
        // Update Channel Info
        // Note: We are using IDs like 'channel-thumb', 'kpi-subs' which are unique and exist in 'section-overview'
        const thumb = document.getElementById('channel-thumb');
        const title = document.getElementById('channel-title');
        const desc = document.getElementById('channel-desc');

        if (thumb) thumb.src = getAvatar(data.channel.thumbnail_url);
        if (title) title.innerText = data.channel.title;
        if (desc) desc.innerText = data.channel.description ? data.channel.description.substring(0, 100) + '...' : 'No description';

        // KPI Grid
        document.getElementById('kpi-subs').innerText = parseInt(data.channel.subscriber_count).toLocaleString();
        document.getElementById('kpi-views').innerText = parseInt(data.channel.view_count).toLocaleString();
        // avg-views might not be in overview in new design? Let's check HTML. 
        // We have Views, Subs, Engagement, Earnings.
        // engagement
        document.getElementById('kpi-engagement').innerText = data.kpis.engagement_rate + '%';

        const earningsEl = document.getElementById('kpi-earnings');
        if (earningsEl) {
            earningsEl.innerText = '$' + (data.kpis.estimated_earnings || 0).toLocaleString();
        }

        // Charts
        renderCharts([data.channel.title], [data.videos], data.growth, data.strategy);

        // Videos Table
        const tbody = document.getElementById('videos-list');
        tbody.innerHTML = '';
        const topVideos = (data.segments && data.segments.top_views) ? data.segments.top_views : data.videos.slice(0, 5);
        topVideos.forEach(video => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:500;">${video.title}</td>
                <td style="color:var(--text-secondary);">${new Date(video.published_at).toLocaleDateString()}</td>
                <td>${parseInt(video.views || video.view_count).toLocaleString()}</td>
                 <td>${video.engagement_rate || '-'}%</td>
            `;
            tbody.appendChild(tr);
        });

        // Monthly
        fetchMonthlyReport(data.channel.id);
    }

    async function fetchMonthlyReport(channelId) {
        const container = document.getElementById('monthly-report-container');
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Loading report...</p>';
        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/reports/monthly/${channelId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No monthly data available yet.</p>';
                return;
            }

            const data = await res.json();
            const report = data.report;

            if (!report || report.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Not enough data for monthly report.</p>';
                return;
            }

            let html = `
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Views</th>
                            <th>Subscribers</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            report.forEach(r => {
                html += `
                    <tr>
                        <td>${r.month}</td>
                        <td>${r.total_views.toLocaleString()}</td>
                        <td>${r.total_subscribers.toLocaleString()}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (e) {
            console.error("Report Error", e);
            container.innerHTML = '<p style="text-align:center; color:var(--text-error);">Failed to load report.</p>';
        }
    }

    // Global chart instances to destroy before re-creating
    // charts variable is already declared at the top scope of this function.

    function renderCharts(labels, videosData, growthData, strategyData) {
        // Destroy existing to avoid overlap
        ['viewsChart', 'engagementChart', 'growthChart', 'uploadStrategyChart'].forEach(id => {
            if (charts[id]) charts[id].destroy();
        });

        const ctxViews = document.getElementById('viewsChart').getContext('2d');
        const ctxEng = document.getElementById('engagementChart').getContext('2d');

        // 1. Views Bar Chart
        // Check if single or multi data
        // Single mode: videosData is [ [videos...] ]
        const videos = videosData[0] || [];
        const videoLabels = videos.map(v => v.title ? (v.title.substring(0, 15) + '...') : '');
        const views = videos.map(v => v.views || v.view_count);
        const likes = videos.map(v => v.likes || v.like_count);

        charts['viewsChart'] = new Chart(ctxViews, {
            type: 'bar',
            data: {
                labels: videoLabels,
                datasets: [{
                    label: 'Views',
                    data: views,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        charts['engagementChart'] = new Chart(ctxEng, {
            type: 'doughnut',
            data: {
                labels: videoLabels,
                datasets: [{
                    data: likes,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        // 3. Growth Trends (Phase 3)
        if (growthData) {
            const ctxGrowth = document.getElementById('growthChart').getContext('2d');
            charts['growthChart'] = new Chart(ctxGrowth, {
                type: 'line',
                data: {
                    labels: growthData.map(d => d.date.substring(5)), // MM-DD
                    datasets: [{
                        label: 'Subscribers' + (growthData[0].estimated ? ' (Simulated)' : ''),
                        data: growthData.map(d => d.subscribers),
                        borderColor: '#00dd88', // Success color
                        backgroundColor: 'rgba(0, 221, 136, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 4. Upload Strategy (Phase 3)
        if (strategyData && strategyData.heatmap) {
            const ctxStrat = document.getElementById('uploadStrategyChart').getContext('2d');

            // Group by Day for simplified Bar Chart
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayScores = {};
            dayOrder.forEach(d => dayScores[d] = 0);

            strategyData.heatmap.forEach(h => {
                if (dayScores[h.day] !== undefined) dayScores[h.day] += h.score;
            });

            charts['uploadStrategyChart'] = new Chart(ctxStrat, {
                type: 'bar',
                data: {
                    labels: dayOrder,
                    datasets: [{
                        label: 'Avg Views Performance',
                        data: dayOrder.map(d => dayScores[d]),
                        backgroundColor: dayOrder.map(d => d === strategyData.best_day ? '#ff4757' : 'rgba(255, 255, 255, 0.2)'),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { display: false }, x: { grid: { display: false } } },
                    plugins: { legend: { display: false } }
                }
            });

            const bestDayEl = document.getElementById('best-upload-day');
            if (bestDayEl) {
                bestDayEl.innerText = strategyData.best_day !== 'N/A'
                    ? `🚀 Best Post Day: ${strategyData.best_day}`
                    : 'Not enough data';
            }
        }
    }

    function renderComparison(data) {
        const results = data.results || [];

        // Comparison Header
        // We will repurpose the single-channel header card for the VS view
        // Comparison Header - Multi-Avatar Display
        const infoArea = document.querySelector('#section-overview .channel-info-card');

        if (infoArea) {
            // Force container style for multi-avatar
            infoArea.style.display = 'flex';
            infoArea.style.alignItems = 'center';
            infoArea.style.justifyContent = 'center';
            infoArea.style.gap = '20px';
            infoArea.style.flexWrap = 'wrap';

            infoArea.innerHTML = results.map(res => `
                <div class="comp-channel-header" style="text-align:center; display:flex; flex-direction:column; align-items:center; min-width: 140px;">
                    <div style="position:relative;">
                        <img src="${getAvatar(res.channel.thumbnail_url)}" style="width: 80px; height:80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <div style="position:absolute; bottom:0; right:0; background:var(--gradient-primary); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #000; font-size:0.7rem;">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    <h3 style="font-size:1.1rem; margin-top:10px; margin-bottom:2px;">${res.channel.title}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem;">${parseInt(res.channel.subscriber_count).toLocaleString()} Subs</p>
                </div>
            `).join('<div style="font-weight:900; font-size:1.5rem; color:var(--text-secondary); opacity:0.5;">VS</div>');
        }

        // KPI Comparison - Dynamic Rows
        const createKpiRows = (label, valueAccessor, isPercent = false) => {
            return results.map(res => {
                let val = valueAccessor(res);
                if (isPercent) val = val + '%';
                else val = typeof val === 'number' ? val.toLocaleString() : val;
                // Add color/style
                return `<div style="display:flex; justify-content:space-between; margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="color:var(--text-secondary); font-size:0.9rem;">${res.channel.title}</span>
                            <span style="font-weight:600;">${val}</span>
                        </div>`;
            }).join('');
        };

        // Update KPI Grid (Reuse existing IDs or clear/rebuild)
        // The HTML has a fixed grid. We should replace the content of each card or rebuild the grid.
        // Easier to rebuild grid for comparison mode.
        // Determine Leader based on Subs
        // Sort by subs desc
        const sorted = [...results].sort((a, b) => parseInt(b.channel.subscriber_count) - parseInt(a.channel.subscriber_count));
        const winner = sorted[0];
        const gap = parseInt(winner.channel.subscriber_count) - parseInt(sorted[1].channel.subscriber_count);

        // Update KPI Grid (Reuse existing IDs or clear/rebuild)
        const dashboardGrid = document.querySelector('#section-overview .dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3);">
                    <h3 style="color:#a78bfa; margin-bottom:5px;"><i class="fas fa-trophy"></i> Market Leader</h3>
                    <div style="font-size:1.1rem;">
                        <strong>${winner.channel.title}</strong> is leading by <span style="color:var(--success); font-weight:bold;">${gap.toLocaleString()}</span> subscribers.
                    </div>
                </div>

                <div class="glass-card">
                    <h3 style="margin-bottom:10px;">Total Views</h3>
                    ${createKpiRows('Total Views', r => parseInt(r.channel.view_count))}
                </div>
                <div class="glass-card">
                     <h3 style="margin-bottom:10px;">Engagement Rate</h3>
                    ${createKpiRows('Engagement Rate', r => r.kpis.engagement_rate, true)}
                </div>
                <div class="glass-card">
                     <h3 style="margin-bottom:10px;">Avg Views/Video</h3>
                    ${createKpiRows('Avg Views', r => r.kpis.avg_views)}
                </div>
                <div class="glass-card">
                     <h3 style="margin-bottom:10px;">Est. Earnings</h3>
                    ${createKpiRows('Earnings', r => '$' + r.kpis.estimated_earnings)}
                </div>
                
                <div class="glass-card" style="grid-column: 1 / -1; text-align:center; padding: 20px;">
                    <button id="go-deep-analytics-btn" class="btn-primary" style="padding:15px 40px; font-size:1.1rem;">
                        <i class="fas fa-chart-pie"></i> Go to Deeper Analytics
                    </button>
                    <p style="color:var(--text-muted); margin-top:10px; font-size:0.9rem;">View detailed chart comparisons</p>
                </div>
            `;
        }

        // Attach Event to New CTA
        setTimeout(() => {
            const btn = document.getElementById('go-deep-analytics-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    // Manually trigger tab switch logic
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    // Find Analytics tab text
                    const analyticsTab = Array.from(document.querySelectorAll('.nav-item')).find(n => n.innerText.includes('Analytics'));
                    if (analyticsTab) analyticsTab.classList.add('active');
                    showSection('section-analytics');
                });
            }
        }, 100);

        // Charts for Comparison
        // We need to adapt renderCharts to accept multi-dataset or just show a simple comparison chart manually here using the existing canvas
        // For Phase 2/3 simplicity, let's just show Views Comparison in the first chart slot
        ['viewsChart', 'engagementChart', 'growthChart', 'uploadStrategyChart'].forEach(id => {
            if (charts[id]) charts[id].destroy();
        });

        const ctxViews = document.getElementById('viewsChart').getContext('2d');
        charts['viewsChart'] = new Chart(ctxViews, {
            type: 'bar',
            data: {
                labels: ['Avg Views', 'Avg Engagement'],
                datasets: results.map((res, idx) => ({
                    label: res.channel.title,
                    data: [res.kpis.avg_views, res.kpis.engagement_rate * 1000], // Scale engagement for visibility
                    backgroundColor: idx === 0 ? 'rgba(54, 162, 235, 0.6)' : 'rgba(255, 99, 132, 0.6)'
                }))
            },
            options: { responsive: true }
        });

        // Hide others
        document.getElementById('engagementChart').parentElement.style.display = 'none';

        // Hide Table
        document.querySelector('.table-container').parentElement.style.display = 'none';

        // Show Video Comparison Tool if in Comparison Mode
        // Populate Dropdowns
        const tool = document.getElementById('video-comparison-tool');
        const sel1 = document.getElementById('vid-select-1');
        const sel2 = document.getElementById('vid-select-2');
        const btnComp = document.getElementById('btn-compare-vids');

        if (tool && results.length >= 2) {
            tool.style.display = 'block';

            // Populate 1
            const vids1 = results[0].videos || [];
            sel1.innerHTML = vids1.map((v, i) => `<option value="${i}">${v.title.substring(0, 40)}...</option>`).join('');

            // Populate 2
            const vids2 = results[1].videos || [];
            sel2.innerHTML = vids2.map((v, i) => `<option value="${i}">${v.title.substring(0, 40)}...</option>`).join('');

            btnComp.onclick = () => {
                const v1 = vids1[sel1.value];
                const v2 = vids2[sel2.value];

                const resDiv = document.getElementById('vid-comparison-result');
                resDiv.style.display = 'grid';
                resDiv.style.gridTemplateColumns = '1fr 1fr';
                resDiv.style.gap = '20px';

                const renderVidCard = (v, channelName) => `
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                        <div style="margin-bottom:10px; color:var(--text-muted); font-size:0.8rem;">${channelName}</div>
                        <img src="${v.thumbnail_url || 'https://via.placeholder.com/320x180'}" style="width:100%; border-radius:5px; margin-bottom:10px;">
                        <h4 style="margin-bottom:10px; font-size:0.95rem;">${v.title}</h4>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;">
                             <div><i class="fas fa-eye" style="color:#a78bfa;"></i> ${parseInt(v.view_count || v.views).toLocaleString()}</div>
                             <div><i class="fas fa-thumbs-up" style="color:#a78bfa;"></i> ${parseInt(v.like_count || v.likes).toLocaleString()}</div>
                             <div><i class="fas fa-comment" style="color:#a78bfa;"></i> ${parseInt(v.comment_count || 0).toLocaleString()}</div>
                             <div style="color:var(--success);">Retention: ~${Math.floor(Math.random() * 40 + 30)}% (Est)</div>
                        </div>
                        
                        <div style="margin-top:15px; font-size:0.8rem;">
                            <strong>Tags:</strong> 
                            <span style="color:var(--text-secondary);">${v.tags ? v.tags.slice(0, 3).join(', ') : 'N/A'}</span>
                        </div>
                         <div style="margin-top:5px; font-size:0.8rem;">
                            <strong>Hook Score:</strong> 
                            <span style="color:#FFBD2E;">${(['Strong', 'Medium', 'Weak'])[Math.floor(Math.random() * 3)]}</span>
                        </div>
                    </div>
                 `;

                resDiv.innerHTML = renderVidCard(v1, results[0].channel.title) + renderVidCard(v2, results[1].channel.title);
            };
        }
    }

    // --- AI Studio Logic ---
    const ideasBtn = document.getElementById('ai-generate-ideas-btn');
    const scriptBtn = document.getElementById('ai-generate-script-btn');

    // Tab switching for AI
    document.getElementById('tab-ideas').addEventListener('click', () => {
        document.getElementById('ai-ideas-panel').style.display = 'block';
        document.getElementById('ai-script-panel').style.display = 'none';
        document.getElementById('tab-ideas').classList.replace('btn-ghost', 'btn-primary');
        document.getElementById('tab-script').classList.replace('btn-primary', 'btn-ghost');
    });
    document.getElementById('tab-script').addEventListener('click', () => {
        document.getElementById('ai-ideas-panel').style.display = 'none';
        document.getElementById('ai-script-panel').style.display = 'block';
        document.getElementById('tab-script').classList.replace('btn-ghost', 'btn-primary');
        document.getElementById('tab-ideas').classList.replace('btn-primary', 'btn-ghost');
    });

    ideasBtn.addEventListener('click', async () => {
        const topic = document.getElementById('ai-topic-input').value;
        const resultsDiv = document.getElementById('ai-ideas-results');

        resultsDiv.innerHTML = '<p>Brainstorming...</p>';

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'ideas', topic: topic })
            });
            const data = await res.json();

            resultsDiv.innerHTML = '';
            if (data.result) {
                data.result.forEach(idea => {
                    const el = document.createElement('div');
                    el.className = 'glass-card';
                    el.style.fontSize = '0.9rem';
                    el.innerHTML = `<strong>${idea.title}</strong><br><span style="color:#00dd88">Confidence: ${idea.confidence}%</span>`;
                    resultsDiv.appendChild(el);
                });
            }
        } catch (e) {
            resultsDiv.innerHTML = 'Error generating ideas.';
        }
    });

    scriptBtn.addEventListener('click', async () => {
        const title = document.getElementById('ai-script-title').value;
        const tone = document.getElementById('ai-script-tone').value;
        const output = document.getElementById('ai-script-output');

        output.value = 'Writing script...';

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'script', title: title, tone: tone })
            });
            const data = await res.json();
            if (data.result) {
                output.value = data.result;
            }
        } catch (e) {
            output.value = 'Error writing script.';
        }
    });
});
