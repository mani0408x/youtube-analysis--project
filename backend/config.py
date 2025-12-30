import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
# Loading .env from project root (one level up from backend)
dotenv_path = os.path.join(basedir, '..', '.env')

if not os.path.exists(dotenv_path):
    # Try finding it in current working directory if running from root
    dotenv_path = os.path.join(os.getcwd(), '.env')

print(f"DEBUG: Loading .env from {dotenv_path}, Exists: {os.path.exists(dotenv_path)}")
load_dotenv(dotenv_path)

import urllib.parse

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    
    # Database - Robust handling
    _db_user = os.environ.get('DB_USER')
    _db_password = os.environ.get('DB_PASSWORD')
    _db_host = os.environ.get('DB_HOST', 'localhost')
    _db_name = os.environ.get('DB_NAME', 'youtube_analytics')
    
    if _db_user and _db_password:
        _password_encoded = urllib.parse.quote_plus(_db_password)
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{_db_user}:{_password_encoded}@{_db_host}/{_db_name}"
        print(f"DEBUG: Configured DB URI using split fields. User: {_db_user}")
    else:
        # Fallback to direct URI if provided
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
        print(f"DEBUG: Fallback to DATABASE_URI. Value present: {bool(SQLALCHEMY_DATABASE_URI)}")
        
    if not SQLALCHEMY_DATABASE_URI:
        print("CRITICAL: SQLALCHEMY_DATABASE_URI is None!")
        print(f"Env vars check - DB_USER: {_db_user}, DB_NAME: {_db_name}, DATABASE_URI: {os.environ.get('DATABASE_URI')}")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY')
