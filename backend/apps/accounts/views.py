from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from core.logging import logger
from .emails import send_password_reset_email, send_verification_email
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

signer = TimestampSigner()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if settings.ACCOUNT_EMAIL_VERIFICATION_ENABLED:
            user.is_active = False
            user.save(update_fields=['is_active'])
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = signer.sign(user.username)
            verify_url = f'{settings.FRONTEND_URL}/verify-email/{uid}/{token}'
            send_verification_email(user, verify_url)
            logger.info(f'New user registered (pending verification): {user.username}')
            return Response({
                'user': UserSerializer(user).data,
                'verification_required': True,
            }, status=status.HTTP_201_CREATED)

        refresh = RefreshToken.for_user(user)
        logger.info(f'New user registered: {user.username}')
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK:
            logger.warn(
                f'Failed login attempt: {request.data.get("username", "")}',
                {'view': 'LoginView', 'ip': request.META.get('REMOTE_ADDR')},
            )
            return response

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        if user and not user.password.startswith('nerra_pbkdf2_sha256$'):
            user.set_password(request.data.get('password', ''))
            user.save(update_fields=['password'])
        logger.info(f'User logged in: {user.username}')
        return response


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        if not uid or not token:
            return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid or expired verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            expected_username = signer.unsign(token, max_age=60 * 60 * 24)
        except SignatureExpired:
            return Response({'detail': 'This verification link has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        except BadSignature:
            return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        if expected_username != user.username:
            return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=['is_active'])
        logger.info(f'Email verified: {user.username}')
        return Response({'detail': 'Email verified. You can sign in now.'})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if email:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                user = None
            if user:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = PasswordResetTokenGenerator().make_token(user)
                reset_url = f'{settings.FRONTEND_URL}/reset-password/{uid}/{token}'
                send_password_reset_email(user, reset_url)
        return Response({'detail': 'If an account exists for this email, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')
        if not uid or not token or not password:
            return Response({'detail': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'detail': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.is_active = True
        user.save()
        logger.info(f'Password reset: {user.username}')
        return Response({'detail': 'Password reset successfully. You can sign in now.'})