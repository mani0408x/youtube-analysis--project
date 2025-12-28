import os

env_content = """# Database Configuration (New Format)
DB_USER=root
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_NAME=youtube_analytics

# Legacy (Commented out)
# DATABASE_URI=...

# Flask
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev_secret_key_change_this

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
OAUTHLIB_INSECURE_TRANSPORT=1
"""

print("Writing new .env template to .env.new")
with open('.env.new', 'w') as f:
    f.write(env_content)

print("Please open '.env.new', fill in your details (especially DB_PASSWORD), and then rename it to '.env'.")
