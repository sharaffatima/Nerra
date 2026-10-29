from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class RegisterTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepass123',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_rejects_short_password(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'testuser',
            'password': 'short',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class TokenTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')

    def test_login_returns_tokens(self):
        res = self.client.post('/api/auth/token/', {
            'username': 'testuser',
            'password': 'securepass123',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_rejects_wrong_password(self):
        res = self.client.post('/api/auth/token/', {
            'username': 'testuser',
            'password': 'wrongpassword',
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', password='securepass123')
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'testuser')

    def test_unauthenticated_profile(self):
        self.client.force_authenticate(user=None)
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
