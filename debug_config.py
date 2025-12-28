import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url

load_dotenv()

uri = os.environ.get('DATABASE_URI')
print(f"Raw URI (masked): {uri[:10]}...***" if uri else "URI is None")

try:
    if uri:
        u = make_url(uri)
        print(f"Drivername: {u.drivername}")
        print(f"Username: {u.username}")
        print(f"Password: {'***' if u.password else 'None'}")
        print(f"Host: {u.host}")
        print(f"Port: {u.port}")
        print(f"Database: {u.database}")
    else:
        print("DATABASE_URI not found in environment.")
except Exception as e:
    print(f"Error parsing URI: {e}")
