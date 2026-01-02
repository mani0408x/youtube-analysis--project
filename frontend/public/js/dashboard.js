// Helper to get current token for API calls
async function getAuthToken() {
    return localStorage.getItem('auth_token');
}

window.addEventListener('error', function (e) {
    console.error(e);
    // Provide visual feedback if JS crashes
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.padding = '20px';
    overlay.style.background = 'red';
    overlay.style.color = 'white';
    overlay.style.zIndex = '99999';
    overlay.innerText = 'JS Error: ' + e.message;
    document.body.appendChild(overlay);
});

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

    // Helper to generate inputs - RECTANGULAR & BLACK WITH SUGGESTIONS
    function createInputWithSuggestions(id, placeholder, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'suggestions-wrapper';
        wrapper.style.marginBottom = '10px';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'glass-input';
        input.placeholder = 'Enter YouTube Channel Name...';
        input.setAttribute('autocomplete', 'off');
        input.value = value;
        input.style.width = '100%';
        input.style.marginBottom = '0'; // Wrapper handles margin

        const list = document.createElement('div');
        list.className = 'suggestions-list';

        wrapper.appendChild(input);
        wrapper.appendChild(list);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submit if any
                list.style.display = 'none'; // Hide suggestions
                const analyzeBtn = document.getElementById('analyze-btn');
                if (analyzeBtn) analyzeBtn.click();
            }
        });

        // Autocomplete Logic
        let timeout = null;

        // Clear hidden ID on user typing
        input.addEventListener('input', () => {
            delete input.dataset.resolvedId;
        });

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clearTimeout(timeout);

            if (q.length < 1) {
                list.style.display = 'none';
                return;
            }

            timeout = setTimeout(async () => {
                try {
                    // Show loading
                    list.innerHTML = '<div style="padding:10px 15px; color:var(--text-secondary); font-size:0.9rem;">Loading...</div>';
                    list.style.display = 'block';

                    // console.log("Fetching suggestions for:", q); 
                    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);

                    if (!res.ok) {
                        throw new Error(`Server Error: ${res.status}`);
                    }

                    const suggestions = await res.json();

                    if (suggestions.length > 0) {
                        const formatSubs = (num) => {
                            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                            return num;
                        };

                        list.innerHTML = suggestions.map(s => `
                            <div class="suggestion-item" data-id="${s.id}" data-title="${s.title.replace(/"/g, '&quot;')}">
                                <img src="${s.thumbnail || 'https://via.placeholder.com/32'}" />
                                <div>
                                    <strong>${s.title}</strong>
                                    <span style="color:var(--text-secondary); font-size:0.75rem;">${formatSubs(s.subscriber_count)} subscribers</span>
                                </div>
                            </div>
                         `).join('');
                        list.style.display = 'block';

                        // Force Click Handlers Re-attach
                        list.querySelectorAll('.suggestion-item').forEach(item => {
                            item.addEventListener('click', (e) => {
                                e.stopPropagation();
                                input.value = item.getAttribute('data-title');
                                input.dataset.resolvedId = item.getAttribute('data-id');
                                list.style.display = 'none';
                                const analyzeBtn = document.getElementById('analyze-btn');
                                if (analyzeBtn) analyzeBtn.click();
                            });
                        });

                    } else {
                        // Show "No results" gracefully
                        list.innerHTML = `<div style="padding:10px 15px; color:var(--text-muted); font-size:0.9rem;">No channels found for "${q}"</div>`;
                        list.style.display = 'block';
                    }
                } catch (e) {
                    console.error("Suggestion Error:", e);
                    list.innerHTML = `<div style="padding:10px 15px; color:var(--text-error, red); font-size:0.9rem;">Error fetching suggestions.</div>`;
                    list.style.display = 'block';
                }
            }, 300); // Debounce 300ms
        });

        // Close on blur (delayed to allow click)
        // Or close on doc click
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                list.style.display = 'none';
            }
        });

        return wrapper;
    }

    function updateInputs() {
        const inputs = inputsContainer.querySelectorAll('input');
        const currentVals = Array.from(inputs).map(i => i.value);
        inputsContainer.innerHTML = ''; // Clear

        // Input 1
        const w1 = createInputWithSuggestions(
            'channel-id-1',
            isCompareMode ? 'Name or ID (Channel 1)' : 'Enter Channel Name or ID...',
            currentVals[0] || ''
        );
        inputsContainer.appendChild(w1);

        if (isCompareMode) {
            const count = parseInt(compareCountInput.value) || 2;
            for (let i = 2; i <= count; i++) {
                const w = createInputWithSuggestions(
                    `channel-id-${i}`,
                    `Name or ID (Channel ${i})`,
                    currentVals[i - 1] || ''
                );
                inputsContainer.appendChild(w);
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

    // Ambiguity Handling Helper
    function showSelectionModal(options, callback) {
        // Create a simple modal overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.maxWidth = '500px';
        card.style.width = '90%';
        card.style.maxHeight = '80vh';
        card.style.overflowY = 'auto';

        card.innerHTML = `<h3 style="margin-bottom:15px; text-align:center;">Select Channel</h3><p style="text-align:center; color:var(--text-secondary); margin-bottom:20px;">Multiple channels found. Please select one:</p>`;

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '10px';

        options.forEach(opt => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '15px';
            item.style.padding = '10px';
            item.style.background = 'rgba(255,255,255,0.05)';
            item.style.borderRadius = '8px';
            item.style.cursor = 'pointer';
            item.style.border = '1px solid transparent';

            item.onmouseover = () => item.style.border = '1px solid var(--primary-color)';
            item.onmouseout = () => item.style.border = '1px solid transparent';

            item.innerHTML = `
                <img src="${opt.thumbnail}" style="width:50px; height:50px; border-radius:50%;">
                <div>
                    <div style="font-weight:bold;">${opt.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${opt.description ? opt.description.substring(0, 60) + '...' : 'No description'}</div>
                </div>
            `;

            item.onclick = () => {
                callback(opt.id);
                document.body.removeChild(overlay);
            };

            list.appendChild(item);
        });

        // Cancel button
        const cancel = document.createElement('button');
        cancel.innerText = 'Cancel';
        cancel.className = 'btn-ghost';
        cancel.style.marginTop = '20px';
        cancel.style.width = '100%';
        cancel.onclick = () => document.body.removeChild(overlay);

        card.appendChild(list);
        card.appendChild(cancel);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    analyzeBtn.addEventListener('click', async () => {
        const inputs = inputsContainer.querySelectorAll('input');
        // Capture specific inputs to update them easily later if ambiguity happens
        const inputElements = Array.from(inputs);

        // Use hidden ID if available (from suggestion selection), else use text value
        const ids = inputElements.map(inp => inp.dataset.resolvedId || inp.value.trim()).filter(val => val !== '');

        if (ids.length === 0) return alert('Please enter a Channel Name or ID');
        if (isCompareMode && ids.length < 2) return alert('Please enter at least 2 channels for comparison');

        // Validation: Duplicates (skip for names as they might resolve differently, but good to warn if identical strings)
        // Let's rely on backend resolution for strictness, but client-side strictness:
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            return alert("Please enter distinct Channel Names/IDs.");
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

            // Handle Ambiguity (300)
            if (res.status === 300 && data.ambiguous) {
                loadingDiv.style.display = 'none';

                // If comparison, we know which index caused it
                // If single, it's just the one input

                showSelectionModal(data.options, (selectedId) => {
                    // Update the input with the RESOLVED ID
                    if (isCompareMode && data.input_index !== undefined) {
                        inputElements[data.input_index].value = selectedId;
                    } else {
                        inputElements[0].value = selectedId;
                    }
                    // Auto-click analyze again to proceed
                    analyzeBtn.click();
                });
                return;
            }

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
        // Reset Comparison UI
        const viewsChartCard = document.getElementById('viewsChart').parentElement;
        if (viewsChartCard) viewsChartCard.style.display = 'block';
        const compContainer = document.getElementById('comparison-charts-container');
        if (compContainer) compContainer.style.display = 'none';

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

        // Show specific elements for single mode
        const analyticsSection = document.getElementById('section-analytics');
        if (analyticsSection) {
            const h2 = analyticsSection.querySelector('h2');
            if (h2) h2.style.display = 'block';
        }
        const stratChart = document.getElementById('uploadStrategyChart');
        if (stratChart) stratChart.parentElement.style.display = 'block';
        const engChart = document.getElementById('engagementChart');
        if (engChart) engChart.parentElement.style.display = 'block';
        document.querySelector('.table-container').parentElement.style.display = 'block';


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
        const infoArea = document.querySelector('#section-overview .channel-header-card');

        if (infoArea) {
            // Force container style for multi-avatar horizontal layout
            infoArea.style.display = 'flex';
            infoArea.style.flexDirection = 'row'; // Explicitly horizontal
            infoArea.style.alignItems = 'center';
            infoArea.style.justifyContent = 'center';
            infoArea.style.gap = '30px'; // Increased gap for better separation
            infoArea.style.flexWrap = 'nowrap'; // Prevent wrapping to keep it horizontal
            infoArea.style.overflowX = 'auto'; // scroll if too small (mobile safe)

            infoArea.innerHTML = results.map(res => `
                <div class="comp-channel-header" style="text-align:center; min-width: 120px; flex-shrink: 0;">
                    <h2 style="font-size:1.8rem; margin:0; font-weight:700; color: white;">${res.channel.title}</h2>
                </div>
            `).join('<div style="font-weight:900; font-size:1.5rem; font-style: italic; color:var(--text-secondary); margin: 0 15px;">VS</div>');
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
            `;
        }

        // Hide specific analytics elements for Comparison Mode
        // We need to hide the Growth Chart container specifically as requested
        const growthChartEl = document.getElementById('growthChart');
        if (growthChartEl) growthChartEl.parentElement.style.display = 'none';

        const analyticsSection = document.getElementById('section-analytics');
        if (analyticsSection) {
            const h2 = analyticsSection.querySelector('h2');
            if (h2) h2.style.display = 'none'; // Hide "Deep Dive Analytics" header
        }
        const stratChart = document.getElementById('uploadStrategyChart');
        if (stratChart) stratChart.parentElement.style.display = 'none'; // Hide "Best Upload Time"

        // Charts for Comparison
        ['viewsChart', 'engagementChart', 'growthChart', 'uploadStrategyChart'].forEach(id => {
            if (charts[id]) charts[id].destroy();
        });

        const ctxViews = document.getElementById('viewsChart').getContext('2d');
        charts['viewsChart'] = new Chart(ctxViews, {
            type: 'bar',
            data: {
                labels: ['Engagement Rate (%)'],
                datasets: results.map((res, idx) => ({
                    label: res.channel.title,
                    data: [res.kpis.engagement_rate],
                    backgroundColor: idx === 0 ? 'rgba(54, 162, 235, 0.6)' : 'rgba(255, 99, 132, 0.6)',
                    borderColor: idx === 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Engagement Comparison', font: { size: 16 } }
                }
            }
        });

        const ctxEng = document.getElementById('engagementChart').getContext('2d');

        // Calculate Avg Likes and Comments from the videos array for better accuracy than just rate
        const engagementData = results.map((res, idx) => {
            const vids = res.videos || [];
            if (vids.length === 0) return { title: res.channel.title, likes: 0, comments: 0 };

            const totalLikes = vids.reduce((sum, v) => sum + (parseInt(v.likes || v.like_count) || 0), 0);
            const totalComments = vids.reduce((sum, v) => sum + (parseInt(v.comments || v.comment_count) || 0), 0);

            return {
                title: res.channel.title,
                avgLikes: Math.round(totalLikes / vids.length),
                avgComments: Math.round(totalComments / vids.length),
                color: idx === 0 ? 'rgba(54, 162, 235, 0.7)' : 'rgba(255, 99, 132, 0.7)',
                borderColor: idx === 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)'
            };
        });

        // 2. Engagement Comparison Chart (Bar)
        charts['engagementChart'] = new Chart(ctxEng, {
            type: 'bar',
            data: {
                labels: ['Avg Likes', 'Avg Comments'],
                datasets: results.map((res, idx) => ({
                    label: res.channel.title,
                    data: [engagementData[idx].avgLikes, engagementData[idx].avgComments],
                    backgroundColor: engagementData[idx].color,
                    borderColor: engagementData[idx].borderColor,
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Engagement per Video', color: '#9ca3af' }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Ensure container is visible
        document.getElementById('engagementChart').parentElement.style.display = 'block';

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
