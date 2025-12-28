import os
import sys
import traceback

with open('test_result.txt', 'w') as f:
    f.write(f"Python: {sys.executable}\n")
    f.write(f"CWD: {os.getcwd()}\n")

    try:
        from dotenv import load_dotenv
        f.write("Loading dotenv...\n")
        basedir = os.path.abspath(os.path.dirname(__file__))
        load_dotenv(os.path.join(basedir, '.env'))
        f.write(f"DB_USER: {os.environ.get('DB_USER')}\n")
        f.write(f"DATABASE_URI: {os.environ.get('DATABASE_URI')}\n")
        
        import flask
        f.write(f"Flask version: {flask.__version__}\n")
        
        import flask_sqlalchemy
        f.write("SQLAlchemy imported\n")
        
        import pymysql
        f.write("PyMySQL imported\n")
        
    except Exception as e:
        f.write(f"ERROR: {e}\n")
        traceback.print_exc(file=f)
