from django.conf import settings
from django.core.mail import send_mail


def send_verification_email(user, verify_url):
    send_mail(
        'Verify your Nerra account',
        f'Hi {user.username},\n\n'
        f'Please confirm your email to finish creating your account:\n{verify_url}\n\n'
        'This link expires in 24 hours. If you did not create a Nerra account, you can ignore this email.',
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, reset_url):
    send_mail(
        'Reset your Nerra password',
        f'Hi {user.username},\n\n'
        f'We received a request to reset your password:\n{reset_url}\n\n'
        'If you did not request this, you can safely ignore this email.',
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )