"""
Inventory (materials) CRUD + adjust views
"""
from datetime import datetime, timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from utils.db import get_db
from utils.id_generator import next_material_id
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import IsAnyRole, IsInventoryOrManager, IsManager, IsProductionOrManager


def _serialize_material(doc: dict) -> dict:
    return {
        "id": doc.get("materialId"),
        "materialId": doc.get("materialId"),
        "name": doc.get("name"),
        "unit": doc.get("unit"),
        "quantity": doc.get("quantity", 0),
        "createdAt": doc.get("createdAt").isoformat() if doc.get("createdAt") else None,
        "updatedAt": doc.get("updatedAt").isoformat() if doc.get("updatedAt") else None,
    }


@api_view(["GET", "POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def materials_list(request):
    db = get_db()

    if request.method == "GET":
        docs = list(db.materials.find({}, {"_id": 0}))
        return Response([_serialize_material(d) for d in docs])

    if request.method == "POST":
        # Only inventory or manager can add
        if request.user_role not in ["inventory", "manager"]:
            return Response({"error": "Permission denied."}, status=403)

        name = request.data.get("name", "").strip()
        unit = request.data.get("unit", "").strip()
        quantity = request.data.get("quantity", 0)

        if not name or not unit:
            return Response({"error": "name and unit are required."}, status=400)

        try:
            quantity = float(quantity)
        except (ValueError, TypeError):
            return Response({"error": "quantity must be a number."}, status=400)

        now = datetime.now(timezone.utc)
        doc = {
            "materialId": next_material_id(),
            "name": name,
            "unit": unit,
            "quantity": quantity,
            "createdAt": now,
            "updatedAt": now,
        }
        db.materials.insert_one(doc)
        return Response(_serialize_material(doc), status=201)


@api_view(["PATCH", "DELETE"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def material_detail(request, materialId):
    db = get_db()
    mat = db.materials.find_one({"materialId": materialId})
    if not mat:
        return Response({"error": "Material not found."}, status=404)

    if request.method == "PATCH":
        if request.user_role not in ["inventory", "manager"]:
            return Response({"error": "Permission denied."}, status=403)

        updates = {}
        if "name" in request.data:
            updates["name"] = request.data["name"]
        if "unit" in request.data:
            updates["unit"] = request.data["unit"]
        if "quantity" in request.data:
            try:
                updates["quantity"] = float(request.data["quantity"])
            except (ValueError, TypeError):
                return Response({"error": "quantity must be a number."}, status=400)
        updates["updatedAt"] = datetime.now(timezone.utc)
        db.materials.update_one({"materialId": materialId}, {"$set": updates})
        updated = db.materials.find_one({"materialId": materialId}, {"_id": 0})
        return Response(_serialize_material(updated))

    if request.method == "DELETE":
        if request.user_role != "manager":
            return Response({"error": "Manager access required."}, status=403)
        db.materials.delete_one({"materialId": materialId})
        return Response({"detail": "Material deleted."})


@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsProductionOrManager])
def adjust_material(request, materialId):
    """Atomically adjust quantity by delta. Blocks if result < 0."""
    db = get_db()
    mat = db.materials.find_one({"materialId": materialId})
    if not mat:
        return Response({"error": "Material not found."}, status=404)

    try:
        delta = float(request.data.get("delta", 0))
    except (ValueError, TypeError):
        return Response({"error": "delta must be a number."}, status=400)

    current_qty = mat.get("quantity", 0)
    if current_qty + delta < 0:
        return Response({"error": "Insufficient stock."}, status=400)

    db.materials.update_one(
        {"materialId": materialId},
        {"$inc": {"quantity": delta}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
    )
    updated = db.materials.find_one({"materialId": materialId}, {"_id": 0})
    return Response(_serialize_material(updated))
