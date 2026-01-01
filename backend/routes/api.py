from flask import Blueprint, jsonify, request, current_app
from backend.services.youtube_service import get_channel_details, get_channel_videos
from backend.services.analytics_service import calculate_earnings, segment_videos, mock_historical_data, determine_best_upload_time
from backend.models import Channel, Video, DailyChannelStats, db
from datetime import datetime, date
import pandas as pd
import math

# ... (sanitize helper remains) ...

def sanitize_for_json(data):
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return 0
        return data
    return data

api_bp = Blueprint('api', __name__, url_prefix='/api')

def process_channel_analysis(channel_id):
    try:
        # 1. Fetch Channel Details
        channel_data = get_channel_details(channel_id)
        if not channel_data:
            return None
            
        # 2. Store/Update Channel in DB
        channel = Channel.query.get(channel_id)
        if not channel:
            channel = Channel(id=channel_id)
        
        channel.title = channel_data['title']
        channel.description = channel_data['description']
        channel.subscriber_count = channel_data['subscriber_count']
        channel.video_count = channel_data['video_count']
        channel.view_count = channel_data['view_count']
        channel.thumbnail_url = channel_data['thumbnail_url']
        channel.last_updated = datetime.utcnow()
        
        db.session.add(channel)
        
        # 2b. Store Daily Stats (Snapshot)
        today = date.today()
        daily_stats = DailyChannelStats.query.filter_by(channel_id=channel_id, date=today).first()
        if not daily_stats:
            daily_stats = DailyChannelStats(channel_id=channel_id, date=today)
            
        daily_stats.subscribers = channel.subscriber_count
        daily_stats.views = channel.view_count
        daily_stats.video_count = channel.video_count
        daily_stats.earnings_est = calculate_earnings(int(channel.view_count))
        
        db.session.add(daily_stats)
        db.session.commit()
        
        # 3. Fetch Videos
        videos_data = get_channel_videos(channel_data['uploads_playlist'])
        
        processed_videos = []
        for v_data in videos_data:
            # ... (Video Logic Same) ...
            video = Video.query.get(v_data['id'])
            if not video:
                video = Video(id=v_data['id'])
            
            video.channel_id = channel_id
            video.title = v_data['title']
            video.published_at = datetime.fromisoformat(v_data['published_at'].replace('Z', '+00:00'))
            video.duration = v_data['duration']
            video.view_count = v_data['view_count']
            video.like_count = v_data['like_count']
            video.comment_count = v_data['comment_count']
            
            db.session.add(video)
            video_dict = {
                'title': video.title,
                'published_at': video.published_at.isoformat(),
                'view_count': int(video.view_count),
                'like_count': int(video.like_count),
                'comment_count': int(video.comment_count),
                'duration': video.duration
            }
            processed_videos.append(video_dict)
            
        db.session.commit()
        
        # 4. Perform Analytics
        segmented = segment_videos(processed_videos)
        estimated_earnings = calculate_earnings(int(channel.view_count))
        
        # New Phase 3: Growth & Strategy
        # Use mock data for now to show the feature capabilities immediately
        growth_trends = mock_historical_data(int(channel.view_count), int(channel.subscriber_count))
        upload_strategy = determine_best_upload_time(processed_videos)

        # Basic KPI with Pandas
        df = pd.DataFrame(processed_videos)
        if not df.empty:
            avg_views = df['view_count'].mean()
            safe_views = df['view_count'].replace(0, 1)
            engagement_rate = ((df['like_count'] + df['comment_count']) / safe_views).mean() * 100
             # Use service result for top video
            top_video_kpi = segmented['top_views'][0] if segmented['top_views'] else {}
        else:
            avg_views = 0
            engagement_rate = 0
            top_video_kpi = {}

        return sanitize_for_json({
            'channel': channel_data,
            'kpis': {
                'avg_views': round(float(avg_views), 2),
                'engagement_rate': round(float(engagement_rate), 2),
                'estimated_earnings': estimated_earnings,
                'top_video': top_video_kpi
            },
            'segments': segmented,
            'growth': growth_trends,
            'strategy': upload_strategy, 
            'videos': [
                {
                    'title': v['title'],
                    'views': v['view_count'],
                    'likes': v['like_count'],
                    'comments': v['comment_count'],
                    'published_at': v['published_at'],
                    'duration': v['duration']
                } for v in processed_videos
            ]
        })
    except Exception as e:
        # Log to file/console clearly
        print(f"ANALYSIS ERROR: {str(e)}")
        current_app.logger.error(f"Error processing channel {channel_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@api_bp.route('/analyze', methods=['POST'])
def analyze_channel():
    data = request.json
    channel_id = data.get('channel_id')
    
    if not channel_id:
        return jsonify({'error': 'Channel ID is required'}), 400

    result = process_channel_analysis(channel_id)
    if not result:
        return jsonify({'error': 'Channel not found'}), 404
    if 'error' in result:
        return jsonify(result), 500
    
    return jsonify(result)

@api_bp.route('/compare', methods=['POST'])
def compare_channels():
    data = request.get_json(silent=True) or {}
    channel_ids = data.get('channel_ids')
    
    # Backward compatibility or alternate input
    if not channel_ids:
        c1 = data.get('channel_id_1')
        c2 = data.get('channel_id_2')
        if c1 and c2:
            channel_ids = [c1, c2]
    
    if not channel_ids or not isinstance(channel_ids, list) or len(channel_ids) < 2:
        return jsonify({'error': 'At least two Channel IDs are required'}), 400
        
    results = []
    
    for cid in channel_ids:
        if not cid: continue
        res = process_channel_analysis(cid)
        if not res:
            return jsonify({'error': f'Channel ({cid}) not found'}), 404
        if 'error' in res:
            return jsonify(res), 500
        results.append(res)

    return jsonify({
        'results': results
    })
    
@api_bp.route('/ai/generate', methods=['POST'])
def generate_ai_content():
    data = request.json
    action = data.get('action') # 'ideas' or 'script'
    
    if not action:
        return jsonify({'error': 'Action is required'}), 400
        
    try:
        if action == 'ideas':
            # Needs 'topic' and 'channel_name' (optional)
            from backend.services.ai_service import generate_video_ideas
            topic = data.get('topic', 'YouTube Growth')
            channel_name = data.get('channel_name', 'YouTuber')
            result = generate_video_ideas(topic, channel_name)
            return jsonify({'result': result})
            
        elif action == 'script':
            # Needs 'title' and 'tone'
            from backend.services.ai_service import generate_script
            title = data.get('title')
            tone = data.get('tone', 'casual')
            if not title:
                return jsonify({'error': 'Title is required for script generation'}), 400
            result = generate_script(title, tone)
            return jsonify({'result': result})
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
            
    except Exception as e:
        current_app.logger.error(f"AI Generation Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/channel/<channel_id>/stats')
def get_stats(channel_id):
    # Retrieve from DB for dashboard verify
    channel = Channel.query.get_or_404(channel_id)
    return jsonify({
        'title': channel.title,
        'subscribers': channel.subscriber_count
    })

@api_bp.route('/config/public', methods=['GET'])
def get_public_config():
    """
    Returns public configuration mainly for frontend usage.
    """
    return jsonify({
        'google_client_id': current_app.config.get('GOOGLE_CLIENT_ID')
    })

