from flask import Blueprint, jsonify, request, current_app
<<<<<<< HEAD
from backend.models import User, Channels, UserChannels, db
from backend.services.youtube_service import get_channel_details, search_channels, get_channel_videos
from datetime import datetime, timedelta
import json
import random

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Helper: KPI Calculation & Strategy ---
def calculate_kpis(details, videos):
    # Basic data
    subs = details.get('subscriber_count', 0)
    total_views = details.get('view_count', 0)
    
    engagement_rate = 0.0
    total_engagement_actions = 0
    recent_views = 0
    
    # Store views by day for best day analysis
    day_views = {d: [] for d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
    
    if videos:
        for v in videos:
            v_views = v.get('view_count', 0)
            actions = v.get('like_count', 0) + v.get('comment_count', 0)
            
            if v_views > 0:
                total_engagement_actions += actions
                recent_views += v_views
            
            # Simple day of week tracker
            try:
                dt = datetime.fromisoformat(v['published_at'].replace('Z', '+00:00'))
                day_name = dt.strftime('%A')
                day_views[day_name].append(v_views)
            except:
                pass
        
        if recent_views > 0:
            engagement_rate = (total_engagement_actions / recent_views) * 100
            
    # Calculate best day to upload
    best_day = "Unknown"
    max_avg = -1
    for day, views in day_views.items():
        if views:
            avg = sum(views) / len(views)
            if avg > max_avg:
                max_avg = avg
                best_day = day
 
    # Simulated earnings based on views
    earnings = (total_views / 1000) * 2.0

    # Mock growth data for the chart
    growth = []
    for i in range(30):
        day = datetime.utcnow() - timedelta(days=30-i)
        growth.append({
            'date': day.strftime('%Y-%m-%d'),
            'subscribers': int(subs * (0.9 + (0.1 * (i/30))))
        })
    
    return {
        'engagement_rate': round(engagement_rate, 2),
        'estimated_earnings': int(earnings),
        'growth': growth,
        'strategy': {
            'best_upload_day': best_day,
            'best_upload_time': "18:00",
            'sample_size': len(videos)
        },
        'trends': [] # Simplified
    }

# --- 1. Login ---
@api_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    if not email: return jsonify({'error': 'Email is required'}), 400
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email); db.session.add(user); db.session.commit()
        return jsonify({'success': True, 'email': email, 'user_id': user.id})
    except Exception as e:
        db.session.rollback(); return jsonify({'error': str(e)}), 500

# --- 2. Analyze Channel (Real Strategy + Pagination) ---
@api_bp.route('/analyze-channel', methods=['POST'])
def analyze_channel():
    data = request.json
    email = data.get('email')
    channel_id = data.get('channel_id')
    
    # Optional pagination
    page_token = data.get('page_token')
    max_videos = 200 # Fetch 200 to get approx 12 months data

    if not email or not channel_id:
        return jsonify({'error': 'Email and Channel ID are required'}), 400

    try:
        # A. Get User
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email); db.session.add(user); db.session.commit()

        # B. Get Channel Details
        details = get_channel_details(channel_id)
        if not details:
            return jsonify({'error': 'Invalid Channel ID'}), 404

        # B2. Get Channel Videos (With Pagination Support)
        uploads_id = details.get('uploads_playlist')
        videos_data = {'videos': [], 'next_page_token': None}
        
        if uploads_id:
             # If loading more, we might just want videos?
             # But 'analyze' is the main dashboard load.
             # Let's fetch 50.
             videos_data = get_channel_videos(uploads_id, max_results=max_videos, page_token=page_token)

        videos = videos_data.get('videos', [])
        next_token = videos_data.get('next_page_token')

        # B3. Calculate KPIs (Use all fetched videos for analysis)
        kpis = calculate_kpis(details, videos)

        # C. Upsert Channel
        channel_entry = Channels.query.filter_by(channel_id=channel_id).first()
        if not channel_entry:
            channel_entry = Channels(channel_id=channel_id, channel_name=details.get('title'))
            channel_entry.set_details(details)
            db.session.add(channel_entry)
        else:
            channel_entry.channel_name = details.get('title')
            channel_entry.set_details(details)
        db.session.commit()

        # D. Link User (Prevent Duplicates)
        existing_link = UserChannels.query.filter_by(user_id=user.id, channel_id=channel_entry.id).first()
        if existing_link:
            existing_link.analyzed_at = datetime.utcnow()
        else:
            new_link = UserChannels(user_id=user.id, channel_id=channel_entry.id, analyzed_at=datetime.utcnow())
            db.session.add(new_link)
        
        db.session.commit()

        # E. Response
        response = {
            'success': True,
            'channel': details,
            'kpis': {
                'engagement_rate': kpis['engagement_rate'],
                'estimated_earnings': kpis['estimated_earnings']
            },
            'videos': videos, # Front end can slice top 5, or show all
            'next_page_token': next_token,
            'growth': kpis['growth'],
            'strategy': kpis['strategy']
        }
        return jsonify(response)

    except Exception as e:
        db.session.rollback(); return jsonify({'error': str(e)}), 500

