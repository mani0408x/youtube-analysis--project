
import sys
import os
import traceback

# Redirect output to file to guarantee capture
with open('debug_search_result.txt', 'w', encoding='utf-8') as f:
    try:
        f.write("Starting Debug Script...\n")
        
        # Add current directory to path
        sys.path.append(os.getcwd())
        f.write(f"CWD: {os.getcwd()}\n")
        
        from flask import Flask
        from backend.config import Config
        from backend.services.youtube_service import search_channels
        
        app = Flask(__name__)
        app.config.from_object(Config)
        
        f.write("Flask App Created and Config Loaded.\n")
        f.write(f"API Key Present: {'Yes' if app.config.get('YOUTUBE_API_KEY') else 'No'}\n")
        if app.config.get('YOUTUBE_API_KEY'):
            k = app.config.get('YOUTUBE_API_KEY')
            f.write(f"API Key (masked): {k[:4]}...{k[-4:]}\n")

        with app.app_context():
            query = "google"
            f.write(f"Searching for: {query}\n")
            
            results = search_channels(query, limit=3)
            
            f.write(f"Results Type: {type(results)}\n")
            f.write(f"Results: {results}\n")
            
    except Exception as e:
        f.write("An error occurred:\n")
        f.write(traceback.format_exc())
        print(f"Error: {e}") # Print to stderr as fallback

print("Debug script finished. Check debug_search_result.txt")
