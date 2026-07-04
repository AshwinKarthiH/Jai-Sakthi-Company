from django.urls import path
from apps.auth_app.config_views import config_view

urlpatterns = [
    path("", config_view),
]