# --- 2b. Fetch More Videos (Dedicated Endpoint) ---
@api_bp.route('/channel/videos', methods=['POST'])
def get_more_videos():
    data = request.json
    channel_id = data.get('channel_id')
    page_token = data.get('page_token') # Required for next page
    
    if not channel_id: return jsonify({'error': 'Channel ID required'}), 400
    
    try:
        details = get_channel_details(channel_id)
        if not details: return jsonify({'error': 'Invalid ID'}), 404
        
        uploads_id = details.get('uploads_playlist')
        if not uploads_id: return jsonify({'videos': [], 'next_page_token': None})
        
        # Fetch next batch (e.g. 20)
        videos_data = get_channel_videos(uploads_id, max_results=20, page_token=page_token)
        return jsonify(videos_data) # {videos, next_page_token}
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 3. Compare ---
@api_bp.route('/compare', methods=['POST'])
def compare_channels():
    data = request.json
    channel_ids = data.get('channel_ids', [])
    if not channel_ids: return jsonify({'error': 'IDs required'}), 400

    results = []
    try:
        for cid in channel_ids:
            details = get_channel_details(cid)
            if details:
                uploads = details.get('uploads_playlist')
                # get_channel_videos returns dict now
                v_data = get_channel_videos(uploads, max_results=20) if uploads else {'videos': []}
                videos = v_data.get('videos', [])
                
                kpis = calculate_kpis(details, videos)
                results.append({
                    'channel': details,
                    'kpis': kpis,
                    'videos': videos[:5], # Limit for compare
                    'growth': kpis['growth']
                })
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 4. Compare Top ---
@api_bp.route('/compare/top', methods=['GET'])
def compare_top():
    try:
        all_channels = Channels.query.all()
        def get_subs(c): return c.get_details().get('subscriber_count', 0)
        all_channels.sort(key=get_subs, reverse=True)
        top_5 = all_channels[:5]
        
        results = []
        for ch in top_5:
             details = ch.get_details()
             kpis = calculate_kpis(details, []) 
             results.append({
                 'channel': details,
                 'kpis': kpis, 
                 'videos': [], 
                 'growth': kpis['growth']
             })
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- 5. My Channels ---
@api_bp.route('/my-channels', methods=['GET'])
def my_channels():
    email = request.args.get('email')
    if not email: return jsonify({'error': 'Email required'}), 400
    try:
        user = User.query.filter_by(email=email).first()
        if not user: return jsonify([])
        recent = db.session.query(UserChannels, Channels).join(Channels, UserChannels.channel_id == Channels.id).filter(UserChannels.user_id == user.id).order_by(UserChannels.analyzed_at.desc()).all()
        
        results = []
        seen = set()
        for uc, ch in recent:
            if ch.channel_id not in seen:
                results.append({
                    'channel_id': ch.channel_id,
                    'channel_name': ch.channel_name,
                    'details': ch.get_details(),
                    'last_analyzed': uc.analyzed_at.isoformat()
                })
                seen.add(ch.channel_id)
        return jsonify(results)
    except Exception as e: return jsonify({'error': str(e)}), 500

# --- 6. Suggestions ---
@api_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    q = request.args.get('q')
    if not q: return jsonify([])
    try:
        results = search_channels(q, limit=5)
        return jsonify(results)
    except Exception as e: return jsonify([])

# --- 7. Config ---
@api_bp.route('/config/public', methods=['GET'])
def get_public_config():
    return jsonify({'google_client_id': current_app.config.get('GOOGLE_CLIENT_ID')})

# --- 8. AI routes removed (handled by huggingface_service blueprint) ---

