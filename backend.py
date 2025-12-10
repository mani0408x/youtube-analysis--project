# backend.py

import pandas as pd
from googleapiclient.discovery import build
from datetime import datetime
from config import YT_API_KEY

# ----------------------------
# YouTube API Service
# ----------------------------
def yt_service():
    return build("youtube", "v3", developerKey=YT_API_KEY)

# ----------------------------
# Step 1: Channel Details
# ----------------------------
def fetch_channel_details(channel_id):
    yt = yt_service()
    req = yt.channels().list(
        part="snippet,statistics",
        id=channel_id
    )
    res = req.execute()

    if not res["items"]:
        return None

    item = res["items"][0]
    return {
        "channel_id": channel_id,
        "channel_name": item["snippet"]["title"],
        "subscriber_count": int(item["statistics"].get("subscriberCount", 0)),
        "view_count": int(item["statistics"].get("viewCount", 0)),
        "video_count": int(item["statistics"].get("videoCount", 0)),
    }

# ----------------------------
# Step 2: Video IDs
# ----------------------------
def fetch_video_ids(channel_id, max_results=30):
    yt = yt_service()
    req = yt.search().list(
        part="id",
        channelId=channel_id,
        maxResults=max_results,
        order="date"
    )
    res = req.execute()

    return [
        i["id"]["videoId"]
        for i in res.get("items", [])
        if i["id"]["kind"] == "youtube#video"
    ]

# ----------------------------
# Step 3: Video Details
# ----------------------------
def fetch_videos_details(video_ids):
    yt = yt_service()
    joined = ",".join(video_ids)

    req = yt.videos().list(
        part="snippet,statistics",
        id=joined
    )
    res = req.execute()

    videos = []
    for v in res.get("items", []):
        snippet = v["snippet"]
        stats = v["statistics"]

        videos.append({
            "video_id": v["id"],
            "title": snippet["title"],
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "published_at": datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
        })
    return videos

# ----------------------------
# DataFrame Helper
# ----------------------------
def make_df(videos):
    df = pd.DataFrame(videos)
    df["like_rate"] = df["like_count"] / df["view_count"].replace(0, 1)
    return df
