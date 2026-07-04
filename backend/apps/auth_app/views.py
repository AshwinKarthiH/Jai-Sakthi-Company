import os
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

load_dotenv()


def get_db():
    client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    return client[os.getenv("MONGO_DB_NAME", "jaisakthi_erp")]


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()
    user = db.users.find_one({"username": username})

    if not user:
        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    pw_bytes = password.encode("utf-8")
    hash_bytes = user["password_hash"].encode("utf-8")
    if not bcrypt.checkpw(pw_bytes, hash_bytes):
        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Embed role + username into JWT payload
    refresh = RefreshToken()
    refresh["user_id"] = user["userId"]
    refresh["username"] = user["username"]
    refresh["role"] = user["role"]

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "userId": user["userId"],
            "username": user["username"],
            "role": user["role"],
        },
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
def me_view(request):
    token = request.auth
    return Response({
        "userId":   token.get("user_id"),
        "username": token.get("username"),
        "role":     token.get("role"),
    })
