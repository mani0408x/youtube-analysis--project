# youtube_fetch.py
import os
from dotenv import load_dotenv
from googleapiclient.discovery import build
import pandas as pd

load_dotenv()
YT_KEY = os.getenv("YT_KEY")

yt = build("youtube", "v3", developerKey=YT_KEY)

def fetch_videos(channel_id):
    video_ids = []

    req = yt.search().list(
        part="id",
        channelId=channel_id,
        maxResults=50,
        type="video"
    )

    while req:
        res = req.execute()
        for item in res["items"]:
            video_ids.append(item["id"]["videoId"])
        req = yt.search().list_next(req, res)

    videos = []
    for i in range(0, len(video_ids), 50):
        ids = ",".join(video_ids[i:i+50])
        res = yt.videos().list(
            part="snippet,statistics",
            id=ids
        ).execute()

        for v in res["items"]:
            s = v["snippet"]
            st = v["statistics"]

            videos.append({
                "title": s["title"],
                "published_date": s["publishedAt"],
                "views": int(st.get("viewCount", 0)),
                "likes": int(st.get("likeCount", 0)),
                "comments": int(st.get("commentCount", 0))
            })

    return pd.DataFrame(videos)


if __name__ == "__main__":
    cid = input("Enter Channel ID: ")
    df = fetch_videos(cid)
    df.to_csv("raw_youtube_data.csv", index=False)
    print("Raw data saved → raw_youtube_data.csv")
