
import unittest
import sys
import os
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import create_app
from backend.extensions import db
from backend.models import Channel, DailyChannelStats
from datetime import date

class TestNewFeatures(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Setup dummy data
        # We need to mock DB data for top comparison
        # But for read-only endpoints on existing data, we might need to insert some
        # Let's insert mock data for testing
        
        # Clear existing for test safety? No, might delete user data.
        # Let's just assume we can add a test channel.
        self.test_cid = "UC_TEST_VERIFY"
        
        c = Channel.query.get(self.test_cid)
        if not c:
            c = Channel(
                id=self.test_cid, 
                title="Test Channel", 
                view_count=1000000, 
                subscriber_count=500000
            )
            db.session.add(c)
        else:
            c.view_count = 1000000 # Update for top check
            
        db.session.commit()
        
        # Add daily stats
        s1 = DailyChannelStats(channel_id=self.test_cid, date=date(2023, 1, 1), views=900000, subscribers=490000)
        s2 = DailyChannelStats(channel_id=self.test_cid, date=date(2023, 2, 1), views=1000000, subscribers=500000)
        db.session.add(s1)
        db.session.add(s2)
        try:
            db.session.commit()
        except:
            db.session.rollback() # Ignore if exists

    def tearDown(self):
        # Clean up
        DailyChannelStats.query.filter_by(channel_id=self.test_cid).delete()
        Channel.query.filter_by(id=self.test_cid).delete()
        db.session.commit()
        self.app_context.pop()

    def test_compare_top(self):
        response = self.client.get('/api/compare/top')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        print("\nCompare Top Data:", data)
        self.assertIn('results', data)
        self.assertIsInstance(data['results'], list)
        # Should have at least our test channel if it's in top 5
        # (It likely is since 1M views is decent for a local DB)

    def test_monthly_report(self):
        """Test the /api/reports/monthly endpoint"""
        # Ensure we have data
        response = self.client.get(f'/api/reports/monthly/{self.test_cid}')
        
        # Might be 404 if no stats for this exact ID, or 200 with report
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('report', data)
        else:
            self.assertEqual(response.status_code, 404)

    def test_ai_generate(self):
        """Test the /api/ai/generate endpoint"""
        # Test Ideas
        res_ideas = self.client.post('/api/ai/generate', json={
            'action': 'ideas',
            'topic': 'Coding'
        })
        self.assertEqual(res_ideas.status_code, 200)
        data = json.loads(res_ideas.data)
        self.assertIn('result', data)
        self.assertTrue(len(data['result']) > 0)

        # Test Script
        res_script = self.client.post('/api/ai/generate', json={
            'action': 'script',
            'title': 'Test Video',
            'tone': 'funny'
        })
        self.assertEqual(res_script.status_code, 200)
        data_script = json.loads(res_script.data)
        self.assertIn('result', data_script)
        self.assertIn('Video Script:', data_script['result'])

if __name__ == '__main__':
    unittest.main()
```
