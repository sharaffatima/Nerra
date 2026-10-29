import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.signing import TimestampSigner
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from apps.workspaces.models import Workspace

User = get_user_model()

_PERIOD_SECONDS = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400}


def _seed_throttle_history(scope, ident):
    """Pre-fill a throttle's cache history up to the configured rate."""
    rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'][scope]
    num, period = rate.split('/')
    duration = _PERIOD_SECONDS[period]
    key = f'throttle_{scope}_{ident}'
    cache.set(key, [time.time() - 1] * int(num), duration + 120)
    return key


class InputValidationSecurityTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('owner', password='securepass123')
        self.workspace = Workspace.objects.create(user=self.user, name='Work')
        self.client.force_authenticate(user=self.user)

    def test_register_requires_email(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'noemail',
            'password': 'securepass123',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_with_duplicate_username_rejected(self):
        User.objects.create_user('dup', email='a@example.com', password='securepass123')
        res = self.client.post('/api/auth/register/', {
            'username': 'dup',
            'email': 'b@example.com',
            'password': 'securepass123',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_todo_negative_position_rejected(self):
        res = self.client.post('/api/todos/', {
            'workspace': self.workspace.id,
            'title': 'x',
            'position': -1,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checklist_item_negative_position_rejected(self):
        todo = self.client.post('/api/todos/', {
            'workspace': self.workspace.id,
            'title': 'x',
        }).data
        res = self.client.post(f"/api/todos/{todo['id']}/checklist/", {
            'text': 'step',
            'position': -5,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_note_rejected(self):
        res = self.client.post('/api/notes/', {
            'workspace': self.workspace.id,
            'title': 'x',
            'content': 'a' * 100_001,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transcript_length_cap(self):
        res = self.client.post('/api/voice/extract/', {'transcript': 'a' * 5001})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ThrottlingSecurityTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('throttleuser', password='securepass123')
        cache.clear()

    def test_voice_throttled_after_limit(self):
        self.client.force_authenticate(user=self.user)
        key = _seed_throttle_history('voice', self.user.pk)

        with self.assertLogs('nerra', level='WARNING') as cm:
            res = self.client.post('/api/voice/extract/', {'transcript': 'hello'})
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue(any('throttle' in m.lower() for m in cm.output))

        cache.delete(key)

    def test_login_throttled_after_limit(self):
        ip = '127.0.0.1'
        key = _seed_throttle_history('login', ip)

        with self.assertLogs('nerra', level='WARNING') as cm:
            res = self.client.post('/api/auth/token/', {
                'username': 'throttleuser',
                'password': 'securepass123',
            })
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue(any('throttle' in m.lower() for m in cm.output))

        cache.delete(key)


class EmailVerificationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_requires_verification_then_activates(self):
        from django.conf import settings
        orig = settings.ACCOUNT_EMAIL_VERIFICATION_ENABLED
        try:
            settings.ACCOUNT_EMAIL_VERIFICATION_ENABLED = True

            res = self.client.post('/api/auth/register/', {
                'username': 'vuser',
                'email': 'v@example.com',
                'password': 'securepass123',
            })
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertNotIn('tokens', res.data)
            self.assertTrue(res.data.get('verification_required'))

            user = User.objects.get(username='vuser')
            self.assertFalse(user.is_active)

            signer = TimestampSigner()
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = signer.sign(user.username)

            ok = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token})
            self.assertEqual(ok.status_code, status.HTTP_200_OK)
            user.refresh_from_db()
            self.assertTrue(user.is_active)
        finally:
            settings.ACCOUNT_EMAIL_VERIFICATION_ENABLED = orig

    def test_verify_email_rejects_tampered_token(self):
        res = self.client.post('/api/auth/verify-email/', {'uid': 'abc', 'token': 'tampered'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetSecurityTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('resetuser', email='r@example.com', password='securepass123')

    def test_reset_request_does_not_leak_user_existence(self):
        res = self.client.post('/api/auth/password-reset/', {'email': 'doesnotexist@example.com'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_reset_confirm_rejects_bad_token(self):
        res = self.client.post('/api/auth/password-reset/confirm/', {
            'uid': 'nope',
            'token': 'nope',
            'password': 'NewPassword123',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)