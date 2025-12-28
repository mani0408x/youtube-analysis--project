import sys
import os

print(f"CWD: {os.getcwd()}", flush=True)
print(f"Path: {sys.path}", flush=True)

try:
    print("Attempting to import backend...", flush=True)
    import backend
    print("Success: backend", flush=True)

    print("Attempting to import backend.extensions...", flush=True)
    from backend import extensions
    print("Success: backend.extensions", flush=True)

    print("Attempting to import backend.models...", flush=True)
    from backend import models
    print("Success: backend.models", flush=True)
    
    print("Attempting to import backend.routes.auth...", flush=True)
    from backend.routes import auth
    print("Success: backend.routes.auth", flush=True)

    print("Attempting to import backend.app...", flush=True)
    from backend import app
    print("Success: backend.app", flush=True)

except Exception as e:
    print(f"\nCRITICAL ERROR: {type(e).__name__}: {e}", flush=True)
    import traceback
    traceback.print_exc()
