"""
Messages (inbox) views
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from utils.db import get_db
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import IsAnyRole, IsManager


def _serialize_msg(doc: dict) -> dict:
    created_at = doc.get("createdAt")
    # Convert datetime to ms timestamp for frontend compatibility
    if created_at and hasattr(created_at, "timestamp"):
        ts = int(created_at.timestamp() * 1000)
    else:
        ts = 0
    return {
        "id": doc.get("messageId"),
        "messageId": doc.get("messageId"),
        "from": doc.get("from"),
        "to": doc.get("to"),
        "text": doc.get("text"),
        "timestamp": ts,
        "createdAt": created_at.isoformat() if created_at and hasattr(created_at, "isoformat") else None,
        "orderId": doc.get("orderId"),
        "poNumber": doc.get("poNumber"),
        "isRead": doc.get("isRead", False),
    }


@api_view(["GET"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def inbox_view(request):
    """Return messages for the requesting user's role, sorted newest first."""
    db = get_db()
    role = request.user_role
    msgs = list(db.messages.find({"to": role}, {"_id": 0}).sort("createdAt", -1))
    return Response([_serialize_msg(m) for m in msgs])


@api_view(["GET"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def all_messages_view(request):
    """Return ALL messages in the system (manager only)."""
    db = get_db()
    msgs = list(db.messages.find({}, {"_id": 0}).sort("createdAt", -1))
    return Response([_serialize_msg(m) for m in msgs])


@api_view(["PATCH"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def mark_read(request, messageId):
    db = get_db()
    result = db.messages.update_one({"messageId": messageId}, {"$set": {"isRead": True}})
    if result.matched_count == 0:
        return Response({"error": "Message not found."}, status=404)
    return Response({"detail": "Marked as read."})


@api_view(["DELETE"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def delete_message(request, messageId):
    db = get_db()
    db.messages.delete_one({"messageId": messageId})
    return Response({"detail": "Message deleted."})
