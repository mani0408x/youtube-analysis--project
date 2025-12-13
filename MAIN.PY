import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from config import YT_KEY

# ---------------- PAGE CONFIG ----------------
st.set_page_config(
    page_title="YouTube Analytics & Insight Dashboard",
    layout="wide"
)

# ---------------- YOUTUBE API ----------------
yt = build("youtube", "v3", developerKey=YT_KEY)

# ---------------- DATA FETCH FUNCTION ----------------
def fetch_data(channel_id):
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
            stt = v["statistics"]

            views = int(stt.get("viewCount", 0))
            likes = int(stt.get("likeCount", 0))
            comments = int(stt.get("commentCount", 0))
            engagement = (likes + comments) / views if views != 0 else 0

            videos.append({
                "Title": s["title"],
                "Published Date": s["publishedAt"],
                "Views": views,
                "Likes": likes,
                "Comments": comments,
                "Engagement Rate": engagement
            })

    df = pd.DataFrame(videos)
    df["Published Date"] = pd.to_datetime(df["Published Date"]).dt.date
    return df

# ---------------- UI ----------------
st.title("📊 YouTube Analytics & Insight Dashboard")
st.caption("Analyze YouTube channel performance visually")

st.sidebar.header("🔍 Channel Input")
channel_id = st.sidebar.text_input("Enter YouTube Channel ID")

# ---------------- BUTTON ACTION ----------------
if st.sidebar.button("🚀 Fetch Data"):
    if channel_id.strip() == "":
        st.error("Please enter a valid Channel ID")
    else:
        with st.spinner("Fetching data from YouTube..."):
            df = fetch_data(channel_id)

        st.success("Data fetched successfully ✅")

        # ---------- VIDEO DATA TABLE (TOP) ----------
        st.subheader("📋 Video Data (All Videos)")
        st.dataframe(df, use_container_width=True)

        st.divider()

        # ---------- ENGAGEMENT RATE ----------
        st.subheader("📊 Engagement Rate per Video (Top 10)")
        eng_df = df.sort_values("Engagement Rate", ascending=False).head(10)
        st.bar_chart(eng_df.set_index("Title")["Engagement Rate"])

        st.divider()

        # ---------- VIEWS PER VIDEO ----------
        st.subheader("📈 Views per Video (Top 10)")
        views_df = df.sort_values("Views", ascending=False).head(10)
        st.bar_chart(views_df.set_index("Title")["Views"])

        st.divider()

        # ---------- LIKES vs VIEWS ----------
        st.subheader("❤️ Likes vs Views (Trend)")
        lv_df = df.sort_values("Views")
        st.line_chart(lv_df[["Views", "Likes"]])

        st.divider()

        # ---------- SAVE CSV ----------
        df.to_csv("clean_youtube_data.csv", index=False)
        st.success("Data saved as clean_youtube_data.csv")
