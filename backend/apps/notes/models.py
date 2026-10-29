from django.db import models
from django.conf import settings
from apps.workspaces.models import Workspace


class Note(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    pinned = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-pinned', 'position']
        constraints = [
            models.CheckConstraint(condition=models.Q(position__gte=0), name='note_position_ge_0'),
        ]

    def __str__(self):
        return self.title
