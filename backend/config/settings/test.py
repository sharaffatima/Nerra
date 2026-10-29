from .base import *  # noqa: F401, F403

DEBUG = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # test runner overrides this automatically
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Generous throttle rates so the full suite never trips global limits.
# Dedicated throttle-behavior tests override these locally.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'anon': '100000/hour',
        'user': '100000/hour',
        'login': '100000/hour',
        'voice': '100000/hour',
    },
}