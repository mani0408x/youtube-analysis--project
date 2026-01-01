import unittest
from unittest.mock import patch, MagicMock
from backend.app import create_app
from backend.models import User, db

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['GOOGLE_CLIENT_ID'] = 'mock-client-id'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @patch('backend.routes.auth.id_token.verify_oauth2_token')
    def test_verify_user_success(self, mock_verify):
        # Mock successful token verification
        mock_verify.return_value = {
            'sub': '12345',
            'email': 'test@example.com',
            'name': 'Test User',
            'picture': 'http://example.com/pic.jpg'
        }

        response = self.client.post('/auth/verify', json={'token': 'valid-token'})
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['user']['email'], 'test@example.com')

        # Verify user created in DB
        with self.app.app_context():
            user = User.query.filter_by(email='test@example.com').first()
            self.assertIsNotNone(user)
            self.assertEqual(user.firebase_uid, '12345')

    @patch('backend.routes.auth.id_token.verify_oauth2_token')
    def test_verify_user_invalid_token(self, mock_verify):
         # Mock failed verification (ValueError)
        mock_verify.side_effect = ValueError("Invalid token")

        response = self.client.post('/auth/verify', json={'token': 'invalid-token'})
        
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertEqual(data['error'], 'Invalid Token')

if __name__ == '__main__':
    unittest.main()
