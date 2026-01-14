import sys
import os
from flask import Flask
from backend.services.youtube_service import get_channel_details
from backend.routes.api import process_channel_analysis
from backend.config import Config
from backend.extensions import db

print("Setting up Flask context...")
app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# Use a known valid channel ID (e.g., Google Developers or something generic)
# Google Developers Channel ID: UC_x5XG1OV2P6uZZ5FSM9Ttw
TEST_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw" 

with app.app_context():
    try:
        print(f"Testing get_channel_details for {TEST_CHANNEL_ID}...")
        details = get_channel_details(TEST_CHANNEL_ID)
        print("Channel Details Result:", details)
        
        if details:
            print("\nTesting process_channel_analysis...")
            # Note: This might fail if DB is not reachable or tables missing, but let's see logic error vs db error
            # We mock the DB or just try to run it if DB is expected to be there.
            # actually process_channel_analysis commits to DB.
            try:
                result = process_channel_analysis(TEST_CHANNEL_ID)
                if result and 'error' not in result:
                    print("Analysis Success!")
                    print("Keys:", result.keys())
                else:
                    print("Analysis Failed/Error:", result)
            except Exception as e:
                print(f"Analysis Exception: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("Failed to get channel details (None returned).")
            
    except Exception as e:
        print(f"Test Exception: {e}")
        import traceback
        traceback.print_exc()
