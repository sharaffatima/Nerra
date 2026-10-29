from rest_framework import serializers
from .models import Todo, ChecklistItem


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ['id', 'text', 'checked', 'position']
        read_only_fields = ['id']

    def validate_position(self, value):
        if value < 0:
            raise serializers.ValidationError('Position cannot be negative.')
        return value


class TodoSerializer(serializers.ModelSerializer):
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            'id', 'workspace', 'title', 'description', 'completed', 'position',
            'due_date', 'checklist', 'progress', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_progress(self, obj):
        items = obj.checklist.all()
        if not items.exists():
            return 100 if obj.completed else 0
        checked = items.filter(checked=True).count()
        return round(checked / items.count() * 100)

    def validate_workspace(self, value):
        if value.user != self.context['request'].user:
            raise serializers.ValidationError('Workspace does not belong to you.')
        return value

    def validate_position(self, value):
        if value < 0:
            raise serializers.ValidationError('Position cannot be negative.')
        return value
