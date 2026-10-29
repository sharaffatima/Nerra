from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import Throttled

from core.logging import logger


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        logger.warn(
            f'Throttled: {exc}',
            {'view': str(context.get('view', '')), 'detail': getattr(response, 'data', None)},
        )
        return response

    if response is not None:
        logger.error(f'API Error: {exc}', {'view': str(context.get('view', ''))})
    else:
        logger.error(f'Unhandled Exception: {exc}', {'view': str(context.get('view', ''))})
        response = Response(
            {'detail': 'Internal server error.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response