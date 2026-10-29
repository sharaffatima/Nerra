import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403, F405

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')  # noqa: F405

if SECRET_KEY.startswith('django-insecure') or not SECRET_KEY or len(SECRET_KEY) < 40:  # noqa: F405
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY must be set to a strong random value '
        '(40+ chars) in production.'
    )

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '15552000'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURITY_HEADERS_ENABLED = True

ACCOUNT_EMAIL_VERIFICATION_ENABLED = (
    os.environ.get('ACCOUNT_EMAIL_VERIFICATION', 'true').lower() in ('1', 'true', 'yes')
)