from rest_framework import viewsets, permissions

from core.logging import logger
from core.permissions import IsOwner
from .models import Reminder
from .serializers import ReminderSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = Reminder.objects.filter(workspace__user=self.request.user)
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        show_completed = self.request.query_params.get('completed')
        if show_completed is not None:
            qs = qs.filter(completed=show_completed.lower() == 'true')
        return qs

    def perform_create(self, serializer):
        reminder = serializer.save()
        logger.info(f'Reminder created: {reminder.title}', {'user': self.request.user.id})
