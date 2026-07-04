from django.urls import path
from apps.inventory.views import materials_list, material_detail, adjust_material

urlpatterns = [
    path("", materials_list),
    path("<str:materialId>/", material_detail),
    path("<str:materialId>/adjust/", adjust_material),
]
