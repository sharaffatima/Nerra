from django.db import models
from django.conf import settings
from apps.workspaces.models import Workspace


class Reminder(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='reminders')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    reminder_time = models.DateTimeField()
    completed = models.BooleanField(default=False)
    repeat = models.CharField(
        max_length=10,
        choices=[
            ('none', 'None'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
        ],
        default='none',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reminder_time']

    def __str__(self):
        return self.title
