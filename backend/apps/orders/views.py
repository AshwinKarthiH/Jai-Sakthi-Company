"""
Orders views — CRUD + all 12 workflow action endpoints.
"""
from datetime import datetime, timezone, timedelta

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from utils.db import get_db
from utils.id_generator import next_order_id, next_po_number
from utils.messages import send_message
from apps.auth_app.authentication import MongoJWTAuthentication
from apps.auth_app.permissions import (
    IsAnyRole, IsSalesOrManager, IsManager,
    IsProductionOrManager, IsDispatchOrManager,
)
from apps.orders.serializers import serialize_order

# ────────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────────

def _get_order_or_404(db, order_id: str):
    order = db.orders.find_one({"orderId": order_id})
    return order


def _ms_to_dt(ms_value):
    """Convert epoch ms to UTC datetime."""
    if ms_value is None:
        return None
    return datetime.fromtimestamp(ms_value / 1000, tz=timezone.utc)


# ────────────────────────────────────────────────────────────────────────────────
# List + Create
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def orders_list(request):
    db = get_db()
    role = request.user_role

    if request.method == "GET":
        # Role-based filtering
        if role in ["manager", "sales"]:
            query = {}
        elif role == "production":
            query = {"status": {"$in": ["pending", "in_progress", "on_hold"]}}
        elif role == "dispatch":
            query = {"status": {"$in": ["tax_invoice_pending", "ready_for_dispatch", "in_dispatch", "loaded", "delivered"]}}
        else:
            query = {}

        docs = list(db.orders.find(query, {"_id": 0}).sort("createdAt", -1))
        return Response([serialize_order(d, role) for d in docs])

    if request.method == "POST":
        if role not in ["sales", "manager"]:
            return Response({"error": "Permission denied."}, status=403)

        data = request.data
        now = datetime.now(timezone.utc)
        order_id = next_order_id()
        po_number = next_po_number()

        doc = {
            "orderId": order_id,
            "poNumber": po_number,
            "poDate": data.get("poDate", now.strftime("%Y-%m-%d")),
            "supplierCode": data.get("supplierCode", ""),
            "supplierName": data.get("supplierName", ""),
            "contactName": data.get("contactName", ""),
            "contactPhone": data.get("contactPhone", ""),
            "buyerName": data.get("buyerName", ""),
            "buyerAddress": data.get("buyerAddress", ""),
            "buyerGstin": data.get("buyerGstin", ""),
            "buyerState": data.get("buyerState", ""),
            "buyerStateCode": data.get("buyerStateCode", ""),
            "shipToName": data.get("shipToName", ""),
            "shipToAddress": data.get("shipToAddress", ""),
            "shipToGstin": data.get("shipToGstin", ""),
            "shipToState": data.get("shipToState", ""),
            "shipToStateCode": data.get("shipToStateCode", ""),
            "paymentTerm": data.get("paymentTerm", "NET 30 DAYS"),
            "tradeTerm": data.get("tradeTerm", "DAP-AT OUR WORKS"),
            "deliveryTerm": data.get("deliveryTerm", "BY ROAD"),
            "prNumber": data.get("prNumber", ""),
            "currency": data.get("currency", "INR"),
            "lines": data.get("lines", []),
            "totalAmount": data.get("totalAmount", 0),
            "sgstRate": data.get("sgstRate", 9),
            "sgst": data.get("sgst", 0),
            "cgstRate": data.get("cgstRate", 9),
            "cgst": data.get("cgst", 0),
            "igstRate": data.get("igstRate", 0),
            "igst": data.get("igst", 0),
            "grossTotal": data.get("grossTotal", 0),
            "status": "awaiting_approval",
            "rejectionReason": None,
            "duration": None,
            "startedAt": None,
            "eta": None,
            "materials": [],
            "taxInvoices": [],
            "createdBy": role,
            "createdAt": now,
            "updatedAt": now,
        }

        lines = data.get("lines", [])
        batch_defaults = {
            "productionCompletedAt": None,
            "taxInvoiceId": None,
            "taxInvoiceNumber": None,
            "loadedAt": None,
            "deliveredAt": None,
            "refBillReceived": None,
            "refBillNote": None,
            "dispatchNote": None,
            "deliveryNote": None,
            "remainingTime": None,
            "duration": None,
            "startedAt": None,
            "eta": None,
            "materials": [],
        }
        for line in lines:
            if "deliveryBatches" not in line or not line["deliveryBatches"]:
                line["deliveryBatches"] = [{
                    "batchId": f"BATCH-{now.strftime('%y%m%d%H%M%S')}-{line.get('lineNo', 0)}-1",
                    "batchNumber": 1,
                    "quantity": line.get("qty", 0),
                    "scheduledDate": line.get("requestedDate", now.strftime("%Y-%m-%d")),
                    "status": "pending",
                    **batch_defaults,
                }]
            else:
                total_qty = sum(b.get("quantity", 0) for b in line["deliveryBatches"])
                if total_qty != line.get("qty", 0):
                    return Response({"error": f"Sum of batch quantities ({total_qty}) must equal line quantity ({line.get('qty', 0)}) for line {line.get('lineNo', 0)}."}, status=400)
                for idx, b in enumerate(line["deliveryBatches"]):
                    if "batchId" not in b or b["batchId"].startswith("draft-"):
                        b["batchId"] = f"BATCH-{now.strftime('%y%m%d%H%M%S')}-{line.get('lineNo', 0)}-{idx+1}"
                    if "batchNumber" not in b:
                        b["batchNumber"] = idx + 1
                    if "status" not in b:
                        b["status"] = "pending"
                    for k, v in batch_defaults.items():
                        if k not in b:
                            b[k] = v
        
        doc["lines"] = lines

        db.orders.insert_one(doc)
        send_message("sales", "manager", f"New PO {po_number} created and awaits your approval.", order_id, po_number)
        return Response(serialize_order(doc, role), status=201)


