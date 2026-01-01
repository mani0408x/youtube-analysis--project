import requests
import sys

BASE_URL = "http://localhost:5000"

def test_signup():
    print("Testing Signup...")
    payload = {
        "email": "auto_test_user@example.com",
        "password": "securepassword",
        "name": "Auto Tester"
    }
    try:
        res = requests.post(f"{BASE_URL}/auth/signup", json=payload)
        if res.status_code == 201:
            print("Signup Success:", res.json())
            return True
        elif res.status_code == 409:
            print("User already exists (Success for test purpose)")
            return True
        else:
            print(f"Signup Failed: {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"Signup Exception: {e}")
        return False

def test_login():
    print("Testing Login...")
    payload = {
        "email": "auto_test_user@example.com",
        "password": "securepassword"
    }
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json=payload)
        if res.status_code == 200:
            print("Login Success:", res.json())
            return True
        else:
            print(f"Login Failed: {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"Login Exception: {e}")
        return False

def test_login_page():
    print("Testing Login Page Load...")
    try:
        res = requests.get(f"{BASE_URL}/login")
        if res.status_code == 200:
            print("Login Page Loaded (200 OK)")
            return True
        else:
            print(f"Login Page Failed: {res.status_code}")
            return False
    except Exception as e:
        print(f"Login Page Exception: {e}")
        return False

if __name__ == "__main__":
    if test_login_page() and test_signup() and test_login():
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)
