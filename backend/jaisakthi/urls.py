from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("api/auth/", include("apps.auth_app.urls")),
    path("api/users/", include("apps.auth_app.user_urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/messages/", include("apps.messages_app.urls")),
    path("api/files/", include("apps.files.urls")),
    path("api/config/", include("apps.auth_app.config_urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
