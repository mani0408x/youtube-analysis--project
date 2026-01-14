from backend.extensions import db
from datetime import datetime
<<<<<<< HEAD
import json

# User model to store login info
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    # This stores the default channel for specific users
    assigned_channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=True)

    assigned_channel = db.relationship('Channels', foreign_keys=[assigned_channel_id])

# Store youtube channel details
class Channels(db.Model):
    __tablename__ = 'channels'
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.String(50), unique=True, nullable=False)
    channel_name = db.Column(db.String(200))
    channel_details = db.Column(db.Text) # Storing as JSON string

    def set_details(self, data):
        self.channel_details = json.dumps(data)
    
    def get_details(self):
        return json.loads(self.channel_details) if self.channel_details else {}

# Link users to channels they have analyzed
class UserChannels(db.Model):
    __tablename__ = 'user_channels'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    analyzed_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('analyzed_channels', lazy=True))
    channel = db.relationship('Channels', backref=db.backref('analyzed_by', lazy=True))
=======

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
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
