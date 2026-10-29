import os

from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('apps.accounts.urls')),
    path('api/workspaces/', include('apps.workspaces.urls')),
    path('api/todos/', include('apps.todos.urls')),
    path('api/notes/', include('apps.notes.urls')),
    path('api/reminders/', include('apps.reminders.urls')),
    path('api/voice/', include('apps.voice.urls')),
]

if os.environ.get('DJANGO_ADMIN_ENABLED', 'true').lower() == 'true':
    from django.contrib import admin

    urlpatterns.insert(0, path('admin/', admin.site.urls))