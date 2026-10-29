from rest_framework import serializers
from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = [
            'id', 'workspace', 'title', 'description', 'reminder_time',
            'completed', 'repeat', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_workspace(self, value):
        if value.user != self.context['request'].user:
            raise serializers.ValidationError('Workspace does not belong to you.')
        return value

    def validate_reminder_time(self, value):
        from django.utils import timezone
        if value < timezone.now():
            raise serializers.ValidationError('Reminder time must be in the future.')
        return value
