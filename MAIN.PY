# app.py

import streamlit as st
import pandas as pd
from backend import fetch_channel_details, fetch_video_ids, fetch_videos_details, make_df
from database import init_db, save_channel, save_videos, SessionLocal

# Initialize database
init_db()

st.set_page_config(page_title="YouTube Dashboard", layout="wide")
st.title("📊 YouTube Analytics Dashboard (SQLite Edition)")

# ------------------------------------
# Sidebar Input
# ------------------------------------
with st.sidebar:
    channel_id = st.text_input("Enter YouTube Channel ID", placeholder="UC_x5XG1OV2P6uZZ5FSM9Ttw")
    max_videos = st.slider("Number of Videos", 5, 50, 20)
    analyze = st.button("Analyze")

# ------------------------------------
# On Analyze Click
# ------------------------------------
if analyze:
    if not channel_id:
        st.error("Please enter a valid Channel ID")
    else:
        with st.spinner("Fetching channel details..."):
            channel = fetch_channel_details(channel_id)

        if channel is None:
            st.error("Invalid Channel ID")
        else:
            # Display channel info
            st.header(f"📺 {channel['channel_name']}")
            col1, col2, col3 = st.columns(3)
            col1.metric("Subscribers", channel["subscriber_count"])
            col2.metric("Total Views", channel["view_count"])
            col3.metric("Total Videos", channel["video_count"])

            with st.spinner("Fetching video list..."):
                video_ids = fetch_video_ids(channel_id, max_videos)

            with st.spinner("Fetching video details..."):
                videos = fetch_videos_details(video_ids)

            df = make_df(videos)

            # Save to DB
            session = SessionLocal()
            save_channel(session, channel)
            save_videos(session, videos, channel_id)

            st.success("Data saved to SQLite database!")

            # ------------------------------
            # TABLE
            # ------------------------------
            st.subheader("Video Insights Table")
            st.dataframe(df)

            # ------------------------------
            # Charts
            # ------------------------------
            st.subheader("Views per Video")
            st.bar_chart(df.set_index("title")["view_count"])

            st.subheader("Like Rate")
            st.line_chart(df.set_index("title")["like_rate"])
