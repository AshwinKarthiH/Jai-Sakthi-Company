"""
File upload, serve, and delete views.
Files are stored on disk under MEDIA_ROOT/uploads/.
File records are stored in MongoDB `files` collection.
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from utils.db import get_db
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import IsAnyRole, IsSalesOrManager, IsManager

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsSalesOrManager])
def upload_file(request):
    if "file" not in request.FILES:
        return Response({"error": "No file provided."}, status=400)

    f = request.FILES["file"]

    if f.size > MAX_FILE_SIZE:
        return Response({"error": "File too large (max 5MB)."}, status=400)

    mime_type = f.content_type or ""
    if not (mime_type.startswith("image/") or mime_type == "application/pdf"):
        return Response({"error": "Only images and PDFs are allowed."}, status=400)

    # Generate unique filename
    file_id = uuid.uuid4().hex
    safe_name = f.name.replace(" ", "_")
    rel_path = f"uploads/{file_id}_{safe_name}"
    abs_path = settings.MEDIA_ROOT / rel_path

    abs_path.parent.mkdir(parents=True, exist_ok=True)
    with open(abs_path, "wb+") as dest:
        for chunk in f.chunks():
            dest.write(chunk)

    # Build the public URL
    base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    file_url = f"{base_url}{settings.MEDIA_URL}{rel_path}"

    # Store record in MongoDB
    db = get_db()
    now = datetime.now(timezone.utc)
    record = {
        "fileId": file_id,
        "fileName": f.name,
        "mimeType": mime_type,
        "filePath": str(rel_path),
        "fileUrl": file_url,
        "uploadedBy": request.user.role,
        "uploadedByUserId": request.user.user_id,
        "createdAt": now,
    }
    db.files.insert_one(record)

    return Response(
        {
            "fileId": file_id,
            "fileName": f.name,
            "mimeType": mime_type,
            "fileUrl": file_url,
        },
        status=201,
    )


@api_view(["GET"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def serve_file(request, fileId):
    db = get_db()
    record = db.files.find_one({"fileId": fileId})
    if not record:
        raise Http404("File not found.")

    abs_path = settings.MEDIA_ROOT / record["filePath"]
    if not abs_path.exists():
        raise Http404("File not found on disk.")

    return FileResponse(open(abs_path, "rb"), content_type=record.get("mimeType", "application/octet-stream"))


@api_view(["DELETE"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def delete_file(request, fileId):
    db = get_db()
    record = db.files.find_one({"fileId": fileId})
    if not record:
        return Response({"error": "File not found."}, status=404)

    role = request.user_role
    uploader_id = record.get("uploadedByUserId")

    # Sales can only delete their own files; manager can delete any
    if role == "sales" and uploader_id != request.user.user_id:
        return Response({"error": "You can only delete your own files."}, status=403)
    elif role not in ["sales", "manager"]:
        return Response({"error": "Permission denied."}, status=403)

    abs_path = settings.MEDIA_ROOT / record["filePath"]
    if abs_path.exists():
        abs_path.unlink()

    db.files.delete_one({"fileId": fileId})
    return Response({"detail": "File deleted."})
