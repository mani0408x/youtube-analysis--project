import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['YOUTUBE_API_KEY'] = os.getenv('YOUTUBE_API_KEY')

log_file = os.path.join(os.path.dirname(__file__), '..', 'debug_log.txt')

def log(msg):
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(str(msg) + '\n')
    print(msg)

# Clear log
with open(log_file, 'w') as f:
    f.write("Starting Log...\n")

log(f"API KEY Present: {bool(app.config['YOUTUBE_API_KEY'])}")
if app.config['YOUTUBE_API_KEY']:
    log(f"API KEY Length: {len(app.config['YOUTUBE_API_KEY'])}")

try:
    with app.app_context():
        from backend.services.youtube_service import resolve_channel_input
        
        log("--- Testing resolve_channel_input('PewDiePie') ---")
        result = resolve_channel_input('PewDiePie')
        log(f"Result Type: {type(result)}")
        log(f"Result: {result}")
        
        if isinstance(result, list) and len(result) > 0:
            log(f"Success! Found ID: {result[0]['id']}")
        elif isinstance(result, str):
            log(f"Success! Resolved ID: {result}")
        else:
            log("FAILURE: No valid result found.")

except Exception as e:
    log(f"CRITICAL EXCEPTION: {e}")
    import traceback
    traceback.print_exc(file=open(log_file, 'a'))
