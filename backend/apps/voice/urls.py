from django.urls import path

from .views import VoiceExtractView

urlpatterns = [
    path('extract/', VoiceExtractView.as_view()),
]