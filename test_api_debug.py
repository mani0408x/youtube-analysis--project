import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_analyze():
    print("Testing /analyze...")
    # Using a known channel ID (e.g., Google Developers: UC_x5XG1OV2P6uZZ5FSM9Ttw)
    # But since I don't know real IDs, I'll rely on the mock or service if it fetches real data. 
    # The app seems to use real YouTube API? The logs implied it.
    # Let's try sending a dummy one valid-ish ID or check what the service does.
    # If the service requires real API keys and valid IDs, I might get 404 or 500.
    # But I want to see if I get a RESPONSE, not a network error.
    
    try:
        res = requests.post(f"{BASE_URL}/analyze", json={"channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw"})
        print(f"Analyze Status: {res.status_code}")
        print(f"Analyze Response: {res.text[:100]}...")
    except Exception as e:
        print(f"Analyze Failed: {e}")

def test_compare():
    print("\nTesting /compare...")
    try:
        # Test with the new list format
        payload = {"channel_ids": ["UC_x5XG1OV2P6uZZ5FSM9Ttw", "UC-lHJZR3Gqxm24_Vd_AJ5Yw"]}
        res = requests.post(f"{BASE_URL}/compare", json=payload)
        print(f"Compare Status: {res.status_code}")
        print(f"Compare Response: {res.text[:100]}...")
    except Exception as e:
        print(f"Compare Failed: {e}")

if __name__ == "__main__":
    test_analyze()
    test_compare()
