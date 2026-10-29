from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from django.utils import timezone

from core.logging import logger
from .serializers import TranscriptSerializer
from .services import extract_items, VoiceExtractionError


class VoiceExtractView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'voice'

    def post(self, request):
        serializer = TranscriptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transcript = serializer.validated_data['transcript']
        try:
            items = extract_items(transcript, timezone.now())
        except VoiceExtractionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        logger.info(f'Voice extraction for user {request.user.id}: {len(items)} items')
        return Response({'items': items})