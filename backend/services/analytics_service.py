from datetime import datetime, timedelta
import random

def calculate_earnings(views, cpm=2.0):
    """
    Calculate estimated earnings based on views and a default CPM.
    CPM = Cost Per Mille (1000 views).
    Default assumption: $2.00 per 1000 views.
    """
    if not views:
        return 0.0
    
    # Simple formula: (views / 1000) * cpm
    earnings = (views / 1000) * cpm
    return round(earnings, 2)

def segment_videos(videos):
    """
    Sort and segment videos into categories:
    - Top 5 by Views
    - Top 5 by Engagement
    """
    if not videos:
        return {'top_views': [], 'top_engagement': []}

    # Sort by views
    by_views = sorted(videos, key=lambda x: x.get('view_count', 0), reverse=True)
    
    # Sort by engagement (likes + comments)
    by_engagement = sorted(videos, key=lambda x: (x.get('like_count', 0) + x.get('comment_count', 0)), reverse=True)

    return {
        'top_views': [
            {
                'title': v['title'],
                'published_at': v['published_at'],
                'views': v['view_count'],
                'likes': v['like_count'],
                'comments': v['comment_count'],
                # Calculate engagement rate for individual video: ((L+C)/V)*100
                'engagement_rate': round(((v.get('like_count', 0) + v.get('comment_count', 0)) / max(v.get('view_count', 1), 1)) * 100, 2)
            } for v in by_views[:10]
        ],
        'top_engagement': [
             {
                'title': v['title'],
                'views': v['view_count'],
                'engagement_rate': round(((v.get('like_count', 0) + v.get('comment_count', 0)) / max(v.get('view_count', 1), 1)) * 100, 2)
            } for v in by_engagement[:5]
        ]
    }

def mock_historical_data(current_views, current_subs):
    """
    Generates 15 days of mocked historical data for demonstration.
    Creates a realistic growth curve leading up to current values.
    """
    data = []
    # Reverse loop: Today -> 14 days ago
    for i in range(14, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
        # Simulate slight daily variation (random drop 0-2%)
        factor = 1.0 - (i * 0.01) - (random.uniform(0, 0.005))
        
        sim_views = int(current_views * factor)
        sim_subs = int(current_subs * factor)
        
        data.append({
            'date': date,
            'views': sim_views,
            'subscribers': sim_subs
        })
    return data

def determine_best_upload_time(videos):
    """
    Analyzes video performance by Day of Week and Hour of Day.
    Returns:
    - heat_map: List of {day, hour, avg_views}
    - best_day: String (e.g. "Wednesday")
    """
    if not videos:
        return {'heatmap': [], 'best_day': 'N/A'}
        
    # Buckets: day_hour -> list of views
    buckets = {}
    
    for v in videos:
        # Parse ISO format: 2023-10-27T10:00:00+00:00 or similar
        try:
             # Assume format is consistent from what we pass (isoformat)
             # But checks are safer. The input 'videos' here are dicts from `process_channel_analysis`
             dt = datetime.fromisoformat(v['published_at'])
             day = dt.strftime('%A') # Monday
             hour = dt.hour # 0-23
             key = (day, hour)
             
             if key not in buckets:
                 buckets[key] = []
             buckets[key].append(v['view_count'])
        except Exception:
            continue
            
    # Calculate Averages
    heatmap = []
    day_totals = {} 
    
    for (day, hour), view_list in buckets.items():
        avg = sum(view_list) / len(view_list)
        heatmap.append({
            'day': day,
            'hour': hour,
            'score': avg # Using raw views as score
        })
        
        if day not in day_totals: day_totals[day] = 0
        day_totals[day] += avg

    # Find Best Day
    best_day = max(day_totals, key=day_totals.get) if day_totals else "N/A"
    
    return {
        'heatmap': heatmap,
        'best_day': best_day
    }
