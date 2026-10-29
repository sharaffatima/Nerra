from unittest.mock import patch, Mock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.workspaces.models import Workspace
from apps.voice import services

User = get_user_model()


def _mock_groq_response(content):
    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {'choices': [{'message': {'content': content}}]}
    return resp


class VoiceExtractTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        Workspace.objects.create(user=self.user, name='Work')
        self.client.force_authenticate(user=self.user)

    @patch.object(services, 'requests')
    @patch.dict('apps.voice.services.os.environ', {'GROQ_API_KEY': 'test-key'}, clear=False)
    def test_extract_returns_structured_items(self, mock_requests):
        mock_requests.post.return_value = _mock_groq_response(
            '{"items": [{"type": "todo", "title": "Buy groceries", "description": null, '
            '"due_date": "2026-09-09T18:00:00", "reminder_time": null, "repeat": "none"}, '
            '{"type": "reminder", "title": "Call mom tomorrow", "description": "At 5pm", '
            '"reminder_time": "2026-09-09T17:00:00", "repeat": "none"}]}'
        )
        res = self.client.post('/api/voice/extract/', {'transcript': 'I need to buy groceries and remind me to call mom tomorrow at 5.'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data['items']
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]['type'], 'todo')
        self.assertEqual(items[0]['due_date'], '2026-09-09T18:00:00')
        self.assertEqual(items[1]['type'], 'reminder')
        self.assertEqual(items[1]['repeat'], 'none')

    @patch.object(services, 'requests')
    @patch.dict('apps.voice.services.os.environ', {'GROQ_API_KEY': 'test-key'}, clear=False)
    def test_extract_handles_code_fenced_json(self, mock_requests):
        mock_requests.post.return_value = _mock_groq_response(
            '```json\n{"items": [{"type": "todo", "title": "Fix bike", "due_date": null}]}\n```'
        )
        res = self.client.post('/api/voice/extract/', {'transcript': 'I need to fix my bike'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['items'][0]['title'], 'Fix bike')

    @patch.object(services, 'requests')
    @patch.dict('apps.voice.services.os.environ', {'GROQ_API_KEY': 'test-key'}, clear=False)
    def test_extract_normalizes_bad_items(self, mock_requests):
        mock_requests.post.return_value = _mock_groq_response(
            '{"items": [{"type": "reminder", "title": "Team standup", "reminder_time": "not-a-date", "repeat": "daily"}, '
            '{"type": "whatever", "title": ""}, {"type": "todo", "title": "OK", "due_date": "2026-09-10"}]}'
        )
        res = self.client.post('/api/voice/extract/', {'transcript': 'testing'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data['items']
        self.assertEqual(len(items), 2)
        self.assertIsNone(items[0]['reminder_time'])
        self.assertEqual(items[0]['repeat'], 'daily')
        self.assertEqual(items[1]['due_date'], '2026-09-10T00:00:00')

    @patch.object(services, 'requests')
    @patch.dict('apps.voice.services.os.environ', {'GROQ_API_KEY': 'test-key'}, clear=False)
    def test_extract_falls_back_to_todo_for_unknown_type(self, mock_requests):
        mock_requests.post.return_value = _mock_groq_response(
            '{"items": [{"type": "event", "title": "Party", "due_date": "2026-09-11T19:00:00"}]}'
        )
        res = self.client.post('/api/voice/extract/', {'transcript': 'party next week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['items'][0]['type'], 'todo')

    @patch.object(services, 'requests')
    @patch.dict('apps.voice.services.os.environ', {'GROQ_API_KEY': 'test-key'}, clear=False)
    def test_extract_garbage_model_output(self, mock_requests):
        mock_requests.post.return_value = _mock_groq_response('totally not json')
        res = self.client.post('/api/voice/extract/', {'transcript': 'whatever'})
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_extract_missing_api_key(self):
        with patch.dict(services.os.environ, {'GROQ_API_KEY': ''}, clear=False):
            res = self.client.post('/api/voice/extract/', {'transcript': 'test'})
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_extract_requires_auth(self):
        self.client.force_authenticate(user=None)
        res = self.client.post('/api/voice/extract/', {'transcript': 'test'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_extract_validates_transcript(self):
        res = self.client.post('/api/voice/extract/', {'transcript': ''})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)