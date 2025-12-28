from googleapiclient.discovery import build
from flask import current_app
from datetime import datetime, timedelta
import isodate

def get_youtube_client():
    return build('youtube', 'v3', developerKey=current_app.config['YOUTUBE_API_KEY'])

def get_channel_details(channel_id):
    youtube = get_youtube_client()
    request = youtube.channels().list(
        part="snippet,contentDetails,statistics",
        id=channel_id
    )
    response = request.execute()
    
    if not response['items']:
        return None
        
    item = response['items'][0]
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
    
    video_ids = [item['contentDetails']['videoId'] for item in response['items']]
    
    if not video_ids:
        return []

    # Fetch stats for these videos
    stats_request = youtube.videos().list(
        part="statistics,contentDetails,snippet",
        id=','.join(video_ids)
    )
    stats_response = stats_request.execute()
    
    for item in stats_response['items']:
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
