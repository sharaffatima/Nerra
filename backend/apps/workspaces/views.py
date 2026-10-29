from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status

from core.logging import logger
from .models import Workspace
from .serializers import WorkspaceSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        workspace = serializer.save(user=self.request.user)
        logger.info(f'Workspace created: {workspace.name}', {'user': self.request.user.id})

    def perform_update(self, serializer):
        workspace = serializer.save()
        logger.info(f'Workspace updated: {workspace.name}', {'user': self.request.user.id})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        self.perform_destroy(instance)
        logger.info(f'Workspace deleted: {name}', {'user': request.user.id})
        return Response(status=status.HTTP_204_NO_CONTENT)
