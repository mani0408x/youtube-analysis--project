from backend.extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=True) # Nullable for email-only users
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    photo_url = db.Column(db.String(255))
    password_hash = db.Column(db.String(255)) # Stored hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Channel(db.Model):
    id = db.Column(db.String(50), primary_key=True) # YouTube Channel ID
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    subscriber_count = db.Column(db.BigInteger)
    video_count = db.Column(db.Integer)
    view_count = db.Column(db.BigInteger)
    thumbnail_url = db.Column(db.String(255))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    videos = db.relationship('Video', backref='channel', lazy=True)
    daily_stats = db.relationship('DailyChannelStats', backref='channel', lazy=True)

class Video(db.Model):
    id = db.Column(db.String(50), primary_key=True) # YouTube Video ID
    channel_id = db.Column(db.String(50), db.ForeignKey('channel.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    published_at = db.Column(db.DateTime)
    duration = db.Column(db.String(20)) # ISO 8601 duration
    view_count = db.Column(db.BigInteger)
    like_count = db.Column(db.BigInteger)
    comment_count = db.Column(db.BigInteger)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    daily_stats = db.relationship('DailyVideoStats', backref='video', lazy=True)

class DailyChannelStats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.String(50), db.ForeignKey('channel.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    subscribers = db.Column(db.BigInteger)
    views = db.Column(db.BigInteger)
    video_count = db.Column(db.Integer)
    # Placeholder for Phase 2/3 earnings
    earnings_est = db.Column(db.Float, default=0.0)

class DailyVideoStats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.String(50), db.ForeignKey('video.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    views = db.Column(db.BigInteger)
    likes = db.Column(db.BigInteger)
    comments = db.Column(db.BigInteger)
