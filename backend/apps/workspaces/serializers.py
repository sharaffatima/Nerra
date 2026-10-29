from rest_framework import serializers
from .models import Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    todo_count = serializers.SerializerMethodField()
    note_count = serializers.SerializerMethodField()
    reminder_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'icon', 'color', 'position', 'theme_mode',
            'todo_count', 'note_count', 'reminder_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_todo_count(self, obj):
        return obj.todos.count()

    def get_note_count(self, obj):
        return obj.notes.count()

    def get_reminder_count(self, obj):
        return obj.reminders.filter(completed=False).count()

    def validate_position(self, value):
        if value < 0:
            raise serializers.ValidationError('Position cannot be negative.')
        user = self.context['request'].user
        if self.instance:
            max_pos = Workspace.objects.filter(user=user).exclude(pk=self.instance.pk).count()
        else:
            max_pos = Workspace.objects.filter(user=user).count()
        if value > max_pos:
            return max_pos
        return value
