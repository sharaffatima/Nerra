from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.workspaces.models import Workspace
from apps.notes.models import Note

User = get_user_model()


class NoteTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        self.ws = Workspace.objects.create(user=self.user, name='Work')
        self.client.force_authenticate(user=self.user)

    def test_create_note_with_tags(self):
        import json
        res = self.client.post(
            '/api/notes/',
            {'workspace': self.ws.id, 'title': 'Test note', 'content': 'Hello', 'tags': json.dumps(['python', 'django'])},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['tags'], ['python', 'django'])

    def test_filter_by_tag(self):
        Note.objects.create(workspace=self.ws, title='N1', tags=['python'])
        Note.objects.create(workspace=self.ws, title='N2', tags=['js'])
        res = self.client.get(f'/api/notes/?workspace_id={self.ws.id}&tag=python')
        self.assertEqual(len(res.data['results']), 1)

    def test_search_notes(self):
        Note.objects.create(workspace=self.ws, title='Django Guide')
        Note.objects.create(workspace=self.ws, title='React Basics')
        res = self.client.get('/api/notes/?search=django')
        self.assertEqual(len(res.data['results']), 1)

    def test_pin_note(self):
        note = Note.objects.create(workspace=self.ws, title='Pin me')
        res = self.client.patch(f'/api/notes/{note.id}/', {'pinned': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertTrue(note.pinned)
