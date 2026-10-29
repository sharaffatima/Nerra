from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.workspaces.models import Workspace
from apps.todos.models import Todo, ChecklistItem

User = get_user_model()


class TodoTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        self.ws = Workspace.objects.create(user=self.user, name='Work')
        self.client.force_authenticate(user=self.user)

    def test_create_todo(self):
        res = self.client.post('/api/todos/', {
            'workspace': self.ws.id,
            'title': 'Test todo',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Todo.objects.count(), 1)

    def test_toggle_todo(self):
        todo = Todo.objects.create(workspace=self.ws, title='Toggle me')
        res = self.client.post(f'/api/todos/{todo.id}/toggle/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        todo.refresh_from_db()
        self.assertTrue(todo.completed)

    def test_filter_by_workspace(self):
        ws2 = Workspace.objects.create(user=self.user, name='Work2')
        Todo.objects.create(workspace=self.ws, title='ws1')
        Todo.objects.create(workspace=ws2, title='ws2')
        res = self.client.get(f'/api/todos/?workspace_id={self.ws.id}')
        self.assertEqual(len(res.data['results']), 1)

    def test_create_checklist_item(self):
        todo = Todo.objects.create(workspace=self.ws, title='Checklist todo')
        res = self.client.post(f'/api/todos/{todo.id}/checklist/', {'text': 'Item 1'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ChecklistItem.objects.count(), 1)

    def test_create_todo_with_due_date(self):
        from datetime import timedelta
        from django.utils import timezone
        due = timezone.now() + timedelta(days=3)
        res = self.client.post('/api/todos/', {
            'workspace': self.ws.id,
            'title': 'Due todo',
            'due_date': due.isoformat(),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(res.data['due_date'])

    def test_create_todo_without_due_date(self):
        res = self.client.post('/api/todos/', {
            'workspace': self.ws.id,
            'title': 'No due todo',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res.data['due_date'])
