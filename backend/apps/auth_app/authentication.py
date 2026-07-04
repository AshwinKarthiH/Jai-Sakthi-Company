"""
Custom JWT authentication that reads user info from the JWT payload
and stores it on request.user_data / request.user_role.
We don't use Django's User model — all users live in MongoDB.
"""
import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class MongoUser:
    """Minimal user object attached to request.user"""

    def __init__(self, payload):
        self.user_id = payload.get("user_id")
        self.username = payload.get("username")
        self.role = payload.get("role")
        self.is_authenticated = True

    def __str__(self):
        return self.username or ""


class MongoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token.")

        user = MongoUser(payload)
        # Attach role directly to request for permission classes
        request.user_role = user.role
        return (user, token)
