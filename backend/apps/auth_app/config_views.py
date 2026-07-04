"""
Company config views — GET (all roles), PATCH (manager only)
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response

from utils.db import get_db
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import IsManager, IsAnyRole


def _serialize_config(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


@api_view(["GET", "PATCH"])
@authentication_classes([MongoJWTAuthentication])
def config_view(request):
    db = get_db()

    if request.method == "GET":
        # Allow any authenticated role
        if not hasattr(request, "user_role"):
            return Response({"error": "Authentication required."}, status=401)
        doc = db.company_config.find_one({"_id": "company_config"})
        if not doc:
            return Response({})
        return Response(_serialize_config(doc))

    if request.method == "PATCH":
        if not hasattr(request, "user_role") or request.user_role != "manager":
            return Response({"error": "Manager access required."}, status=403)
        updates = {k: v for k, v in request.data.items() if k != "_id"}
        db.company_config.update_one({"_id": "company_config"}, {"$set": updates}, upsert=True)
        doc = db.company_config.find_one({"_id": "company_config"})
        return Response(_serialize_config(doc))
