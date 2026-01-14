import sys
import os
import traceback

# Setup distinct log file
LOG_FILE = "analysis_internal_log.txt"

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")
    print(msg)

log("Starting test_analysis_file_log.py")

try:
    log("Importing flask...")
    from flask import Flask
    
    log("Importing services...")
    from backend.services.youtube_service import get_channel_details
    from backend.routes.api import process_channel_analysis
    from backend.config import Config
    from backend.extensions import db

    log("Creating app...")
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    TEST_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw" 

    with app.app_context():
        log(f"Testing get_channel_details for {TEST_CHANNEL_ID}...")
        try:
            details = get_channel_details(TEST_CHANNEL_ID)
            log(f"Details found: {bool(details)}")
            if details:
                log(f"Title: {details.get('title')}")
            else:
                log("Details is None.")
        except Exception as e:
            log(f"get_channel_details ERROR: {e}")
            log(traceback.format_exc())

        if details:
            log("Testing process_channel_analysis...")
            try:
                # This might try touching the DB
                result = process_channel_analysis(TEST_CHANNEL_ID)
                log(f"Process Result keys: {result.keys() if result else 'None'}")
                if result and 'error' in result:
                    log(f"Process Error: {result['error']}")
            except Exception as e:
                log(f"process_channel_analysis ERROR: {e}")
                log(traceback.format_exc())

except Exception as e:
    log(f"CRITICAL SETUP ERROR: {e}")
    log(traceback.format_exc())

log("Test finished.")