# --- 9. Reports ---
@api_bp.route('/reports/monthly/<channel_id>', methods=['GET'])
def monthly_report(channel_id):
    try:
        # We need to fetch videos to generate this report
        details = get_channel_details(channel_id)
        if not details: return jsonify({'error': 'Channel not found'}), 404
        
        uploads = details.get('uploads_playlist')
        # Fetch more videos for a better report, e.g. 100
        # This might be slow content-wise, but okay for a dedicated report request
        videos_data = get_channel_videos(uploads, max_results=200) # Increased for deeper history
        videos = videos_data.get('videos', [])
        
        # Aggregate by Month
        monthly_stats = {}
        
        for v in videos:
            try:
                dt = datetime.fromisoformat(v['published_at'].replace('Z', '+00:00'))
                key = dt.strftime('%Y-%m') # 2024-01
                if key not in monthly_stats:
                    monthly_stats[key] = {'month': key, 'total_views': 0, 'video_count': 0, 'likes': 0}
                
                monthly_stats[key]['total_views'] += v.get('view_count', 0)
                monthly_stats[key]['likes'] += v.get('like_count', 0)
                monthly_stats[key]['video_count'] += 1
            except: pass
            
        # Convert to list and sort
        report = list(monthly_stats.values())
        report.sort(key=lambda x: x['month'], reverse=True)
        
        # Enriched response with mock subscriber growth if not tracking (MVP limitation)
        # We can't know historical subs without tracking. We'll return 0 or current for latest.
        current_subs = details.get('subscriber_count', 0)
        if report:
            report[0]['total_subscribers'] = current_subs
            # mock previous
            for i in range(1, len(report)):
                 report[i]['total_subscribers'] = int(report[i-1]['total_subscribers'] * 0.95)

        return jsonify({'report': report})
    except Exception as e: return jsonify({'error': str(e)}), 500

# --- 10. Landing Page Preview ---
@api_bp.route('/preview', methods=['POST'])
def preview_channel():
    data = request.json
    channel_input = data.get('channel_input')
    if not channel_input:
        return jsonify({'error': 'Channel input required'}), 400

    try:
        # 1. Get Details (Resolves URL/Name)
        details = get_channel_details(channel_input)
        if not details:
            return jsonify({'error': 'Channel not found'}), 404

        # 2. Get Recent Videos (Limit 50 for speed)
        uploads = details.get('uploads_playlist')
        videos_data = get_channel_videos(uploads, max_results=50) if uploads else {'videos': []}
        videos = videos_data.get('videos', [])

        # 3. Calculate metrics
        total_likes = sum(v.get('like_count', 0) for v in videos)
        total_comments = sum(v.get('comment_count', 0) for v in videos)
        recent_views = sum(v.get('view_count', 0) for v in videos)
        
        engagement_rate = 0
        if recent_views > 0:
            engagement_rate = ((total_likes + total_comments) / recent_views) * 100

        # Earnings (Lifetime)
        lifetime_views = details.get('view_count', 0)
        estimated_earnings = (lifetime_views / 1000) * 2.0 # $2 RPM

        # 4. Construct Response
        response = {
            'channel': {
                'title': details['title'],
                'thumbnail_url': details['thumbnail_url'],
                'subscriber_count': details['subscriber_count'],
                'video_count': details['video_count'],
                'view_count': details['view_count'], # Lifetime
                'last_updated': datetime.utcnow().isoformat(),
                'description': details['description']
            },
            'metrics': {
                'total_likes': total_likes,
                'total_comments': total_comments,
                'engagement_rate': round(engagement_rate, 2),
                'estimated_earnings': int(estimated_earnings)
            }
        }
        return jsonify(response)

    except Exception as e:
        print(f"Preview Error: {e}")
        return jsonify({'error': str(e)}), 500
=======
from backend.services.youtube_service import get_channel_details, get_channel_videos
from backend.services.analytics_service import calculate_earnings, segment_videos, get_historical_data, determine_best_upload_time
from backend.models import Channel, Video, DailyChannelStats, db
from datetime import datetime, date, timedelta
from sqlalchemy import desc
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
        # Use real data if available, else simulated
        growth_trends = get_historical_data(channel_id, int(channel.view_count), int(channel.subscriber_count))
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
    channel_input = data.get('channel_id') # Can be ID or Name
    
    if not channel_input:
        return jsonify({'error': 'Channel Name or ID is required'}), 400

    print(f"DEBUG: Received analyze request for: {channel_input}")
    from backend.services.youtube_service import resolve_channel_input
    resolved = resolve_channel_input(channel_input)
    print(f"DEBUG: Resolved to: {resolved}")
    
    if not resolved:
        print("DEBUG: Resolution failed.")
        return jsonify({'error': 'Channel not found'}), 404
        
    # Check if we got a list (Ambiguity/Search Results) or String (Direct ID)
    if isinstance(resolved, list):
        # Automatically select the first/best match as per user request
        if len(resolved) > 0:
            channel_id = resolved[0]['id']
        else:
             return jsonify({'error': 'Channel not found'}), 404
             
        # Log or handled differently if we wanted logic for multiple options, 
        # but user requested automatic fetch for name.
    else:
        channel_id = resolved

    result = process_channel_analysis(channel_id)
    if not result:
        return jsonify({'error': 'Channel not found'}), 404
    if 'error' in result:
        return jsonify(result), 500
    
    return jsonify(result)

