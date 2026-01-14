document.addEventListener('DOMContentLoaded', () => {
    const previewInput = document.getElementById('preview-input');
    const previewBtn = document.getElementById('preview-btn');
    const resultsContainer = document.getElementById('preview-results');
    const errorContainer = document.getElementById('preview-error');

    // Preview Elements
    const pImg = document.getElementById('p-img');
    const pTitle = document.getElementById('p-title');
    const pSubs = document.getElementById('p-subs');
    const pVideos = document.getElementById('p-videos');
    const pViews = document.getElementById('p-views');
    const pDate = document.getElementById('p-date');
    const pDesc = document.getElementById('p-desc');

    previewBtn.addEventListener('click', handlePreview);
    previewInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePreview();
    });

    async function handlePreview() {
        const query = previewInput.value.trim();
        if (!query) return;

        // Reset UI
        errorContainer.style.display = 'none';
        resultsContainer.style.display = 'none';
        previewBtn.disabled = true;
        previewBtn.textContent = 'Analyzing...';

        // Visual "Scanning" effect (optional, keep simple for now)

        try {
            const response = await fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel_input: query })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch channel');
            }

            // Populate UI
            const ch = data.channel;
            const m = data.metrics || {};

            pImg.src = ch.thumbnail_url;
            pImg.onerror = () => { pImg.src = 'https://via.placeholder.com/50'; };

            pTitle.textContent = ch.title;
            pSubs.textContent = formatNumber(ch.subscriber_count);
            pVideos.textContent = formatNumber(ch.video_count);

            pViews.textContent = formatNumber(ch.view_count);

            // New Metrics
            const pEng = document.getElementById('p-engagement');
            const pEarn = document.getElementById('p-earnings');
            const pLikes = document.getElementById('p-likes');

            if (pEng) pEng.textContent = m.engagement_rate + '%';
            if (pEarn) pEarn.textContent = '$' + formatNumber(m.estimated_earnings);
            if (pLikes) pLikes.textContent = formatNumber(m.total_likes);

            pDesc.textContent = ch.description ? ch.description.substring(0, 100) + '...' : 'No description available.';

            // Show Result
            resultsContainer.style.display = 'block';

        } catch (err) {
            errorContainer.textContent = err.message;
            errorContainer.style.display = 'block';
        } finally {
            previewBtn.disabled = false;
            previewBtn.textContent = 'Preview Channel';
        }
    }

    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
});
