import requests
import sys

def test_suggestions(query):
    url = f"http://127.0.0.1:5000/api/suggestions?q={query}"
    try:
        print(f"Testing URL: {url}")
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {data}")
            if len(data) > 0:
                print("SUCCESS: Found suggestions")
            else:
                print("WARNING: No suggestions found (but API worked)")
        else:
            print(f"ERROR: API failed with {response.text}")
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        q = sys.argv[1]
    else:
        q = "mrbeast" # Default likely to have results
    test_suggestions(q)
