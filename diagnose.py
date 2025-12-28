import sys
import traceback

with open('error_log.txt', 'w') as log_file:
    try:
        import init_db
        print("Import successful", file=log_file)
        init_db.init_database()
        print("Execution successful", file=log_file)
    except Exception:
        traceback.print_exc(file=log_file)
