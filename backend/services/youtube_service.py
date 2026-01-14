from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app
from datetime import datetime, timedelta
import isodate

<<<<<<< HEAD
# create youtube client using api key
def get_youtube_client():
    return build('youtube', 'v3', developerKey=current_app.config['YOUTUBE_API_KEY'])

# get channel info from id or name
def get_channel_details(channel_input=None, mine=False):
    youtube = get_youtube_client()
    
    if mine:
        res = youtube.channels().list(part="snippet,contentDetails,statistics", mine=True).execute()
        items = res.get('items', [])
        return _format_channel_data(items[0]) if items else None

    channel_id = channel_input
    # if it doesn't look like an ID, search for it
    if not (channel_input.startswith('UC') and len(channel_input) == 24):
        search_res = youtube.search().list(part="snippet", type="channel", q=channel_input, maxResults=1).execute()
        items = search_res.get('items', [])
        if not items: return None
        channel_id = items[0]['snippet']['channelId']

    res = youtube.channels().list(part="snippet,contentDetails,statistics", id=channel_id).execute()
    items = res.get('items', [])
    return _format_channel_data(items[0]) if items else None

def _format_channel_data(item):
    # helper to clean up the response
=======
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
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
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

<<<<<<< HEAD
# get list of videos from a playlist
def get_channel_videos(playlist_id, max_results=50, page_token=None):
    youtube = get_youtube_client()
    
    res = youtube.playlistItems().list(
        part="snippet,contentDetails", 
        playlistId=playlist_id, 
        maxResults=max_results, 
        pageToken=page_token
    ).execute()
    
    token = res.get('nextPageToken')
    ids = [i['contentDetails']['videoId'] for i in res.get('items', [])]
    
    if not ids: return {'videos': [], 'next_page_token': None}

    # get stats for each video
    stats_res = youtube.videos().list(part="statistics,contentDetails,snippet", id=','.join(ids)).execute()
    
    videos = []
    for item in stats_res.get('items', []):
=======
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
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
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
<<<<<<< HEAD
    
    videos.sort(key=lambda x: x['published_at'], reverse=True)
    return {'videos': videos, 'next_page_token': token}

# search for channels by query
def search_channels(query, limit=5):
    youtube = get_youtube_client()
    try:
        res = youtube.search().list(q=query, type='channel', part='id,snippet', maxResults=limit).execute()
        ids = [i['id']['channelId'] for i in res.get('items', [])]
        if not ids: return []

        details = youtube.channels().list(part='statistics,snippet', id=','.join(ids)).execute()
        
        results = []
        for d in details.get('items', []):
            results.append({
                'id': d['id'],
                'title': d['snippet']['title'],
                'thumbnail': d['snippet']['thumbnails'].get('default', {}).get('url'),
                'description': d['snippet']['description'],
                'subscriber_count': int(d['statistics'].get('subscriberCount', 0))
            })
        return results
    except:
        return []
=======
        
    return videos



def search_channels(query, limit=5):
    """
    Searches for channels by name and returns a list of candidates with details.
    """
    youtube = get_youtube_client()
    
    # Check if client is properly initialized
    if not current_app.config.get('YOUTUBE_API_KEY'):
        print("ERROR: YOUTUBE_API_KEY is missing in config/env")
        return []

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
    except HttpError as e:
        # Check for Quota Exceeded
        if e.resp.status in [403, 429]:
            import json
            try:
                content = json.loads(e.content.decode('utf-8'))
                reason = content.get('error', {}).get('errors', [{}])[0].get('reason')
                if reason == 'quotaExceeded':
                    print("ERROR: YouTube API Quota Exceeded")
                    raise ValueError("QUOTA_EXCEEDED")
            except:
                pass
        
        print(f"YouTube API Error: {e}")
        return []
    except Exception as e:
        print(f"Error searching channels: {e}")
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
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
