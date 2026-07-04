from django.urls import path
from apps.files.views import upload_file, serve_file, delete_file

urlpatterns = [
    path("upload/", upload_file),
    path("<str:fileId>/", serve_file),
    path("<str:fileId>/delete/", delete_file),
]