@api_bp.route('/compare', methods=['POST'])
def compare_channels():
    data = request.get_json(silent=True) or {}
    inputs = data.get('channel_ids')
    
    # Backward compatibility or alternate input
    if not inputs:
        c1 = data.get('channel_id_1')
        c2 = data.get('channel_id_2')
        if c1 and c2:
            inputs = [c1, c2]
    
    if not inputs or not isinstance(inputs, list) or len(inputs) < 2:
        return jsonify({'error': 'At least two Channel names/IDs are required'}), 400
        
    from backend.services.youtube_service import resolve_channel_input
    
    resolved_ids = []
    
    for idx, inp in enumerate(inputs):
        if not inp: continue
        res = resolve_channel_input(inp)
        
        if not res:
             return jsonify({'error': f'Channel "{inp}" not found'}), 404
             
        if isinstance(res, list):
            # Found multiple options, auto-select the first one
            if len(res) > 0:
                resolved_ids.append(res[0]['id'])
            else:
                 return jsonify({'error': f'Channel "{inp}" not found'}), 404
        else:
            resolved_ids.append(res)
            
    # All resolved to IDs
    results = []
    for cid in resolved_ids:
        res_data = process_channel_analysis(cid)
        if not res_data:
             return jsonify({'error': f'Channel ({cid}) not found'}), 404
        if 'error' in res_data:
             return jsonify(res_data), 500
        results.append(res_data)

    return jsonify({
        'results': results
    })

@api_bp.route('/compare/top', methods=['GET'])
def compare_top_channels():
    """
    Returns top 5 channels stored in DB for quick comparison.
    """
    channels = Channel.query.order_by(desc(Channel.view_count)).limit(5).all()
    results = []
    for c in channels:
        # We can reuse process_channel_analysis to get full stats, or just return summary
        # Let's return summary for speed
        results.append({
            'channel': {
                'id': c.id,
                'title': c.title,
                'thumbnail_url': c.thumbnail_url,
                'subscriber_count': c.subscriber_count,
                'view_count': c.view_count
            }
        })
    return jsonify({'results': results})

@api_bp.route('/reports/monthly/<channel_id>', methods=['GET'])
def monthly_report(channel_id):
    """
    Aggregates DailyChannelStats by month.
    """
    stats = DailyChannelStats.query.filter_by(channel_id=channel_id).order_by(DailyChannelStats.date.asc()).all()
    
    if not stats:
        return jsonify({'error': 'No data found for this channel'}), 404

    # Aggregate by Month
    monthly_data = {}
    for s in stats:
        month_key = s.date.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                'views': 0, 'subscribers_gained': 0, 'data_points': 0, 
                'start_subs': s.subscribers, 'end_subs': s.subscribers
            }
        
        m = monthly_data[month_key]
        m['views'] = max(m['views'], s.views) # Take max view count as "month end" roughly, or sum of deltas? 
        # Actually views are cumulative total. So growth = end - start.
        m['end_subs'] = s.subscribers
        m['data_points'] += 1

    report = []
    prev_views = 0
    for month, data in monthly_data.items():
        # Calculate deltas if possible, or just raw
        # Since views are total, views gained = current month max - prev month max
        # Simplified logic for now
        report.append({
            'month': month,
            'total_views': data['views'],
            'total_subscribers': data['end_subs']
        })
    
    return jsonify({'report': report})
    
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
    
@api_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    q = request.args.get('q')
    if not q:
        return jsonify([])
        
    # BACKDOOR DEBUG: Verify UI works independent of API Quota
    if q.lower() == 'test':
        return jsonify([{
            'id': 'UCX6OQ3DkcsbYNE6H8uQQuVA',
            'title': 'Test Channel (System Working)',
            'thumbnail': 'https://via.placeholder.com/32',
            'description': 'System Check',
            'subscriber_count': 999999
        }])

    from backend.services.youtube_service import search_channels
    
    # DEBUG: Log to file
    try:
        with open('suggestions.log', 'a') as f:
            f.write(f"Query: {q}\n")
    except:
        pass

    try:
        results = search_channels(q, limit=5)
    except ValueError as e:
        if str(e) == "QUOTA_EXCEEDED":
            return jsonify({'error': 'Daily YouTube API limit reached. Please try again tomorrow.'}), 429
        raise e
    
    try:
        with open('suggestions.log', 'a') as f:
            f.write(f"Result Count: {len(results)}\n")
    except:
        pass

    return jsonify(results)
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70

