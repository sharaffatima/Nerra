from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.logging import logger
from core.permissions import IsOwner
from .models import Todo, ChecklistItem
from .serializers import TodoSerializer, ChecklistItemSerializer


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = Todo.objects.filter(workspace__user=self.request.user)
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs

    def perform_create(self, serializer):
        todo = serializer.save()
        logger.info(f'Todo created: {todo.title}', {'user': self.request.user.id})

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle(self, request, pk=None):
        todo = self.get_object()
        todo.completed = not todo.completed
        todo.save()
        return Response(TodoSerializer(todo).data)

    @action(detail=True, methods=['post'], url_path='reorder')
    def reorder(self, request, pk=None):
        todo = self.get_object()
        new_position = request.data.get('position')
        if new_position is not None:
            todo.position = new_position
            todo.save()
        return Response(TodoSerializer(todo).data)


class ChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChecklistItem.objects.filter(
            todo__workspace__user=self.request.user,
            todo_id=self.kwargs['todo_pk'],
        )

    def perform_create(self, serializer):
        serializer.save(todo_id=self.kwargs['todo_pk'])
