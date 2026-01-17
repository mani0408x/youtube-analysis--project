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
            <div id="profile-trigger" style="display:flex; align-items:center; gap:12px; width:100%; cursor:pointer;">
                <img src="${avatar}" class="user-avatar" alt="User" style="width:32px; height:32px; border-radius:50%;">
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
            checkAutoAnalyze(user);
        } catch (e) {
            console.error("Error parsing user info", e);
        }
    } else {
        fetchUser();
    }

    async function checkAutoAnalyze(user) {
        // Simple heuristic: if url has hash, maybe go there
        // Or if we need to auto-analyze assigned channel
        if (user.assigned_channel_id && !sessionStorage.getItem('auto_analyzed')) {
            sessionStorage.setItem('auto_analyzed', 'true');
            setTimeout(() => {
                const input = document.getElementById('channel-id-1');
                if (input) {
                    input.value = user.assigned_channel_id;
                    const analyzeBtn = document.getElementById('analyze-btn');
                    if (analyzeBtn) analyzeBtn.click();
                }
            }, 500);
        }
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
                checkAutoAnalyze(data.user);
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
        'Videos': 'section-videos',
        'Analyzed Channels': 'section-my-channels',
        'AI Studio': 'section-ai-studio'
    };

    function showSection(name) {
        const sectionId = sections[name];

        // Hide all sections
        Object.values(sections).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Hide welcome/results container wrapper logic specific
        const welcome = document.getElementById('welcome-message');
        if (welcome) welcome.style.display = 'none';

        const dashSections = document.getElementById('dashboard-sections');
        if (dashSections) dashSections.style.display = 'block';

        // Show target
        const target = document.getElementById(sectionId);
        if (target) {
            target.style.display = 'block';
        }

        // Update nav active state
        navItems.forEach(item => {
            item.classList.toggle('active', item.innerText.trim() === name);
        });

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.innerText = name;

        if (name === 'Analyzed Channels') fetchMyChannels();
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const text = item.innerText.trim();
            if (sections[text]) showSection(text);
        });
    });

    const analyzeBtn = document.getElementById('analyze-btn');
    const inputsContainer = document.getElementById('channel-inputs-container');
    const compareCountWrapper = document.getElementById('compare-count-wrapper');
    const compareCountInput = document.getElementById('compare-count');
    const compareToggle = document.getElementById('compare-mode-toggle');
    const loadingDiv = document.getElementById('loading');

    let isCompareMode = false;
    let currentChannelId = null;
    let currentNextPageToken = null;

    // Helper to generate inputs - RECTANGULAR & BLACK WITH SUGGESTIONS
    function createInputWithSuggestions(id, placeholder, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'suggestions-wrapper';
        wrapper.style.marginBottom = '10px';

        const input = document.createElement('input');
        input.id = id; // Important for checkAutoAnalyze
        input.type = 'text';
        input.className = 'glass-input';
        input.placeholder = placeholder || 'Enter YouTube Channel Name...';
        input.setAttribute('autocomplete', 'off');
        input.value = value || '';
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
                // Removed auto-click as per user request
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

                    const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);

                    if (res.status === 429) {
                        throw new Error("Quota Exceeded");
                    }

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
                                // Removed auto-click as per user request
                            });
                        });

                    } else {
                        // Show "No results" gracefully
                        list.innerHTML = `<div style="padding:10px 15px; color:var(--text-muted); font-size:0.9rem;">No channels found for "${q}"</div>`;
                        list.style.display = 'block';
                    }
                } catch (e) {
                    console.error("Suggestion Error:", e);
                    if (e.message === "Quota Exceeded") {
                        list.innerHTML = `<div style="padding:10px 15px; color:var(--text-error, #ef4444); font-size:0.85rem; background:rgba(239, 68, 68, 0.1);">
                            <strong>Daily Limit Reached</strong><br>Youtube API quota exceeded. Try again tomorrow.
                         </div>`;
                    } else {
                        list.innerHTML = `<div style="padding:10px 15px; color:var(--text-error, red); font-size:0.9rem;">Error fetching suggestions.</div>`;
                    }
                    list.style.display = 'block';
                }
            }, 300); // Debounce 300ms
        });

        // Close on blur (delayed to allow click)
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
            const count = parseInt(compareCountInput ? compareCountInput.value : 2) || 2;
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
    if (compareToggle) {
        compareToggle.addEventListener('change', (e) => {
            isCompareMode = e.target.checked;
            if (compareCountWrapper) compareCountWrapper.style.display = isCompareMode ? 'inline-block' : 'none';
            updateInputs();
        });
    }

    if (compareCountInput) {
        compareCountInput.addEventListener('change', updateInputs);
    }

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

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const inputs = inputsContainer.querySelectorAll('input');
            const inputElements = Array.from(inputs);
            const ids = inputElements.map(inp => inp.dataset.resolvedId || inp.value.trim()).filter(val => val !== '');

            if (ids.length === 0) return alert('Please enter a Channel Name or ID');
            if (isCompareMode && ids.length < 2) return alert('Please enter at least 2 channels for comparison');

            // Client-side Unique Check
            const uniqueIds = new Set(ids);
            if (uniqueIds.size !== ids.length) {
                return alert("Please enter distinct Channel Names/IDs.");
            }

            if (loadingDiv) loadingDiv.style.display = 'block';
            const welcome = document.getElementById('welcome-message');
            if (welcome) welcome.style.display = 'none';
            // Don't hide dashboard sections yet, wait for data

            const user = JSON.parse(localStorage.getItem('user_info') || '{}');
            const email = user.email;

            const endpoint = isCompareMode ? '/api/compare' : '/api/analyze';
            const payload = isCompareMode ? { channel_ids: ids, email: email } : { channel_id: ids[0], email: email };

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

                if (res.status === 300 && data.ambiguous) {
                    if (loadingDiv) loadingDiv.style.display = 'none';
                    showSelectionModal(data.options, (selectedId) => {
                        if (isCompareMode && data.input_index !== undefined) {
                            inputElements[data.input_index].value = selectedId;
                        } else {
                            inputElements[0].value = selectedId;
                        }
                        analyzeBtn.click();
                    });
                    return;
                }

                if (!res.ok) throw new Error(data.error);

                if (loadingDiv) loadingDiv.style.display = 'none';

                // Show sections
                const dashSections = document.getElementById('dashboard-sections');
                if (dashSections) dashSections.style.display = 'block';

                showSection('Overview');

                if (isCompareMode) {
                    if (window.renderComparison) renderComparison(data);
                } else {
                    if (window.renderDashboard) renderDashboard(data);
                }

                currentChannelId = !isCompareMode ? data.channel.id : null; // For pagination

                // Refresh My Channels if analyze specific
                fetchMyChannels();

            } catch (e) {
                if (loadingDiv) loadingDiv.style.display = 'none';
                alert('Error: ' + e.message);
            }
        });
    }

    // fetch recently analyzed channels
    async function fetchMyChannels() {
        const list = document.getElementById('my-channels-list');
        if (!list) return;

        list.innerHTML = '<p>Loading...</p>';
        try {
            const user = JSON.parse(localStorage.getItem('user_info') || '{}');
            const res = await fetch(`/api/my-channels?email=${encodeURIComponent(user.email)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const channels = await res.json();

            if (channels.length === 0) {
                list.innerHTML = '<p>No history found.</p>';
                return;
            }

            list.innerHTML = channels.map(c => `
                <div class="glass-card item-hover" onclick="loadHistoryChannel('${c.channel_id}')" style="cursor:pointer; margin-bottom:10px; padding:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${c.details.thumbnail_url || ''}" style="width:40px; height:40px; border-radius:50%;">
                        <div>
                             <h4 style="margin:0; font-size:1rem;">${c.channel_name}</h4>
                             <small style="color:var(--text-secondary);">${new Date(c.last_analyzed).toLocaleDateString()}</small>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<p>Error loading history.</p>';
        }
    }

    window.loadHistoryChannel = (id) => {
        showSection('Overview');
        const input = document.getElementById('channel-id-1');
        if (input) input.value = id;
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) analyzeBtn.click();
    };

    // Pagination
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            if (!currentChannelId || !currentNextPageToken) return;

            try {
                const t = await getAuthToken();
                const res = await fetch('/api/channel/videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
                    body: JSON.stringify({ channel_id: currentChannelId, page_token: currentNextPageToken })
                });

                const data = await res.json();
                const tbody = document.getElementById('videos-list');
                data.videos.forEach(v => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${v.title}</td>
                        <td>${new Date(v.published_at).toLocaleDateString()}</td>
                        <td>${v.view_count.toLocaleString()}</td>
                        <td>${v.like_count.toLocaleString()} Likes</td>
                    `;
                    tbody.appendChild(tr);
                });

                currentNextPageToken = data.next_page_token;
                if (!currentNextPageToken) loadMoreBtn.style.display = 'none';

            } catch (e) {
                console.log("load more failed");
            }
        });
    }

    // AI Studio Logic (Simplified)
    window.openAiTool = (id) => {
        const grid = document.getElementById('ai-selection-grid');
        const workspace = document.getElementById('ai-tool-workspace');
        if (grid) grid.style.display = 'none';
        if (workspace) workspace.style.display = 'block';

        document.querySelectorAll('.ai-tool-panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(`tool-${id}`);
        if (panel) panel.style.display = 'block';
    };

    window.closeAiTool = () => {
        const grid = document.getElementById('ai-selection-grid');
        const workspace = document.getElementById('ai-tool-workspace');
        if (workspace) workspace.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    };
    // --- VIDEO COMPARISON LOGIC ---
    function renderVideoComparisonOptions(videos) {
        const selectA = document.getElementById('vid-comp-select-a');
        const selectB = document.getElementById('vid-comp-select-b');
        if (!selectA || !selectB) return;

        const opts = videos.map((v, i) => {
            // Enhanced label for comparison: [Channel] Title
            const label = v.channel_title ? `[${v.channel_title}] ${v.title}` : v.title;
            return `<option value="${i}">${label.substring(0, 60)}...</option>`;
        }).join('');
        selectA.innerHTML = '<option value="">Select Video A</option>' + opts;
        selectB.innerHTML = '<option value="">Select Video B</option>' + opts;

        const btnCompare = document.getElementById('btn-compare-videos');
        if (btnCompare) {
            // Remove old listeners to avoid dupes (cloneNode trick or just robust logic)
            const newBtn = btnCompare.cloneNode(true);
            btnCompare.parentNode.replaceChild(newBtn, btnCompare);

            newBtn.addEventListener('click', () => {
                const idxA = selectA.value;
                const idxB = selectB.value;
                if (idxA === '' || idxB === '') return alert("Please select two videos");

                const vidA = videos[idxA];
                const vidB = videos[idxB];

                const results = document.getElementById('video-comp-results');
                results.style.display = 'block';

                // Compare Logic
                const winColor = 'color:var(--success); font-weight:bold;';

                const cmp = (valA, valB, fmt = (x) => x.toLocaleString()) => {
                    if (valA > valB) return [`<span style="${winColor}">${fmt(valA)}</span>`, fmt(valB)];
                    if (valB > valA) return [fmt(valA), `<span style="${winColor}">${fmt(valB)}</span>`];
                    return [fmt(valA), fmt(valB)];
                };

                const [viewsA, viewsB] = cmp(vidA.views, vidB.views);
                const [likesA, likesB] = cmp(vidA.likes, vidB.likes);
                const [commA, commB] = cmp(vidA.comments, vidB.comments);

                results.innerHTML = `
                    <div class="glass-table-container">
                        <table class="modern-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>${vidA.title.substring(0, 20)}...</th>
                                    <th>${vidB.title.substring(0, 20)}...</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Views</td><td>${viewsA}</td><td>${viewsB}</td></tr>
                                <tr><td>Likes</td><td>${likesA}</td><td>${likesB}</td></tr>
                                <tr><td>Comments</td><td>${commA}</td><td>${commB}</td></tr>
                                <tr><td>Date</td><td>${new Date(vidA.published_at).toLocaleDateString()}</td><td>${new Date(vidB.published_at).toLocaleDateString()}</td></tr>
                            </tbody>
                        </table>
                    </div>
                `;
            });
        }
    }

    // Inject into renderDashboard
    const originalRenderDashboard = window.renderDashboard;
    window.renderDashboard = (data) => {
        // ... (reuse the previous logic, just add the new call)
        // Since I can't easily "inject" into the function I just wrote without replacing it entirely, 
        // I will re-declare renderDashboard fully.

        const { channel, kpis, videos, growth, strategy } = data;

        // 1. Header & Text
        const headerWrapper = document.getElementById('channel-header-wrapper');
        if (headerWrapper) headerWrapper.style.display = 'block';

        document.getElementById('channel-title').innerText = channel.title;
        document.getElementById('channel-desc').innerText = channel.description ? channel.description.substring(0, 150) + '...' : 'No description';
        document.getElementById('channel-thumb').src = channel.thumbnail_url;

        // KPIs
        const formatKpi = (num) => num ? num.toLocaleString() : '-';
        document.getElementById('kpi-subs').innerText = formatKpi(channel.subscriber_count);
        document.getElementById('kpi-views').innerText = formatKpi(channel.view_count);
        document.getElementById('kpi-engagement').innerText = kpis.engagement_rate + '%';
        document.getElementById('kpi-earnings').innerText = '$' + formatKpi(kpis.estimated_earnings);

        // 2. Charts
        renderCharts(videos, growth, kpis);

        // 3. Reports & Videos
        renderMonthlyReportPlaceholder(videos);
        renderVideosTable(videos);
        renderVideoComparisonOptions(videos); // NEW CALL
    };

    let charts = {};

    function renderCharts(videos, growth, kpis) {
        // Helper to destroy old
        const destroy = (id) => {
            if (charts[id]) {
                charts[id].destroy();
                charts[id] = null;
            }
        };

        // A. Views Chart (Line)
        destroy('viewsChart');
        const ctxViews = document.getElementById('viewsChart');
        if (ctxViews) {
            // Sort videos by date for time series? Or just top videos?
            // Let's do top 10 videos by views for the overview chart
            const sortedByViews = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);

            charts['viewsChart'] = new Chart(ctxViews, {
                type: 'bar',
                data: {
                    labels: sortedByViews.map(v => v.title.substring(0, 15) + '...'),
                    datasets: [{
                        label: 'Views',
                        data: sortedByViews.map(v => v.views),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Top 10 Videos by Views' } } }
            });
        }

        // B. Engagement Split (Stacked Bar for Top 10)
        destroy('engagementChart');
        const ctxEng = document.getElementById('engagementChart');
        if (ctxEng) {
            // Re-sort or reuse sortedByViews (Top 10 by views usually maps to high engagement)
            // Or sort by total engagement? Let's stick to top 10 by Views for consistency with first chart
            const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);

            charts['engagementChart'] = new Chart(ctxEng, {
                type: 'bar',
                data: {
                    labels: topVideos.map(v => v.title.substring(0, 15) + '...'),
                    datasets: [
                        {
                            label: 'Likes',
                            data: topVideos.map(v => v.likes),
                            backgroundColor: '#34d399',
                        },
                        {
                            label: 'Comments',
                            data: topVideos.map(v => v.comments),
                            backgroundColor: '#60a5fa',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Engagement Split (Top 10 Videos)' }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    }
                }
            });
        }

        // C. Growth Trends (Line - Simulated or from growth data)
        destroy('growthChart');
        const ctxGrowth = document.getElementById('growthChart');
        if (ctxGrowth && growth && Array.isArray(growth)) {
            charts['growthChart'] = new Chart(ctxGrowth, {
                type: 'line',
                data: {
                    labels: growth.map(g => g.date),
                    datasets: [{
                        label: 'Views Trend',
                        data: growth.map(g => g.views),
                        borderColor: '#a78bfa',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(167, 139, 250, 0.1)'
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: '30 Day View Trend' } } }
            });
        }

        // D. Likes vs Comments (Line Graph Correlation)
        destroy('likesVsCommentsChart');
        const ctxLvC = document.getElementById('likesVsCommentsChart');
        if (ctxLvC) {
            // Sort by views or date to make the line make sense? 
            // Usually correlation is strictly scatter, but if line, we need an order. 
            // Let's sort by Views Descending to see if higher views = higher engagement generally
            const sorted = [...videos].sort((a, b) => b.views - a.views).slice(0, 20); // Top 20 for readability

            charts['likesVsCommentsChart'] = new Chart(ctxLvC, {
                type: 'line',
                data: {
                    labels: sorted.map(v => v.title.substring(0, 10) + '...'),
                    datasets: [
                        {
                            label: 'Likes',
                            data: sorted.map(v => v.likes),
                            borderColor: '#34d399',
                            yAxisID: 'y',
                        },
                        {
                            label: 'Comments',
                            data: sorted.map(v => v.comments),
                            borderColor: '#f472b6',
                            yAxisID: 'y1',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Likes' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Comments' },
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                    }
                }
            });
        }
    }

    // --- ALL VIDEOS PAGINATION ---

    function renderVideosTable(videos, append = false) {
        const tbody = document.getElementById('videos-list');
        if (!tbody) return;

        let toRender = videos;

        if (!append) {
            tbody.innerHTML = '';
            // STRICT REQUIREMENT: Show only 10 initially.
            // If the backend returns 50, we only show 10.
            // The Next Page Token handles the rest from API.
            toRender = videos.slice(0, 10);
        }

        toRender.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:500;">${v.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${v.duration}</div>
                </td>
                <td>${new Date(v.published_at).toLocaleDateString()}</td>
                <td>${v.views.toLocaleString()}</td>
                <td>
                    <i class="fas fa-thumbs-up" style="color:var(--success); font-size:0.8rem;"></i> ${v.likes.toLocaleString()}
                    <span style="margin-left:10px; color:var(--text-secondary);"><i class="fas fa-comment"></i> ${v.comments.toLocaleString()}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Handle Existing "Load More" Button logic
        let btn = document.getElementById('load-more-btn');
        if (btn) {
            btn.onclick = loadMoreVideos;
            // Visibility check logic
            if (!currentNextPageToken) {
                btn.parentElement.style.display = 'none'; // Hide wrapper
            } else {
                btn.parentElement.style.display = 'block';
            }
        }
    }

    async function loadMoreVideos() {
        if (!window.currentChannelId || !currentNextPageToken) return;

        const btn = document.getElementById('load-more-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/channel/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: window.currentChannelId,
                    page_token: currentNextPageToken
                })
            });
            const data = await res.json();

            if (data.videos) {
                currentNextPageToken = data.next_page_token;
                window.currentVideos = (window.currentVideos || []).concat(data.videos);
                renderVideosTable(data.videos, true);
                renderMonthlyTable();
            }
        } catch (e) {
            console.error("Load More Error:", e);
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More Videos';
                btn.disabled = false;
            }
        }
    }

    // --- ENHANCED ANALYTICS RENDER ---

    // 1. Engagement Outliers (Unchanged)
    window.renderEngagementOutliers = () => {
        const videos = window.currentVideos || [];
        const filter = document.getElementById('engagement-outlier-filter')?.value || 'highest';
        const list = document.getElementById('engagement-outliers-list');

        if (!list) return;

        const withRate = videos.map(v => {
            const rate = ((v.likes + v.comments) / Math.max(v.views, 1)) * 100;
            return { ...v, rate };
        });

        const sorted = withRate.sort((a, b) => filter === 'highest' ? b.rate - a.rate : a.rate - b.rate).slice(0, 5);

        list.innerHTML = sorted.map(v => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="width:70%;">
                    <div style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
                    <div style="font-size:0.7rem; color:var(--text-secondary);">${v.views.toLocaleString()} views</div>
                </div>
                <div style="color:${filter === 'highest' ? 'var(--success)' : 'var(--error)'}; font-weight:bold; font-size:0.9rem;">
                    ${v.rate.toFixed(2)}%
                </div>
            </div>
        `).join('');
    };

    // 2. Report Headers Helper
    window.toggleReportFilters = () => {
        const mode = document.getElementById('report-view-mode').value;
        const picker = document.getElementById('report-month-picker');
        if (picker) {
            picker.style.display = (mode === 'specific') ? 'inline-block' : 'none';
        }
        renderMonthlyTable();
    };

    // 3. Monthly Report Table (Corrected for Data Filtering)
    window.renderMonthlyTable = () => {
        const videos = window.currentVideos || [];
        const mode = document.getElementById('report-view-mode')?.value || 'last-12';
        const specificMonth = document.getElementById('report-month-picker')?.value; // YYYY-MM

        const container = document.getElementById('monthly-report-container');
        if (!container) return;

        // Generate Monthly Data
        const monthly = {};

        // Filter Logic Setup
        let cutoffDate = new Date();
        let targetYM = null;

        if (mode === 'last-6') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        else if (mode === 'last-12') cutoffDate.setMonth(cutoffDate.getMonth() - 12);
        else if (mode === 'all') cutoffDate = new Date(0); // 1970
        else if (mode === 'specific' && specificMonth) {
            targetYM = specificMonth; // "2023-10"
        }

        videos.forEach(v => {
            const d = new Date(v.published_at);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            // Filter
            if (mode === 'specific') {
                if (targetYM && ym !== targetYM) return;
            } else {
                if (d < cutoffDate) return;
            }

            if (!monthly[ym]) monthly[ym] = { views: 0, likes: 0, comments: 0, count: 0 };
            monthly[ym].views += v.views;
            monthly[ym].likes += v.likes;
            monthly[ym].comments += v.comments;
            monthly[ym].count++;
        });

        const sortedKeys = Object.keys(monthly).sort().reverse();

        // Render Table
        container.innerHTML = `
            <table class="modern-table" style="width:100%;">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Uploads</th>
                        <th>Total Views</th>
                        <th>Avg Engagement</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedKeys.length > 0 ? sortedKeys.map(key => {
            const m = monthly[key];
            const avgEng = ((m.likes + m.comments) / m.count).toFixed(0);
            return `
                            <tr>
                                <td>${key}</td>
                                <td>${m.count}</td>
                                <td>${m.views.toLocaleString()}</td>
                                <td>${parseInt(avgEng).toLocaleString()}</td>
                            </tr>
                        `;
        }).join('') : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">
                        No data found for this period.<br><small>Try "Load More Videos" below to fetch older history.</small>
                    </td></tr>`}
                </tbody>
            </table>
        `;
    };

    // Replaces placeholder - Entry Point
    function renderMonthlyReportPlaceholder(videos) {
        window.currentVideos = videos;
        renderEngagementOutliers();
        if (typeof window.toggleReportFilters === 'function') {
            // Ensure picker state is correct
            const mode = document.getElementById('report-view-mode');
            if (mode && mode.value === 'specific') document.getElementById('report-month-picker').style.display = 'inline-block';
        }
        renderMonthlyTable();
    }
    // Garbage Removed

    // --- RENDER COMPARISON ---
    window.renderComparison = (data) => {
        const results = data.results;

        // 1. Clear Single Channel Elements
        const channelHeader = document.getElementById('channel-header-wrapper');
        if (channelHeader) channelHeader.style.display = 'none';

        // Hide standard charts if visible
        ['viewsChart', 'engagementChart', 'growthChart', 'likesVsCommentsChart'].forEach(id => {
            const c = document.getElementById(id);
            if (c) {
                const p = c.parentElement;
                if (p) p.style.display = 'none';
            }
        });

        // 2. Render KPI Cards Side-by-Side
        const overview = document.getElementById('section-overview');

        // Clean up previous
        const existingComp = document.getElementById('comparison-output-area');
        if (existingComp) existingComp.remove();

        const existingChart = document.getElementById('comparison-chart-area');
        if (existingChart) existingChart.remove();

        // Create Container
        const container = document.createElement('div');
        container.id = 'comparison-output-area';

        let gridHtml = '<div class="comparison-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px; margin-top:30px;">';

        let allVideos = [];

        results.forEach(res => {
            const ch = res.channel;
            const k = res.kpis;

            if (res.videos) {
                // Ensure proper property access
                const tagged = res.videos.map(v => ({ ...v, channel_title: ch.title }));
                allVideos = [...allVideos, ...tagged];
            }

            gridHtml += `
                <div class="glass-card">
                    <div style="text-align:center; margin-bottom:20px;">
                        <img src="${ch.thumbnail_url}" style="width:80px; height:80px; border-radius:50%; margin-bottom:10px;">
                        <h3>${ch.title}</h3>
                        <p>${parseInt(ch.subscriber_count).toLocaleString()} Subs</p>
                    </div>
                    <div class="metric-row" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <span>Total Views</span>
                        <strong>${parseInt(ch.view_count).toLocaleString()}</strong>
                    </div>
                    <div class="metric-row" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                         <span>Video Count</span>
                         <strong>${parseInt(ch.video_count).toLocaleString()}</strong>
                    </div>
                    <div class="metric-row" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                         <span>Avg Views/Video</span>
                         <strong>${k.avg_views.toLocaleString()}</strong>
                    </div>
                    <div class="metric-row" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                         <span>Engagement Rate</span>
                         <strong style="color:var(--success);">${k.engagement_rate}%</strong>
                    </div>
                     <div class="metric-row" style="display:flex; justify-content:space-between; padding:10px 0;">
                         <span>Est. Earnings</span>
                         <strong style="color:var(--accent);">$${k.estimated_earnings.toLocaleString()}</strong>
                    </div>
                </div>
            `;
        });
        gridHtml += '</div>';
        container.innerHTML = gridHtml;
        overview.appendChild(container);

        // 3. Render Likes vs Comments Comparison Chart
        const chartContainer = document.createElement('div');
        chartContainer.id = 'comparison-chart-area';
        chartContainer.className = 'glass-card';
        chartContainer.style.marginTop = '20px';
        chartContainer.innerHTML = '<h3><i class="fas fa-balance-scale"></i> Engagement Comparison (Avg per Video)</h3><canvas id="compChart"></canvas>';
        overview.appendChild(chartContainer);

        const ctx = document.getElementById('compChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: results.map(r => r.channel.title),
                    datasets: [
                        {
                            label: 'Avg Likes',
                            data: results.map(r => {
                                const vids = r.videos || [];
                                const totalLikes = vids.reduce((s, v) => s + v.likes, 0);
                                return vids.length ? Math.round(totalLikes / vids.length) : 0;
                            }),
                            backgroundColor: '#34d399'
                        },
                        {
                            label: 'Avg Comments',
                            data: results.map(r => {
                                const vids = r.videos || [];
                                const totalComms = vids.reduce((s, v) => s + v.comments, 0);
                                return vids.length ? Math.round(totalComms / vids.length) : 0;
                            }),
                            backgroundColor: '#60a5fa'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // 4. Update Video Comparison Tool
        renderVideoComparisonOptions(allVideos, results.map(r => r.channel.title));
    };

    // --- VIDEO COMPARISON TOOL HELPER ---
    window.renderVideoComparisonOptions = (videos, expectedChannels = []) => {
        const selA = document.getElementById('vid-comp-select-a');
        const selB = document.getElementById('vid-comp-select-b');

        if (!selA || !selB) return;

        // Group videos by channel
        const byChannel = {};
        videos.forEach(v => {
            const ch = v.channel_title || 'Current Channel';
            if (!byChannel[ch]) byChannel[ch] = [];
            byChannel[ch].push(v);
        });

        // Debug
        console.log("Video Comp - Videos By Channel:", Object.keys(byChannel));
        console.log("Video Comp - Expected Channels:", expectedChannels);

        // HELPER: Build Options for a specific list of videos
        const buildOptionsForVideos = (vids) => {
            let html = '<option value="">Select Video...</option>';
            if (!vids || vids.length === 0) return html;

            vids.sort((a, b) => b.views - a.views).forEach(v => {
                html += `<option value="${v.id}">${v.title.substring(0, 50)}${v.title.length > 50 ? '...' : ''} (${v.views.toLocaleString()} views)</option>`;
            });
            return html;
        };

        // HELPER: Build grouped options (Fallback)
        const buildGroupedOptions = () => {
            let html = '<option value="">Select Video...</option>';
            for (const [channel, vids] of Object.entries(byChannel)) {
                html += `<optgroup label="${channel}">`;
                vids.sort((a, b) => b.views - a.views).forEach(v => {
                    html += `<option value="${v.id}">${v.title.substring(0, 50)}${v.title.length > 50 ? '...' : ''} (${v.views.toLocaleString()} views)</option>`;
                });
                html += `</optgroup>`;
            }
            return html;
        };

        // LOGIC: Strict Split based on Expected Channels
        if (expectedChannels.length >= 2) {
            const chA = expectedChannels[0];
            const chB = expectedChannels[1];

            // Setup A
            selA.innerHTML = buildOptionsForVideos(byChannel[chA]);
            if (selA.previousElementSibling) selA.previousElementSibling.textContent = `Select Video (${chA})`;

            // Setup B
            selB.innerHTML = buildOptionsForVideos(byChannel[chB]);
            if (selB.previousElementSibling) selB.previousElementSibling.textContent = `Select Video (${chB})`;

        } else {
            // Fallback
            const opts = buildGroupedOptions();
            selA.innerHTML = opts;
            selB.innerHTML = opts;

            if (selA.previousElementSibling) selA.previousElementSibling.textContent = `Select Video A`;
            if (selB.previousElementSibling) selB.previousElementSibling.textContent = `Select Video B`;
        }

        window.comparisonVideosPool = videos;
    };

    // --- TRIGGER COMPARISON ---
    const btnCompVids = document.getElementById('btn-compare-videos');
    if (btnCompVids) {
        btnCompVids.onclick = () => {
            const selA = document.getElementById('vid-comp-select-a');
            const selB = document.getElementById('vid-comp-select-b');
            const resDiv = document.getElementById('video-comp-results');

            if (!selA || !selB || !resDiv) return;

            const idA = selA.value;
            const idB = selB.value;

            if (!idA || !idB) return alert("Please select two videos to compare.");

            const pool = window.comparisonVideosPool || window.currentVideos || [];
            const vA = pool.find(v => v.id === idA);
            const vB = pool.find(v => v.id === idB);

            if (!vA || !vB) return alert("Error finding video details.");

            // Render Comparison Table
            resDiv.style.display = 'block';
            resDiv.innerHTML = `
                <table class="modern-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th style="color:var(--primary-color)">${vA.title.substring(0, 20)}...</th>
                            <th style="color:var(--secondary-color)">${vB.title.substring(0, 20)}...</th>
                            <th>Winner</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Views</td>
                            <td>${vA.views.toLocaleString()}</td>
                            <td>${vB.views.toLocaleString()}</td>
                            <td>${vA.views > vB.views ? 'Video A' : (vB.views > vA.views ? 'Video B' : 'Tie')}</td>
                        </tr>
                        <tr>
                            <td>Likes</td>
                            <td>${vA.likes.toLocaleString()}</td>
                            <td>${vB.likes.toLocaleString()}</td>
                            <td>${vA.likes > vB.likes ? 'Video A' : (vB.likes > vA.likes ? 'Video B' : 'Tie')}</td>
                        </tr>
                        <tr>
                            <td>Comments</td>
                            <td>${vA.comments.toLocaleString()}</td>
                            <td>${vB.comments.toLocaleString()}</td>
                            <td>${vA.comments > vB.comments ? 'Video A' : (vB.comments > vA.comments ? 'Video B' : 'Tie')}</td>
                        </tr>
                        <tr>
                            <td>Engagement Rate</td>
                            <td>${((vA.likes + vA.comments) / vA.views * 100).toFixed(2)}%</td>
                            <td>${((vB.likes + vB.comments) / vB.views * 100).toFixed(2)}%</td>
                            <td>${((vA.likes + vA.comments) / vA.views) > ((vB.likes + vB.comments) / vB.views) ? 'Video A' : 'Video B'}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        };
    }

    // --- AI STUDIO LOGIC ---
    const setupAiBtn = (btnId, inputId, outputId, actionType) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const input = document.getElementById(inputId);
            const output = document.getElementById(outputId);
            if (!input || !output) return;

            const topic = input.value.trim();
            if (!topic) return alert("Please enter a topic/title");

            btn.disabled = true;
            btn.innerText = 'Generating...';
            output.style.display = 'none';

            try {
                const token = await getAuthToken();
                const res = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        action: actionType,
                        topic: topic,
                        title: topic, // for script
                        channel_name: 'Creator'
                    })
                });
                const data = await res.json();

                output.style.display = 'block';

                let content = data.result || 'No result generated';

                // Handle Array (Video Ideas) vs String (Script)
                if (Array.isArray(content)) {
                    // Render list of ideas
                    const listItems = content.map(item =>
                        `<li style="padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <div style="font-weight:bold;">${item.title}</div>
                            ${item.confidence ? `<div style="font-size:0.75rem; color:var(--success);">Confidence: ${item.confidence}%</div>` : ''}
                         </li>`
                    ).join('');
                    content = `<ul style="list-style:none; padding:0; margin:0;">${listItems}</ul>`;
                } else if (typeof content === 'string') {
                    // Handle Markdown/String (Script)
                    // Simple replacement for newlines to breaks, or basic markdown
                    content = content.replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>')
                        .replace(/# (.*?)(<br>|$)/g, '<h2>$1</h2>');
                } else {
                    content = JSON.stringify(content);
                }

                output.innerHTML = `<div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:8px; line-height:1.6;">${content}</div>`;

            } catch (e) {
                alert('AI Generation Failed: ' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Generate';
            }
        });
    };

    setupAiBtn('btn-gen-title', 'ai-title-input', 'ai-title-output', 'ideas');
    setupAiBtn('btn-gen-desc', 'ai-desc-input', 'ai-desc-output', 'script'); // Reusing script endpoint for desc for now as per api.py
    setupAiBtn('btn-gen-name', 'ai-name-input', 'ai-name-output', 'names');

});
