# database.py

from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# SQLite database file
DATABASE_URL = "sqlite:///youtube_data.db"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ----------------------------
# Table 1: Channels
# ----------------------------
class Channel(Base):
    __tablename__ = "channels"

    channel_id = Column(String, primary_key=True)
    channel_name = Column(String)
    subscriber_count = Column(Integer)
    view_count = Column(Integer)
    video_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

# ----------------------------
# Table 2: Videos
# ----------------------------
class Video(Base):
    __tablename__ = "videos"

    video_id = Column(String, primary_key=True)
    channel_id = Column(String, ForeignKey("channels.channel_id"))
    title = Column(String)
    view_count = Column(Integer)
    like_count = Column(Integer)
    comment_count = Column(Integer)
    published_at = Column(DateTime)

# ----------------------------
# Create DB tables
# ----------------------------
def init_db():
    Base.metadata.create_all(engine)

# ----------------------------
# Save Data Functions
# ----------------------------

def save_channel(session, data):
    channel = Channel(
        channel_id=data["channel_id"],
        channel_name=data["channel_name"],
        subscriber_count=data["subscriber_count"],
        view_count=data["view_count"],
        video_count=data["video_count"]
    )
    session.merge(channel)  # insert/update
    session.commit()


def save_videos(session, videos, channel_id):
    for v in videos:
        video = Video(
            video_id=v["video_id"],
            channel_id=channel_id,
            title=v["title"],
            view_count=v["view_count"],
            like_count=v["like_count"],
            comment_count=v["comment_count"],
            published_at=v["published_at"]
        )
        session.merge(video)
    session.commit()
