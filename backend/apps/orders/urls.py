from django.urls import path
from apps.orders import views

urlpatterns = [
    path("", views.orders_list),
    path("<str:orderId>/", views.order_detail),
    path("<str:orderId>/approve/", views.approve_order),
    path("<str:orderId>/decline/", views.decline_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/accept/", views.accept_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/reject/", views.reject_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/hold/", views.hold_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/resume/", views.resume_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/complete/", views.complete_order),
    path("<str:orderId>/lines/<int:lineNo>/batches/<str:batchId>/generate-invoice/", views.generate_invoice),
    path("<str:orderId>/invoices/<str:invoiceId>/", views.update_invoice),
    path("<str:orderId>/invoices/<str:invoiceId>/confirm-loaded/", views.confirm_loaded),
    path("<str:orderId>/invoices/<str:invoiceId>/confirm-delivery/", views.confirm_delivery),
    path("<str:orderId>/invoices/<str:invoiceId>/update-bill/", views.update_bill),
    # Dispatch queue endpoints
    path("dispatch/invoice-queue/", views.dispatch_invoice_queue),
    path("dispatch/ready-for-dispatch/", views.dispatch_ready_for_dispatch),
]
