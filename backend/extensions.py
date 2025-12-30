from flask_sqlalchemy import SQLAlchemy
import firebase_admin
from firebase_admin import credentials
import os

db = SQLAlchemy()

def init_firebase():
    if firebase_admin._apps:
        return

    cred_path = os.environ.get('FIREBASE_CREDENTIALS')
    # Resolve relative path if needed (relative to backend/.. or CWD)
    # config.py does similar logic, but here we might need to be careful.
    # We will assume absolute or correct relative path from CWD (root).
    
    if cred_path and os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("INFO: Firebase Admin SDK initialized.")
        except Exception as e:
            print(f"ERROR: Failed to initialize Firebase: {e}")
    else:
        print(f"WARNING: Firebase credentials not found at {cred_path}. Auth will fail.")
