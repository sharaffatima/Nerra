import logging
from typing import Any


class AsyncLogger:
    def __init__(self, name: str = 'nerra'):
        self._logger = logging.getLogger(name)

    def _log(self, level: str, message: str, context: dict[str, Any] | None = None):
        extra_str = f' | {context}' if context else ''
        getattr(self._logger, level)(f'{message}{extra_str}')

    def error(self, message: str, context: dict[str, Any] | None = None):
        self._log('error', message, context)

    def warn(self, message: str, context: dict[str, Any] | None = None):
        self._log('warning', message, context)

    def info(self, message: str, context: dict[str, Any] | None = None):
        self._log('info', message, context)


logger = AsyncLogger()
