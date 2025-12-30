import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Helper to get current token for API calls
async function getAuthToken() {
    const user = auth.currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return null;
}

// Make logout globally available
window.handleSignOut = () => {
    signOut(auth).then(() => {
        window.location.href = '/';
    }).catch((error) => console.error("Logout Error:", error));
};

document.addEventListener('DOMContentLoaded', () => {

    // Check Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get Backend Session Info
            try {
                const token = await user.getIdToken();
                const res = await fetch('/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    document.getElementById('user-info').innerHTML = `<span>Welcome, ${data.user.name}</span>`;
                }
            } catch (e) {
                console.error("Auth Check Failed", e);
            }
        }
    });

    // Remove direct fetch('/auth/me') call since it's now inside the observer
    /* 
     * fetch('/auth/me')... removed
     */

    const analyzeBtn = document.getElementById('analyze-btn');
    const channelInput1 = document.getElementById('channel-id-input');
    const inputsContainer = document.getElementById('channel-inputs-container');
    const compareCountWrapper = document.getElementById('compare-count-wrapper');
    const compareCountInput = document.getElementById('compare-count');
    const compareToggle = document.getElementById('compare-mode-toggle');
    const loadingDiv = document.getElementById('loading');
    const resultsArea = document.getElementById('results-area');

    let isCompareMode = false;
    let viewsChartInstance = null;
    let engagementChartInstance = null;

    // Helper to generate inputs
    function updateInputs() {
        // Clear all except first
        const firstInput = document.getElementById('channel-id-input');
        const firstVal = firstInput.value;
        inputsContainer.innerHTML = '';
        inputsContainer.appendChild(firstInput);
        firstInput.value = firstVal; // Preserve value

        if (isCompareMode) {
            firstInput.placeholder = 'Enter Channel ID 1';
            const count = parseInt(compareCountInput.value) || 2;
            for (let i = 2; i <= count; i++) {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.placeholder = `Enter Channel ID ${i}`;
                inp.className = 'dynamic-channel-input';
                inp.style.marginTop = '10px';
                inputsContainer.appendChild(inp);
            }
        } else {
            firstInput.placeholder = 'Enter Channel ID (e.g., UC...)';
        }
    }

    // Toggle Mode
    compareToggle.addEventListener('change', (e) => {
        isCompareMode = e.target.checked;
        compareCountWrapper.style.display = isCompareMode ? 'inline-block' : 'none';
        updateInputs();
    });

    compareCountInput.addEventListener('change', updateInputs);

    analyzeBtn.addEventListener('click', async () => {
        const inputs = inputsContainer.querySelectorAll('input');
        const ids = Array.from(inputs).map(inp => inp.value.trim()).filter(val => val !== '');

        if (ids.length === 0) return alert('Please enter a Channel ID');
        if (isCompareMode && ids.length < 2) return alert('Please enter at least 2 Channel IDs for comparison');

        loadingDiv.style.display = 'block';
        resultsArea.style.display = 'none';

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

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
                if (!res.ok) throw new Error(data.error || 'Server returned error');
            } catch (e) {
                if (!res.ok) throw new Error(`Server Error (${res.status}): ${text.substring(0, 50)}...`);
                console.log("Dashboard v3 Loaded");
                throw new Error(`JSON PARSE ERROR: ${e.message} \n\n RESPONSE START: ${text.substring(0, 150)}`);
            }

            loadingDiv.style.display = 'none';
            resultsArea.style.display = 'block';
            if (isCompareMode) {
                renderComparison(data);
            } else {
                renderDashboard(data);
            }
        } catch (err) {
            loadingDiv.style.display = 'none';
            alert(err.message);
            console.error(err);
        }
    });

    function renderDashboard(data) {
        // Reset UI specific to single view
        const infoArea = document.querySelector('.channel-info');
        infoArea.innerHTML = `
            <img id="channel-thumb" src="${data.channel.thumbnail_url}" alt="Channel" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1);">
            <div>
                <h2 id="channel-title" style="margin-bottom:5px;">${data.channel.title}</h2>
                <p id="channel-desc" style="color:var(--text-secondary); font-size:0.9rem;">${data.channel.description.substring(0, 100)}...</p>
            </div>
        `;
        // Ensure class is correct
        infoArea.className = 'glass-card';
        infoArea.style.marginBottom = 'var(--spacing-md)';
        infoArea.style.display = 'flex';
        infoArea.style.alignItems = 'center';
        infoArea.style.gap = '20px';

        // KPI Grid
        document.getElementById('kpi-subs').innerText = parseInt(data.channel.subscriber_count).toLocaleString();
        document.getElementById('kpi-views').innerText = parseInt(data.channel.view_count).toLocaleString();
        document.getElementById('kpi-avg-views').innerText = data.kpis.avg_views.toLocaleString();
        document.getElementById('kpi-engagement').innerText = data.kpis.engagement_rate + '%';

        // Earnings (New)
        const earningsEl = document.getElementById('kpi-earnings');
        if (earningsEl) {
            earningsEl.innerText = '$' + (data.kpis.estimated_earnings || 0).toLocaleString();
        }

        // Table (Single Mode Only)
        // Use segments.top_views if available, else fallback to videos slice
        const tbody = document.getElementById('videos-list');
        tbody.innerHTML = '';

        const topVideos = (data.segments && data.segments.top_views) ? data.segments.top_views : data.videos.slice(0, 5);

        topVideos.forEach(video => {
            const tr = document.createElement('tr');
            // Assuming segment format or original format, try to normalize
            const title = video.title;
            const date = new Date(video.published_at).toLocaleDateString();
            const views = (video.views || video.view_count).toLocaleString();
            // Engagement for table: likes + comments
            const engCount = (video.likes || video.like_count) + (video.comments || video.comment_count);
            const engRate = video.engagement_rate ? `${video.engagement_rate}%` : '-';

            tr.innerHTML = `
                <td style="font-weight:500;">${title}</td>
                <td style="color:var(--text-secondary);">${date}</td>
                <td>${views}</td>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:0.9rem;">${engRate}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${engCount.toLocaleString()} interactions</span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderCharts([data.channel.title], [data.videos], data.growth, data.strategy);
    }

    // Global chart instances to destroy before re-creating
    let charts = {};

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
                        label: 'Subscribers',
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

        // Header
        const infoArea = document.querySelector('.channel-info');
        // If querySelector returns null, fallback to checking ID
        // (The new structure uses glass-card for single view, we reuse it)

        // We'll replace the main results area header
        // For simplicity in this replacement, we assume infoArea matches the container
        // Note: HTML structure might have changed to glass-card

        // Let's just create a string and inject
        const headerHTML = results.map(res => `
            <div class="comp-channel" style="text-align:center; min-width: 150px;">
                <img src="${res.channel.thumbnail_url}" style="width: 60px; height:60px; border-radius: 50%; border: 2px solid white;">
                <div><h3 style="font-size:1rem; margin-top:5px;">${res.channel.title}</h3><p style="color:var(--text-muted); font-size:0.8rem;">${parseInt(res.channel.subscriber_count).toLocaleString()} Subs</p></div>
            </div>
        `).join('<div style="align-self:center; font-weight:bold; font-size:1.2rem; color:var(--text-secondary);">VS</div>');

        // Since we changed the HTML structure to 'results-area' containing a 'channel-info' (now glass-card)
        // We should target 'results-area' first child ideally, or clear it.
        // But let's stick to the element we targeted before or a safe ID.
        // In renderDashboard we used: const infoArea = document.querySelector('.channel-info'); which might be inside results-area

        if (infoArea) {
            infoArea.innerHTML = headerHTML;
            infoArea.className = 'glass-card';
            infoArea.style.justifyContent = 'center';
            infoArea.style.flexWrap = 'wrap';
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
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.innerHTML = `
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
    }
});
