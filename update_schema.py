from backend.app import create_app
from backend.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Add password_hash
        print("Adding password_hash column...")
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE user ADD COLUMN password_hash VARCHAR(255) NULL"))
            conn.commit()
        print("password_hash added.")
    except Exception as e:
        print(f"Error adding password_hash (might already exist): {e}")

    try:
        # Make firebase_uid nullable
        print("Modifying firebase_uid column...")
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE user MODIFY COLUMN firebase_uid VARCHAR(128) NULL"))
            conn.commit()
        print("firebase_uid modified.")
    except Exception as e:
        print(f"Error modifying firebase_uid: {e}")
