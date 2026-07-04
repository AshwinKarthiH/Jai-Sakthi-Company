"""
User management views — Manager only
"""
import bcrypt
from datetime import datetime, timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response

from utils.db import get_db
from utils.id_generator import next_user_id
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import IsManager


def _hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _serialize_user(doc: dict) -> dict:
    return {
        "userId": doc.get("userId"),
        "username": doc.get("username"),
        "role": doc.get("role"),
        "isActive": doc.get("isActive", True),
        "createdAt": doc.get("createdAt").isoformat() if doc.get("createdAt") else None,
    }


@api_view(["GET", "POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def users_list(request):
    db = get_db()

    if request.method == "GET":
        docs = list(db.users.find({}, {"password_hash": 0, "_id": 0}))
        return Response([_serialize_user(d) for d in docs])

    if request.method == "POST":
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        role = request.data.get("role", "")
        VALID_ROLES = ["manager", "sales", "production", "inventory", "dispatch"]
        if not username or not password or role not in VALID_ROLES:
            return Response({"error": "username, password, and valid role required."}, status=400)

        if db.users.find_one({"username": username}):
            return Response({"error": "Username already exists."}, status=400)

        now = datetime.now(timezone.utc)
        doc = {
            "userId": next_user_id(),
            "username": username,
            "password_hash": _hash_password(password),
            "role": role,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }
        db.users.insert_one(doc)
        return Response(_serialize_user(doc), status=201)


@api_view(["PATCH", "DELETE"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def user_detail(request, userId):
    db = get_db()
    user = db.users.find_one({"userId": userId})
    if not user:
        return Response({"error": "User not found."}, status=404)

    if request.method == "PATCH":
        updates = {}
        if "username" in request.data:
            new_name = request.data["username"].strip()
            if new_name and new_name != user["username"]:
                if db.users.find_one({"username": new_name}):
                    return Response({"error": "Username already taken."}, status=400)
                updates["username"] = new_name
        if "password" in request.data and request.data["password"]:
            updates["password_hash"] = _hash_password(request.data["password"])
        updates["updatedAt"] = datetime.now(timezone.utc)
        db.users.update_one({"userId": userId}, {"$set": updates})
        updated = db.users.find_one({"userId": userId}, {"password_hash": 0, "_id": 0})
        return Response(_serialize_user(updated))

    if request.method == "DELETE":
        if userId == request.user.user_id:
            return Response({"error": "Cannot delete your own account."}, status=400)
        db.users.delete_one({"userId": userId})
        return Response({"detail": "User deleted."})
