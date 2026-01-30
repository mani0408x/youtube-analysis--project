import sys
import os
from backend.app import create_app

# Create app at module level so Gunicorn can find it
app = create_app()

if __name__ == '__main__':
    try:
        # Ensure instance folder exists for SQLite
        os.makedirs('backend/instance', exist_ok=True)
        
        print("Starting Flask server...")
        # Bind to 0.0.0.0 and use PORT env var for Render support
        port = int(os.environ.get("PORT", 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        print(f"Server crashed: {e}")
        import traceback
        traceback.print_exc()
