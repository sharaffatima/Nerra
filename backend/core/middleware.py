import logging
import time

from django.conf import settings

access_logger = logging.getLogger('nerra.access')


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - start) * 1000)
        if request.path.startswith('/static') or request.path.startswith('/admin'):
            return response
        user = getattr(request, 'user', None)
        user_id = user.id if user and user.is_authenticated else 'anon'
        access_logger.info(
            f'{request.method} {request.path} {response.status_code} {duration_ms}ms user={user_id}'
        )
        return response


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not getattr(settings, 'SECURITY_HEADERS_ENABLED', False):
            return response

        csp = getattr(settings, 'CSP_DEFAULTS', {})
        if csp:
            response['Content-Security-Policy'] = '; '.join(
                f"{key} {' '.join(scope.split())}" for key, scope in csp.items()
            )

        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response['X-Content-Type-Options'] = 'nosniff'
        return response