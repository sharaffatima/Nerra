from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.workspaces.models import Workspace
from apps.reminders.models import Reminder
from datetime import timedelta

User = get_user_model()


class ReminderTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        self.ws = Workspace.objects.create(user=self.user, name='Work')
        self.client.force_authenticate(user=self.user)

    def test_create_reminder(self):
        future = timezone.now() + timedelta(days=1)
        res = self.client.post('/api/reminders/', {
            'workspace': self.ws.id,
            'title': 'Meeting',
            'reminder_time': future.isoformat(),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reminder.objects.count(), 1)

    def test_reject_past_reminder(self):
        past = timezone.now() - timedelta(hours=1)
        res = self.client.post('/api/reminders/', {
            'workspace': self.ws.id,
            'title': 'Past reminder',
            'reminder_time': past.isoformat(),
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_completed(self):
        future = timezone.now() + timedelta(days=1)
        Reminder.objects.create(workspace=self.ws, title='Done', reminder_time=future, completed=True)
        Reminder.objects.create(workspace=self.ws, title='Pending', reminder_time=future, completed=False)
        res = self.client.get('/api/reminders/?completed=false')
        self.assertEqual(len(res.data['results']), 1)

    def test_toggle_complete(self):
        future = timezone.now() + timedelta(days=1)
        r = Reminder.objects.create(workspace=self.ws, title='Toggle', reminder_time=future)
        res = self.client.patch(f'/api/reminders/{r.id}/', {'completed': True})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        r.refresh_from_db()
        self.assertTrue(r.completed)
