<<<<<<< HEAD
from backend.app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Ensure instance folder exists for SQLite
    os.makedirs('instance', exist_ok=True)
    app.run(debug=True, port=5000)
=======
import sys
import os

from backend.app import create_app

if __name__ == '__main__':
    try:
        app = create_app()
        print("Starting Flask server on http://localhost:5000")
        app.run(debug=False, port=5000)
    except Exception as e:
        print(f"Server crashed: {e}")
        import traceback
        traceback.print_exc()
        # input("Press Enter to exit...")
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
