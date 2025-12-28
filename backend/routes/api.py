from flask import Blueprint, jsonify, request, current_app
from backend.services.youtube_service import get_channel_details, get_channel_videos
from backend.models import Channel, Video, db
from datetime import datetime
import pandas as pd
import math

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
        db.session.commit()
        
        # 3. Fetch Videos
        videos_data = get_channel_videos(channel_data['uploads_playlist'])
        
        processed_videos = []
        for v_data in videos_data:
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
            video.last_updated = datetime.utcnow()
            
            db.session.add(video)
            processed_videos.append({
                'title': video.title,
                'views': video.view_count,
                'likes': video.like_count,
                'comments': video.comment_count,
                'published_at': video.published_at.isoformat(),
                'duration': video.duration
            })
            
        db.session.commit()
        
        # 4. Perform Analytics (Pandas)
        df = pd.DataFrame(processed_videos)
        
        if not df.empty:
            avg_views = df['views'].mean()
            if pd.isna(avg_views): avg_views = 0

            # Prevent division by zero: replace 0 views with 1 for calculation, 
            # then forcibly set engagement to 0 where views were 0 (if needed, but 0/1 is 0).
            # If likes>0 and views=0, 0/1 preserves finite value.
            safe_views = df['views'].replace(0, 1)
            engagement_rate = ((df['likes'] + df['comments']) / safe_views).mean() * 100
            if pd.isna(engagement_rate): engagement_rate = 0

            top_video = df.loc[df['views'].idxmax()].to_dict()
        else:
            avg_views = 0
            engagement_rate = 0
            top_video = {}

        return sanitize_for_json({
            'channel': channel_data,
            'kpis': {
                'avg_views': round(float(avg_views), 2),
                'engagement_rate': round(float(engagement_rate), 2),
                'top_video': top_video
            },
            'videos': processed_videos
        })
    except Exception as e:
        current_app.logger.error(f"Error processing channel {channel_id}: {str(e)}")
        # Re-raise or return special error dict?
        # Better to catch in the route handler, but helper is used by multiple.
        # Let's return a dict with error key for simplicity in route handler checks
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
    
@api_bp.route('/channel/<channel_id>/stats')
def get_stats(channel_id):
    # Retrieve from DB for dashboard verify
    channel = Channel.query.get_or_404(channel_id)
    return jsonify({
        'title': channel.title,
        'subscribers': channel.subscriber_count
    })
