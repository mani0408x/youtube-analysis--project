from googleapiclient.discovery import build
from flask import current_app
from datetime import datetime, timedelta
import isodate

def get_youtube_client():
    return build('youtube', 'v3', developerKey=current_app.config['YOUTUBE_API_KEY'])

def get_channel_details(channel_id=None, mine=False, for_username=None):
    youtube = get_youtube_client()
    
    # Enforce mutual exclusivity of filters
    filters_count = sum([bool(channel_id), bool(mine), bool(for_username)])
    if filters_count > 1:
        raise ValueError("A maximum of one of the following filters may be specified: channel_id, mine, for_username")
    if filters_count == 0:
        raise ValueError("at least one filter must be specified")

    kwargs = {'part': "snippet,contentDetails,statistics"}
    
    if channel_id:
        kwargs['id'] = channel_id
    elif mine:
        kwargs['mine'] = True
    elif for_username:
        kwargs['forUsername'] = for_username

    request = youtube.channels().list(**kwargs)
    response = request.execute()
    
    items = response.get('items', [])
    if not items:
        return None
        
    item = items[0]
    return {
        'id': item['id'],
        'title': item['snippet']['title'],
        'description': item['snippet']['description'],
        'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
        'subscriber_count': int(item['statistics'].get('subscriberCount', 0)),
        'video_count': int(item['statistics'].get('videoCount', 0)),
        'view_count': int(item['statistics'].get('viewCount', 0)),
        'uploads_playlist': item['contentDetails']['relatedPlaylists']['uploads']
    }

def get_channel_videos(playlist_id, max_results=50):
    youtube = get_youtube_client()
    videos = []
    next_page_token = None
    
    # limiting to one page for MVP/demo purposes
    request = youtube.playlistItems().list(
        part="snippet,contentDetails",
        playlistId=playlist_id,
        maxResults=max_results,
        pageToken=next_page_token
    )
    response = request.execute()
    
    video_ids = [item['contentDetails']['videoId'] for item in response.get('items', [])]
    
    if not video_ids:
        return []

    # Fetch stats for these videos
    stats_request = youtube.videos().list(
        part="statistics,contentDetails,snippet",
        id=','.join(video_ids)
    )
    stats_response = stats_request.execute()
    
    for item in stats_response.get('items', []):
        duration = isodate.parse_duration(item['contentDetails']['duration'])
        videos.append({
            'id': item['id'],
            'title': item['snippet']['title'],
            'published_at': item['snippet']['publishedAt'],
            'duration': str(duration),
            'view_count': int(item['statistics'].get('viewCount', 0)),
            'like_count': int(item['statistics'].get('likeCount', 0)),
            'comment_count': int(item['statistics'].get('commentCount', 0))
        })
        
    return videos



def search_channels(query, limit=5):
    """
    Searches for channels by name and returns a list of candidates with details.
    """
    youtube = get_youtube_client()
    try:
        # 1. Search for channels
        search_response = youtube.search().list(
            q=query,
            type='channel',
            part='id,snippet',
            maxResults=limit
        ).execute()

        items = search_response.get('items', [])
        if not items:
            return []

        # 2. Extract IDs to fetch stats (search snippet doesn't have subs)
        channel_ids = [item['id']['channelId'] for item in items if 'id' in item and 'channelId' in item['id']]
        
        if not channel_ids:
            return []

        # 3. Fetch details (subs)
        stats_response = youtube.channels().list(
            part='statistics,snippet',
            id=','.join(channel_ids)
        ).execute()
        
        # Map details by ID for easy lookup
        details_map = {item['id']: item for item in stats_response.get('items', [])}
        
        candidates = []
        for item in items:
            c_id = item['id']['channelId']
            # Prefer the details from channels.list as it has everything including subs
            detailed = details_map.get(c_id)
            
            if detailed:
                # Use detailed info
                snippet = detailed['snippet']
                stats = detailed['statistics']
                candidates.append({
                    'id': c_id,
                    'title': snippet['title'],
                    'thumbnail': snippet['thumbnails'].get('default', {}).get('url'),
                    'description': snippet['description'],
                    'subscriber_count': int(stats.get('subscriberCount', 0))
                })
            else:
                # Fallback to search snippet if detail fetch failed (unlikely)
                snippet = item['snippet']
                candidates.append({
                    'id': c_id,
                    'title': snippet['title'],
                    'thumbnail': snippet['thumbnails'].get('default', {}).get('url'),
                    'description': snippet['description'],
                    'subscriber_count': 0
                })
                
        return candidates
    except Exception as e:
        print(f"Error searching channel: {e}")
        return []

def resolve_channel_input(input_str):
    """
    Resolves a user input string to a Channel ID.
    - If it looks like a Channel ID (UC...), returns it.
    - Otherwise, searches YouTube for a channel by name.
    """
    input_str = input_str.strip()
    
    # 1. Simple Heuristic for Channel ID: Starts with UC and length ~ 24
    if input_str.startswith('UC') and len(input_str) > 20:
        return input_str
        
    # 2. Search for Channel by Name
    candidates = search_channels(input_str, limit=3)
    
    if not candidates:
        return None
        
    return candidates
