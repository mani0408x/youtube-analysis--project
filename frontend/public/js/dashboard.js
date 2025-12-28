document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    fetch('/auth/me')
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) {
                document.getElementById('user-info').innerHTML = `<span>Welcome, ${data.user.name}</span>`;
            } else {
                window.location.href = '/';
            }
        });

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

    analyzeBtn.addEventListener('click', () => {
        const inputs = inputsContainer.querySelectorAll('input');
        const ids = Array.from(inputs).map(inp => inp.value.trim()).filter(val => val !== '');

        if (ids.length === 0) return alert('Please enter a Channel ID');
        if (isCompareMode && ids.length < 2) return alert('Please enter at least 2 Channel IDs for comparison');

        loadingDiv.style.display = 'block';
        resultsArea.style.display = 'none';

        const endpoint = isCompareMode ? '/api/compare' : '/api/analyze';
        const payload = isCompareMode ? { channel_ids: ids } : { channel_id: ids[0] };

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(async res => {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    if (!res.ok) {
                        // If server returned valid JSON error
                        throw new Error(data.error || 'Server returned error');
                    }
                    return data;
                } catch (e) {
                    // Check if success (response was ok but not json? unlikely for API)
                    // Or if it was an error state with non-json body (e.g. 500 HTML)
                    if (!res.ok) {
                        throw new Error(`Server Error (${res.status}): ${text.substring(0, 50)}...`);
                    }
                    // Version Check
                    // alert("Dashboard v3 Loaded"); // Uncomment if needed for forceful check, but console is better.
                    console.log("Dashboard v3 Loaded");

                    // It was 200 OK but invalid JSON?
                    throw new Error(`JSON PARSE ERROR: ${e.message} \n\n RESPONSE START: ${text.substring(0, 150)}`);
                }
            })
            .then(data => {
                loadingDiv.style.display = 'none';
                resultsArea.style.display = 'block';
                if (isCompareMode) {
                    renderComparison(data);
                } else {
                    renderDashboard(data);
                }
            })
            .catch(err => {
                loadingDiv.style.display = 'none';
                alert(err.message);
                console.error(err);
            });
    });

    function renderDashboard(data) {
        // Reset UI specific to single view
        const infoArea = document.querySelector('.channel-info');
        infoArea.innerHTML = `
            <img id="channel-thumb" src="${data.channel.thumbnail_url}" alt="Channel" style="width: 80px; border-radius: 50%;">
            <div>
                <h2 id="channel-title">${data.channel.title}</h2>
                <p id="channel-desc">${data.channel.description.substring(0, 100)}...</p>
            </div>
        `;
        infoArea.className = 'channel-info'; // Reset class if changed

        // KPI Grid
        document.querySelector('.kpi-grid').innerHTML = `
            <div class="kpi-card"><h3>Subscribers</h3><div class="value">${parseInt(data.channel.subscriber_count).toLocaleString()}</div></div>
            <div class="kpi-card"><h3>Total Views</h3><div class="value">${parseInt(data.channel.view_count).toLocaleString()}</div></div>
            <div class="kpi-card"><h3>Avg Views/Video</h3><div class="value">${data.kpis.avg_views.toLocaleString()}</div></div>
            <div class="kpi-card"><h3>Engagement Rate</h3><div class="value">${data.kpis.engagement_rate}%</div></div>
        `;

        // Table (Single Mode Only)
        document.getElementById('recent-videos-container').style.display = 'block'; // Show table
        const tbody = document.getElementById('videos-list');
        tbody.innerHTML = '';
        data.videos.slice(0, 10).forEach(video => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${video.title}</td>
                <td>${new Date(video.published_at).toLocaleDateString()}</td>
                <td>${video.views.toLocaleString()}</td>
                <td>${video.likes.toLocaleString()}</td>
                <td>${video.comments.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });

        renderCharts([data.channel.title], [data.videos]);
    }

    function renderComparison(data) {
        const results = data.results || [];

        // Header: Side by Side (Flexible)
        const infoArea = document.querySelector('.channel-info');
        infoArea.className = 'comparison-header';
        infoArea.style.display = 'flex';
        infoArea.style.flexWrap = 'wrap';
        infoArea.style.justifyContent = 'center';
        infoArea.style.gap = '20px';

        infoArea.innerHTML = results.map(res => `
            <div class="comp-channel" style="text-align:center; min-width: 150px;">
                <img src="${res.channel.thumbnail_url}" style="width: 60px; border-radius: 50%;">
                <div><h3>${res.channel.title}</h3><p>Subs: ${parseInt(res.channel.subscriber_count).toLocaleString()}</p></div>
            </div>
        `).join('<div style="align-self:center; font-weight:bold;">VS</div>');

        // KPI Comparison - Dynamic Rows
        const createKpiRows = (label, valueAccessor, isPercent = false) => {
            return results.map(res => {
                let val = valueAccessor(res);
                if (isPercent) val = val + '%';
                else val = val.toLocaleString();
                return `<div class="comp-kpi-row"><span>${res.channel.title}</span><span class="comp-kpi-val">${val}</span></div>`;
            }).join('');
        };

        document.querySelector('.kpi-grid').innerHTML = `
            <div class="kpi-card">
                <h3>Total Views</h3>
                ${createKpiRows('Total Views', r => parseInt(r.channel.view_count))}
            </div>
            <div class="kpi-card">
                <h3>Engagement Rate</h3>
                ${createKpiRows('Engagement Rate', r => r.kpis.engagement_rate, true)}
            </div>
            <div class="kpi-card">
                <h3>Avg Views/Video</h3>
                ${createKpiRows('Avg Views', r => r.kpis.avg_views)}
            </div>
        `;

        // Hide Table for Comparison
        if (document.getElementById('recent-videos-container'))
            document.getElementById('recent-videos-container').style.display = 'none';

        // Prepare chart data
        const labels = results.map(r => r.channel.title);
        const datasets = results.map(r => r.videos);
        renderCharts(labels, datasets);
    }

    function renderCharts(labels, datasetsData) {
        if (viewsChartInstance) viewsChartInstance.destroy();
        if (engagementChartInstance) engagementChartInstance.destroy();

        // Prepare data for avg views comparison if multiple channels, else limit to top 10 videos
        let chartLabels, viewsDataSets, engagementDataSets;

        if (datasetsData.length === 1) {
            // Single Channel: Top 10 Videos
            const videos = datasetsData[0].slice(0, 10);
            chartLabels = videos.map(v => v.title.substring(0, 15) + '...');
            viewsDataSets = [{
                label: 'Views',
                data: videos.map(v => v.views),
                backgroundColor: 'rgba(52, 152, 219, 0.6)'
            }];
            engagementDataSets = [
                { label: 'Likes', data: videos.map(v => v.likes), borderColor: '#3498db', fill: false },
                { label: 'Comments', data: videos.map(v => v.comments), borderColor: '#e74c3c', fill: false }
            ];
        } else {
            // Comparison: Multi-Channel
            chartLabels = ['Avg Views', 'Avg Engagement (Scaled)'];

            const colors = ['rgba(52, 152, 219, 0.6)', 'rgba(231, 76, 60, 0.6)', 'rgba(46, 204, 113, 0.6)', 'rgba(155, 89, 182, 0.6)', 'rgba(241, 196, 15, 0.6)'];

            viewsDataSets = datasetsData.map((d, index) => {
                const currentData = d || [];
                const getAvg = (data, key) => data.length ? data.reduce((a, b) => a + (b[key] || 0), 0) / data.length : 0;
                const avgViews = getAvg(currentData, 'views');
                const avgEng = getAvg(currentData, 'likes') * 10;

                return {
                    label: labels[index],
                    data: [avgViews, avgEng],
                    backgroundColor: colors[index % colors.length]
                };
            });
        }

        const ctx1 = document.getElementById('viewsChart').getContext('2d');
        viewsChartInstance = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: viewsDataSets
            },
            options: { responsive: true, plugins: { title: { display: true, text: 'Performance Comparison' } } }
        });

        // Hide second chart for comparison simplifiction or use it for something else
        document.getElementById('engagementChart').parentElement.style.display = datasetsData.length > 1 ? 'none' : 'block';
        if (datasetsData.length === 1) {
            const ctx2 = document.getElementById('engagementChart').getContext('2d');
            engagementChartInstance = new Chart(ctx2, {
                type: 'line',
                data: { labels: chartLabels, datasets: engagementDataSets },
                options: { responsive: true }
            });
        }
    }
});
