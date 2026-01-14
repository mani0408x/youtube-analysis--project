from backend.app import create_app
from backend.extensions import db
import sqlalchemy

import traceback
import pymysql
from backend.config import Config

def create_database():
    try:
        host = Config._db_host or 'localhost'
        user = Config._db_user or 'root'
        password = Config._db_password
        db_name = Config._db_name or 'youtube_analytics'
        
        print(f"Connecting to MySQL at {host} as {user}...")
        conn = pymysql.connect(host=host, user=user, password=password)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        print(f"Database '{db_name}' ensured.")
        conn.close()
    except Exception as e:
        print(f"Warning: Could not create database automatically: {e}")

def init_database():
    create_database()
    with open('db_init_result.txt', 'w') as log:
        log.write("Startingimport traceback\n")
        try:
            app = create_app()
            log.write("App created.\n")
            with app.app_context():
                log.write("Creating all tables...\n")
                db.create_all()
                log.write("Tables created successfully!\n")
        except Exception as e:
            log.write(f"Error: {e}\n")
            traceback.print_exc(file=log)
            print(f"Error: {e}")

if __name__ == '__main__':
    init_database()
