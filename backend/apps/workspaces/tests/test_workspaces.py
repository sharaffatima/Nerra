from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.workspaces.models import Workspace

User = get_user_model()


class WorkspaceTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        self.client.force_authenticate(user=self.user)

    def test_create_workspace(self):
        res = self.client.post('/api/workspaces/', {'name': 'My Workspace'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'My Workspace')
        self.assertEqual(Workspace.objects.count(), 1)

    def test_list_own_workspaces_only(self):
        Workspace.objects.create(user=self.user, name='Mine')
        other = User.objects.create_user('other', password='securepass123')
        Workspace.objects.create(user=other, name='Theirs')
        res = self.client.get('/api/workspaces/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['name'], 'Mine')

    def test_update_workspace(self):
        ws = Workspace.objects.create(user=self.user, name='Old Name')
        res = self.client.patch(f'/api/workspaces/{ws.id}/', {'name': 'New Name'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ws.refresh_from_db()
        self.assertEqual(ws.name, 'New Name')

    def test_delete_workspace(self):
        ws = Workspace.objects.create(user=self.user, name='To Delete')
        res = self.client.delete(f'/api/workspaces/{ws.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Workspace.objects.count(), 0)

    def test_cannot_access_others_workspace(self):
        other = User.objects.create_user('other', password='securepass123')
        ws = Workspace.objects.create(user=other, name="Other's")
        res = self.client.get(f'/api/workspaces/{ws.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
