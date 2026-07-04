from django.urls import path
from apps.auth_app.user_views import users_list, user_detail

urlpatterns = [
    path("", users_list),
    path("<str:userId>/", user_detail),
]
