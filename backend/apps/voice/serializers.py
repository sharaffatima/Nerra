from rest_framework import serializers


class TranscriptSerializer(serializers.Serializer):
    transcript = serializers.CharField(min_length=1, max_length=5000)