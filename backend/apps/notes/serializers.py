import json
from rest_framework import serializers
from .models import Note


class TagsField(serializers.Field):
    def to_representation(self, value):
        return value or []

    def to_internal_value(self, data):
        if isinstance(data, list):
            return [str(t).strip() for t in data if str(t).strip()]
        if isinstance(data, str):
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    return [str(t).strip() for t in parsed if str(t).strip()]
            except (json.JSONDecodeError, TypeError):
                pass
            return [data.strip()] if data.strip() else []
        raise serializers.ValidationError('Tags must be a list.')


class NoteSerializer(serializers.ModelSerializer):
    tags = TagsField(required=False, default=[])

    class Meta:
        model = Note
        fields = ['id', 'workspace', 'title', 'content', 'tags', 'pinned', 'position', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_workspace(self, value):
        if value.user != self.context['request'].user:
            raise serializers.ValidationError('Workspace does not belong to you.')
        return value

    def validate_position(self, value):
        if value < 0:
            raise serializers.ValidationError('Position cannot be negative.')
        return value

    def validate_content(self, value):
        if value and len(value) > 100_000:
            raise serializers.ValidationError('Note content is too long.')
        return value
