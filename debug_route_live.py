
import requests
import traceback

with open('debug_route_out.txt', 'w') as f:
    try:
        f.write("Sending request to live server...\n")
        res = requests.get('http://localhost:5000/api/suggestions?q=test_log_entry', timeout=5)
        f.write(f"Status Code: {res.status_code}\n")
        f.write(f"Response: {res.text[:100]}\n")
    except Exception as e:
        f.write(f"Request failed: {e}\n")
        f.write(traceback.format_exc())
