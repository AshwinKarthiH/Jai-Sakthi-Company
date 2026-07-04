from django.urls import path
from apps.messages_app.views import inbox_view, all_messages_view, mark_read, delete_message

urlpatterns = [
    path("inbox/", inbox_view),
    path("", all_messages_view),
    path("<str:messageId>/read/", mark_read),
    path("<str:messageId>/", delete_message),
]
