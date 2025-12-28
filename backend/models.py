from backend.extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    avatar = db.Column(db.String(255))
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
