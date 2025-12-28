import sys
import traceback

with open('import_check.txt', 'w') as f:
    f.write(f"Python: {sys.executable}\n")
    try:
        f.write("Importing isodate...\n")
        import isodate
        f.write("Success.\n")
        
        f.write("Importing pymysql...\n")
        import pymysql
        f.write("Success.\n")
        
        f.write("Importing backend.config...\n")
        from backend.config import Config
        f.write("Success.\n")

        f.write("Importing backend.app.create_app...\n")
        from backend.app import create_app
        f.write("Success.\n")
        
    except Exception as e:
        f.write(f"ERROR: {e}\n")
        traceback.print_exc(file=f)
