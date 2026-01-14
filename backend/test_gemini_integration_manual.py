import sys
import os
import unittest
import json
from flask import Flask
from unittest.mock import patch, MagicMock

# Setup Logging to File
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_result.txt')
def log(msg):
    with open(log_file, 'a') as f:
        f.write(msg + '\n')

log("Initializing Test Script...")

# Setup Path
current_file = os.path.abspath(__file__)
backend_dir = os.path.dirname(current_file)
project_root = os.path.dirname(backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from backend.services.gemini_ai_service import gemini_bp
    log("Successfully imported gemini_bp")
except Exception as e:
    log(f"Import Error: {e}")
    sys.exit(1)

class TestGeminiIntegration(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.register_blueprint(gemini_bp)
        self.client = self.app.test_client()
        self.payload = {
            "video_topic": "Coding Agents",
            "keywords": ["AI", "Agents"],
            "tone": "Professional",
            "target_audience": "Developers"
        }

    def test_endpoint_reachable(self):
        log("Running test_endpoint_reachable...")
        response = self.client.post('/api/ai/generate-title-description', 
                                    data=json.dumps(self.payload),
                                    content_type='application/json')
        log(f"Status: {response.status_code}")
        if response.status_code != 404:
             log("Result: PASS - Endpoint found")
        else:
             log("Result: FAIL - Endpoint 404")

    @patch('backend.services.gemini_ai_service.genai')
    def test_mock_success(self, mock_genai):
        log("Running test_mock_success...")
        mock_genai.configure = MagicMock()
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = '{"title": "Mock Title", "description": "Mock Description"}'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'TEST_KEY'}):
            response = self.client.post('/api/ai/generate-title-description', 
                                        data=json.dumps(self.payload),
                                        content_type='application/json')
            
            log(f"Mock Response Status: {response.status_code}")
            if response.status_code == 200:
                log("Result: PASS - Mock Success")
            else:
                log(f"Result: FAIL - Status {response.status_code}")

if __name__ == '__main__':
    # Clear log file
    with open(log_file, 'w') as f:
        f.write("Starting Tests\n")
    # Run tests
    unittest.main(exit=False)
    log("Tests Completed")
