from django.contrib.auth.hashers import PBKDF2PasswordHasher


class NerraPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    algorithm = 'nerra_pbkdf2_sha256'
    iterations = 600_000