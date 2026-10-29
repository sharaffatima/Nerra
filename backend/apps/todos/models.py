from django.db import models
from django.conf import settings
from apps.workspaces.models import Workspace


class Todo(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='todos')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
        constraints = [
            models.CheckConstraint(condition=models.Q(position__gte=0), name='todo_position_ge_0'),
        ]

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='checklist')
    text = models.CharField(max_length=200)
    checked = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']
        constraints = [
            models.CheckConstraint(condition=models.Q(position__gte=0), name='checklistitem_position_ge_0'),
        ]

    def __str__(self):
        return self.text
