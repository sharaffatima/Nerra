from django.db.models import Q
from rest_framework import viewsets, permissions

from core.logging import logger
from core.permissions import IsOwner
from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = Note.objects.filter(workspace__user=self.request.user)
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        tag = self.request.query_params.get('tag')
        if tag:
            notes = list(qs)
            qs = Note.objects.filter(pk__in=[n.pk for n in notes if tag in (n.tags or [])])
            if workspace_id:
                qs = qs.filter(workspace_id=workspace_id)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))
        return qs

    def perform_create(self, serializer):
        note = serializer.save()
        logger.info(f'Note created: {note.title}', {'user': self.request.user.id})
