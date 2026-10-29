from django.db import models
from django.conf import settings


class Workspace(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workspaces')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='folder')
    color = models.CharField(max_length=7, default='#6750A4')
    position = models.PositiveIntegerField(default=0)
    theme_mode = models.CharField(
        max_length=10,
        choices=[('light', 'Light'), ('dark', 'Dark')],
        default='light',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
        verbose_name_plural = 'workspaces'
        constraints = [
            models.CheckConstraint(condition=models.Q(position__gte=0), name='workspace_position_ge_0'),
        ]

    def __str__(self):
        return self.name
