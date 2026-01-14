import sys
import os
import unittest
from flask import Flask

# File Logging
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_app_result.txt')
def log(msg):
    with open(log_file, 'a') as f:
        f.write(msg + '\n')

log("Starting App Integration Test...")

# Setup Path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from backend.app import create_app
    log("Imported create_app")
except ImportError as e:
    log(f"Import Error: {e}")
    sys.exit(1)

class TestGeminiAppIntegration(unittest.TestCase):
    def setUp(self):
        try:
            self.app = create_app()
            self.app.testing = True
            self.client = self.app.test_client()
            log("App created successfully")
        except Exception as e:
            log(f"App Creation Error: {e}")
            raise e

    def test_blueprint_registered(self):
        log("Running test_blueprint_registered...")
        rules = [str(p) for p in self.app.url_map.iter_rules()]
        found = any('/api/ai/generate-title-description' in r for r in rules)
        if found:
            log("RESULT: PASS - Endpoint found in url_map")
        else:
            log("RESULT: FAIL - Endpoint NOT found in url_map")
            log(f"Available Rules: {rules}")
        self.assertTrue(found)

    def test_endpoint_live(self):
        log("Running test_endpoint_live...")
        # Check for 400 (Bad Request) which validates the route exists and is handled
        try:
            response = self.client.post('/api/ai/generate-title-description', json={})
            log(f"Response Status: {response.status_code}")
            if response.status_code == 400:
                log("RESULT: PASS - Endpoint handled request (400 returned)")
            else:
                log(f"RESULT: FAIL - Unexpected status {response.status_code}")
            self.assertEqual(response.status_code, 400)
        except Exception as e:
            log(f"Request Error: {e}")
            raise e

if __name__ == '__main__':
    with open(log_file, 'w') as f:
        f.write("Init\n")
    unittest.main(exit=False)
    log("Tests Finished")
