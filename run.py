import sys
import os
from backend.app import create_app

if __name__ == '__main__':
    try:
        # Ensure instance folder exists for SQLite
        os.makedirs('backend/instance', exist_ok=True)
        
        app = create_app()
        print("Starting Flask server on http://localhost:5000")
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"Server crashed: {e}")
        import traceback
        traceback.print_exc()
        # input("Press Enter to exit...")
