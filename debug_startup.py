import sys
import os

print("Starting debug_startup.py...")
try:
    print("Importing flask...")
    import flask
    print(f"Flask version: {flask.__version__}")
    
    print("Importing backend.app...")
    from backend.app import create_app
    print("backend.app imported.")
    
    print("Creating app...")
    app = create_app()
    print("App created.")
    
except Exception as e:
    print(f"CRITICAL FAUILURE: {e}")
    import traceback
    traceback.print_exc()

print("Debug finished.")
