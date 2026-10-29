from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TodoViewSet, ChecklistItemViewSet

router = DefaultRouter()
router.register(r'', TodoViewSet, basename='todo')

urlpatterns = [
    path('<int:todo_pk>/checklist/', ChecklistItemViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='todo-checklist-list'),
    path('<int:todo_pk>/checklist/<int:pk>/', ChecklistItemViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='todo-checklist-detail'),
    path('', include(router.urls)),
]