# ────────────────────────────────────────────────────────────────────────────────
# Single order CRUD
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsAnyRole])
def order_detail(request, orderId):
    db = get_db()
    role = request.user_role
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    if request.method == "GET":
        return Response(serialize_order(order, role))

    if request.method == "PATCH":
        # Sales can only edit their own orders; manager can edit any
        if role == "sales" and order.get("createdBy") != "sales":
            return Response({"error": "You can only edit your own orders."}, status=403)
        if role not in ["sales", "manager"]:
            return Response({"error": "Permission denied."}, status=403)

        updates = {k: v for k, v in request.data.items() if k not in ["_id", "orderId", "poNumber"]}
        updates["updatedAt"] = datetime.now(timezone.utc)

        # CRITICAL: When lines are updated, preserve deliveryBatches from existing lines
        if "lines" in updates:
            existing_lines = {l.get("lineNo"): l for l in order.get("lines", [])}
            for line in updates["lines"]:
                line_no = line.get("lineNo")
                if line_no in existing_lines:
                    if "deliveryBatches" not in line or not line["deliveryBatches"]:
                        line["deliveryBatches"] = existing_lines[line_no].get("deliveryBatches", [])

        db.orders.find_one_and_update(
            {"orderId": orderId},
            {"$set": updates},
            return_document=True,
        )
        updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
        return Response(serialize_order(updated, role))

    if request.method == "DELETE":
        if role != "manager":
            return Response({"error": "Manager access required."}, status=403)
        db.orders.delete_one({"orderId": orderId})
        return Response({"detail": "Order deleted."})


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: approve
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def approve_order(request, orderId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)
    if order["status"] != "awaiting_approval":
        return Response({"error": f"Cannot approve order with status '{order['status']}'."}, status=400)

    db.orders.update_one({"orderId": orderId}, {"$set": {"status": "pending", "updatedAt": datetime.now(timezone.utc)}})
    send_message("manager", "sales", f"PO {order['poNumber']} approved by Manager and sent to Production.", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: decline
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def decline_order(request, orderId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)
    if order["status"] != "awaiting_approval":
        return Response({"error": f"Cannot decline order with status '{order['status']}'."}, status=400)

    reason = request.data.get("reason", request.data.get("rejectionReason", "")).strip()
    if not reason:
        return Response({"error": "Reason is required for declining."}, status=400)

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": "rejected", "rejectionReason": reason, "updatedAt": datetime.now(timezone.utc)}},
    )
    send_message("manager", "sales", f"PO {order['poNumber']} declined by Manager. Reason: {reason}", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Status Helper
# ────────────────────────────────────────────────────────────────────────────────

def recompute_order_status(order):
    """Recompute the overall order status from the WORST batch state.
    
    Priority (checked top-down, first match wins):
      delivered < in_dispatch < ready_for_dispatch < tax_invoice_pending < in_progress < pending
    """
    all_batches = []
    for line in order.get("lines", []):
        all_batches.extend(line.get("deliveryBatches", []))

    if not all_batches:
        return order.get("status")

    statuses = [b.get("status", "pending") for b in all_batches]

    # All delivered → order delivered
    if all(s == "delivered" for s in statuses):
        return "delivered"
    # Any loaded or delivered (but not all delivered) → in_dispatch
    if any(s in ("loaded", "delivered") for s in statuses):
        return "in_dispatch"
    # Any invoiced → ready_for_dispatch
    if any(s == "invoiced" for s in statuses):
        return "ready_for_dispatch"
    # All production_complete → tax_invoice_pending
    if all(s == "production_complete" for s in statuses):
        return "tax_invoice_pending"
    # Any in_progress, on_hold, or production_complete → in_progress
    if any(s in ("in_progress", "on_hold", "production_complete") for s in statuses):
        return "in_progress"
    # All rejected → rejected
    if all(s == "rejected" for s in statuses):
        return "rejected"
    # All pending → pending
    if all(s == "pending" for s in statuses):
        return "pending"

    return order.get("status")


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: accept (production)
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsProductionOrManager])
def accept_order(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    try:
        duration = int(request.data.get("duration", 30))
    except (ValueError, TypeError):
        return Response({"error": "duration must be an integer (minutes)."}, status=400)

    req_materials = request.data.get("materials", [])

    # Validate materials
    for req in req_materials:
        mat_id = req.get("materialId")
        qty = req.get("quantity", 0)
        mat = db.materials.find_one({"materialId": mat_id})
        if not mat:
            return Response({"error": f"Material {mat_id} not found."}, status=400)
        if mat["quantity"] < qty:
            return Response({"error": f"Insufficient stock for {mat['name']}. Available: {mat['quantity']} {mat['unit']}."}, status=400)

    updated_lines = order.get("lines", [])
    batch_found = False
    
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") != "pending":
                        return Response({"error": f"Cannot accept batch with status '{b.get('status')}'."}, status=400)
                    
                    now = datetime.now(timezone.utc)
                    started_at_ms = int(now.timestamp() * 1000)
                    eta_ms = started_at_ms + duration * 60000
                    
                    b["status"] = "in_progress"
                    b["duration"] = duration
                    b["startedAt"] = int(now.timestamp() * 1000)
                    b["eta"] = eta_ms
                    b["materials"] = req_materials
                    batch_found = True
                    break
    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)

    # Deduct inventory
    for req in req_materials:
        db.materials.update_one(
            {"materialId": req["materialId"]},
            {"$inc": {"quantity": -req["quantity"]}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
        )

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {
            "$set": {
                "status": order["status"],
                "lines": updated_lines,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )
    send_message("production", "sales", f"Batch in PO {order['poNumber']} accepted by Production. ETA: {duration} minutes.", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: reject (production)
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsProductionOrManager])
def reject_order(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    reason = request.data.get("reason", request.data.get("rejectionReason", "")).strip()
    if not reason:
        return Response({"error": "Reason is required."}, status=400)

    updated_lines = order.get("lines", [])
    batch_found = False
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") != "pending":
                        return Response({"error": f"Cannot reject batch with status '{b.get('status')}'."}, status=400)
                    b["status"] = "rejected"
                    b["rejectionReason"] = reason
                    batch_found = True
                    break
                    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)
        
    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "lines": updated_lines, "updatedAt": datetime.now(timezone.utc)}},
    )
    send_message("production", "sales", f"Batch in PO {order['poNumber']} rejected by Production. Reason: {reason}", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: hold
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def hold_order(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    updated_lines = order.get("lines", [])
    batch_found = False
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") != "in_progress":
                        return Response({"error": f"Can only hold in_progress batches."}, status=400)
                    
                    now = datetime.now(timezone.utc)
                    eta_ms = b.get("eta")
                    remaining_ms = None
                    if eta_ms:
                        remaining_ms = max(0, eta_ms - int(now.timestamp() * 1000))

                    b["status"] = "on_hold"
                    b["remainingTime"] = remaining_ms
                    batch_found = True
                    break
                    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "lines": updated_lines, "updatedAt": datetime.now(timezone.utc)}},
    )
    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: resume
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsManager])
def resume_order(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    updated_lines = order.get("lines", [])
    batch_found = False
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") != "on_hold":
                        return Response({"error": f"Can only resume on_hold batches."}, status=400)
                    
                    now = datetime.now(timezone.utc)
                    remaining_ms = b.get("remainingTime", 0)
                    new_eta_ms = int(now.timestamp() * 1000) + remaining_ms

                    b["status"] = "in_progress"
                    b["eta"] = new_eta_ms
                    b["remainingTime"] = None
                    batch_found = True
                    break
                    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "lines": updated_lines, "updatedAt": datetime.now(timezone.utc)}},
    )
    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: complete
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsProductionOrManager])
def complete_order(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    updated_lines = order.get("lines", [])
    batch_found = False
    batch_number = ""
    quantity = ""
    
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") not in ["in_progress", "on_hold"]:
                        return Response({"error": f"Cannot complete batch with status '{b.get('status')}'."}, status=400)
                    b["status"] = "production_complete"
                    b["productionCompletedAt"] = datetime.now(timezone.utc).isoformat()
                    batch_number = b.get("batchNumber", "")
                    quantity = b.get("quantity", "")
                    batch_found = True
                    break
                    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "lines": updated_lines, "updatedAt": datetime.now(timezone.utc)}},
    )
    send_message(
        "production", "sales", 
        f"Batch {batch_number} (Qty: {quantity}) of PO {order.get('poNumber', '')} production complete. Awaiting dispatch.", 
        orderId, order.get("poNumber")
    )
    send_message(
        "production", "dispatch", 
        f"Batch {batch_number} (Qty: {quantity}) of PO {order.get('poNumber', '')} is ready for Tax Invoice generation.", 
        orderId, order.get("poNumber")
    )

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: generate-invoice
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def generate_invoice(request, orderId, lineNo, batchId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    tax_invoice = request.data.get("taxInvoice") or request.data
    invoice_number = tax_invoice.get("invoiceNumber", "")
    
    # generate an invoiceId
    invoice_id = f"INV-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    tax_invoice["invoiceId"] = invoice_id
    tax_invoice["status"] = "ready_for_dispatch"

    updated_lines = order.get("lines", [])
    batch_found = False
    batch_number = ""
    batch_quantity = 0
    
    for line in updated_lines:
        if line.get("lineNo") == lineNo:
            for b in line.get("deliveryBatches", []):
                if b.get("batchId") == batchId:
                    if b.get("status") != "production_complete":
                        return Response({"error": f"Batch is not production_complete (current: {b.get('status')})."}, status=400)
                    b["status"] = "invoiced"
                    b["taxInvoiceId"] = invoice_id
                    b["taxInvoiceNumber"] = invoice_number
                    batch_number = b.get("batchNumber", "")
                    batch_quantity = b.get("quantity", 0)
                    
                    # Link invoice back to batch
                    tax_invoice["batchId"] = batchId
                    tax_invoice["lineNo"] = line.get("lineNo")
                    tax_invoice["batchQuantity"] = batch_quantity
                    tax_invoice["batchRefs"] = [{
                        "lineNo": line.get("lineNo"),
                        "batchId": batchId,
                        "quantity": b.get("quantity"),
                        "description": line.get("description", "")
                    }]
                    batch_found = True
                    break
                    
    if not batch_found:
        return Response({"error": "Batch not found."}, status=404)
        
    tax_invoices = order.get("taxInvoices", [])
    tax_invoices.append(tax_invoice)
    
    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.find_one_and_update(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "taxInvoices": tax_invoices, "lines": updated_lines, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True,
    )
    send_message("dispatch", "sales", f"Tax Invoice {invoice_number} generated for Batch {batch_number} of PO {order['poNumber']}.", orderId, order["poNumber"])
    send_message("dispatch", "manager", f"Tax Invoice {invoice_number} generated for Batch {batch_number} of PO {order['poNumber']} by Dispatch.", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: update invoice (PATCH — no status change)
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["PATCH"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def update_invoice(request, orderId, invoiceId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    # Protect critical fields from being overwritten by client
    protected_fields = {"invoiceId", "status", "batchId", "loadedAt", "deliveredAt", "batchRefs", "batchQuantity", "lineNo"}
    updates = {k: v for k, v in request.data.items() if k not in protected_fields}

    tax_invoices = order.get("taxInvoices", [])
    found = False
    for i, inv in enumerate(tax_invoices):
        if inv.get("invoiceId") == invoiceId:
            tax_invoices[i] = {**inv, **updates}
            found = True
            break
            
    if not found:
        return Response({"error": "Invoice not found."}, status=404)

    db.orders.find_one_and_update(
        {"orderId": orderId},
        {"$set": {"taxInvoices": tax_invoices, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True,
    )
    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: confirm-loaded
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def confirm_loaded(request, orderId, invoiceId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    tax_invoices = order.get("taxInvoices", [])
    invoice = None
    for inv in tax_invoices:
        if inv.get("invoiceId") == invoiceId:
            invoice = inv
            break
            
    if not invoice:
        return Response({"error": "Invoice not found."}, status=404)
        
    if invoice.get("status") != "ready_for_dispatch":
        return Response({"error": f"Cannot confirm loaded for invoice with status '{invoice.get('status')}'."}, status=400)

    dispatch_note = request.data.get("dispatchNote", "")
    consignee_name = invoice.get("consigneeName", request.data.get("consigneeName", "Customer"))

    now = datetime.now(timezone.utc)
    invoice["status"] = "loaded"
    invoice["dispatchNote"] = dispatch_note
    invoice["loadedAt"] = now

    updated_lines = order.get("lines", [])
    for line in updated_lines:
        for b in line.get("deliveryBatches", []):
            if b.get("taxInvoiceId") == invoiceId:
                b["status"] = "loaded"
                b["loadedAt"] = now

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "taxInvoices": tax_invoices, "lines": updated_lines, "updatedAt": now}},
    )
    send_message("dispatch", "sales", f"PO {order['poNumber']} invoice {invoice.get('invoiceNumber')} loaded and on its way to {consignee_name}.", orderId, order["poNumber"])
    send_message("dispatch", "manager", f"PO {order['poNumber']} invoice {invoice.get('invoiceNumber')} loaded for dispatch to {consignee_name}.", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: confirm-delivery
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def confirm_delivery(request, orderId, invoiceId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    tax_invoices = order.get("taxInvoices", [])
    invoice = None
    for inv in tax_invoices:
        if inv.get("invoiceId") == invoiceId:
            invoice = inv
            break
            
    if not invoice:
        return Response({"error": "Invoice not found."}, status=404)
        
    if invoice.get("status") != "loaded":
        return Response({"error": f"Cannot confirm delivery for invoice with status '{invoice.get('status')}'."}, status=400)

    delivery_note = request.data.get("deliveryNote", request.data.get("dispatchDeliveryNote", ""))
    ref_bill_received = bool(request.data.get("refBillReceived", True))
    ref_bill_note = request.data.get("refBillNote", "")
    consignee_name = invoice.get("consigneeName", "Customer")
    invoice_no = invoice.get("invoiceNumber", "")

    if not ref_bill_received and not ref_bill_note.strip():
        return Response({"error": "Provide a note when ref bill is not received."}, status=400)

    now = datetime.now(timezone.utc)
    invoice["status"] = "delivered"
    invoice["dispatchDeliveryNote"] = delivery_note
    invoice["refBillReceived"] = ref_bill_received
    invoice["refBillNote"] = ref_bill_note
    invoice["deliveredAt"] = now
    
    updated_lines = order.get("lines", [])
    for line in updated_lines:
        for b in line.get("deliveryBatches", []):
            if b.get("taxInvoiceId") == invoiceId:
                b["status"] = "delivered"
                b["deliveredAt"] = now
                b["refBillReceived"] = ref_bill_received
                b["refBillNote"] = ref_bill_note

    order["status"] = recompute_order_status({"lines": updated_lines, "status": order.get("status")})

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"status": order["status"], "taxInvoices": tax_invoices, "lines": updated_lines, "updatedAt": now}},
    )
    send_message("dispatch", "sales", f"PO {order['poNumber']} invoice {invoice_no} delivered to {consignee_name}.", orderId, order["poNumber"])
    if ref_bill_received:
        send_message("dispatch", "manager", f"PO {order['poNumber']} invoice {invoice_no} delivered. ✅ Ref bill received.", orderId, order["poNumber"])
    else:
        send_message("dispatch", "manager", f"PO {order['poNumber']} invoice {invoice_no} delivered. ⚠️ Ref bill NOT received. Note: {ref_bill_note}", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Workflow Action: update-bill
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def update_bill(request, orderId, invoiceId):
    db = get_db()
    order = _get_order_or_404(db, orderId)
    if not order:
        return Response({"error": "Order not found."}, status=404)

    tax_invoices = order.get("taxInvoices", [])
    invoice = None
    for inv in tax_invoices:
        if inv.get("invoiceId") == invoiceId:
            invoice = inv
            break
            
    if not invoice:
        return Response({"error": "Invoice not found."}, status=404)

    consignee_name = invoice.get("consigneeName", "Customer")
    
    now = datetime.now(timezone.utc)
    invoice["refBillReceived"] = True
    invoice["refBillNote"] = ""
    
    updated_lines = order.get("lines", [])
    for line in updated_lines:
        for b in line.get("deliveryBatches", []):
            if b.get("taxInvoiceId") == invoiceId:
                b["refBillReceived"] = True
                b["refBillNote"] = ""

    db.orders.update_one(
        {"orderId": orderId},
        {"$set": {"taxInvoices": tax_invoices, "lines": updated_lines, "updatedAt": now}},
    )
    send_message("dispatch", "manager", f"Ref bill for PO {order['poNumber']} invoice {invoice.get('invoiceNumber')} now received from {consignee_name}.", orderId, order["poNumber"])

    updated = db.orders.find_one({"orderId": orderId}, {"_id": 0})
    return Response(serialize_order(updated))


# ────────────────────────────────────────────────────────────────────────────────
# Dispatch Queue Endpoints
# ────────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def dispatch_invoice_queue(request):
    """Return batches that are production_complete and have no invoice yet."""
    db = get_db()
    # Find orders with any batch status == production_complete
    orders = list(db.orders.find(
        {"lines.deliveryBatches.status": "production_complete"},
        {"_id": 0}
    ))
    result = []
    for order in orders:
        for line in order.get("lines", []):
            for b in line.get("deliveryBatches", []):
                if b.get("status") == "production_complete":
                    result.append({
                        "orderId": order.get("orderId"),
                        "poNumber": order.get("poNumber"),
                        "lineNo": line.get("lineNo"),
                        "batchId": b.get("batchId"),
                        "batchNumber": b.get("batchNumber"),
                        "quantity": b.get("quantity"),
                        "scheduledDate": b.get("scheduledDate"),
                        "partNumber": line.get("partNumber"),
                        "description": line.get("description"),
                        "uom": line.get("uom", "EA"),
                        "unitPrice": line.get("unitPrice", 0),
                        "buyerName": order.get("buyerName"),
                    })
    return Response(result)


@api_view(["GET"])
@authentication_classes([MongoJWTAuthentication])
@permission_classes([IsDispatchOrManager])
def dispatch_ready_for_dispatch(request):
    """Return invoices that are ready_for_dispatch."""
    db = get_db()
    orders = list(db.orders.find(
        {"taxInvoices.status": "ready_for_dispatch"},
        {"_id": 0}
    ))
    result = []
    for order in orders:
        for inv in order.get("taxInvoices", []):
            if inv.get("status") == "ready_for_dispatch":
                # Find the batch info
                batch_number = ""
                batch_qty = inv.get("batchQuantity", 0)
                for line in order.get("lines", []):
                    for b in line.get("deliveryBatches", []):
                        if b.get("batchId") == inv.get("batchId"):
                            batch_number = b.get("batchNumber", "")
                            batch_qty = b.get("quantity", batch_qty)
                            break
                result.append({
                    "orderId": order.get("orderId"),
                    "poNumber": order.get("poNumber"),
                    "invoiceId": inv.get("invoiceId"),
                    "invoiceNumber": inv.get("invoiceNumber"),
                    "batchId": inv.get("batchId"),
                    "batchNumber": batch_number,
                    "quantity": batch_qty,
                    "consigneeName": inv.get("consigneeName"),
                    "motorVehicleNo": inv.get("motorVehicleNo"),
                    "grossTotal": inv.get("grossTotal", 0),
                })
    return Response(result)
