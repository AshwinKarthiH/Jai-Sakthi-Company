"""
Orders serialization helpers.

The frontend uses `id` as the order key (not `orderId`).
All datetime fields from MongoDB are converted to ISO strings.
Timestamps (startedAt, eta, loadedAt, deliveredAt) are stored
as milliseconds integers for frontend countdown compatibility.
"""

FINANCIAL_FIELDS = {
    "totalAmount", "sgst", "cgst", "igst", "grossTotal",
    "sgstRate", "cgstRate", "igstRate",
    "taxInvoice", "taxInvoices",
}


def _dt_to_ms(dt):
    """Convert a datetime to epoch milliseconds, or return None."""
    if dt is None:
        return None
    if isinstance(dt, (int, float)):
        return int(dt)
    try:
        return int(dt.timestamp() * 1000)
    except Exception:
        return None


def _dt_to_iso(dt):
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def serialize_order(doc: dict, role: str = None) -> dict:
    """
    Convert a MongoDB order document to the shape expected by the frontend.
    - Maps orderId → id
    - Converts datetime timestamps to ms integers
    - Strips financial fields for production role
    """
    result = {
        "id": doc.get("orderId"),
        "orderId": doc.get("orderId"),
        "poNumber": doc.get("poNumber"),
        "poDate": doc.get("poDate"),
        "supplierCode": doc.get("supplierCode"),
        "supplierName": doc.get("supplierName"),
        "contactName": doc.get("contactName"),
        "contactPhone": doc.get("contactPhone"),
        "buyerName": doc.get("buyerName"),
        "buyerAddress": doc.get("buyerAddress"),
        "buyerGstin": doc.get("buyerGstin"),
        "buyerState": doc.get("buyerState"),
        "buyerStateCode": doc.get("buyerStateCode"),
        "shipToName": doc.get("shipToName"),
        "shipToAddress": doc.get("shipToAddress"),
        "shipToGstin": doc.get("shipToGstin"),
        "shipToState": doc.get("shipToState"),
        "shipToStateCode": doc.get("shipToStateCode"),
        "paymentTerm": doc.get("paymentTerm"),
        "tradeTerm": doc.get("tradeTerm"),
        "deliveryTerm": doc.get("deliveryTerm"),
        "prNumber": doc.get("prNumber"),
        "currency": doc.get("currency", "INR"),
        "lines": doc.get("lines", []),
        "totalAmount": doc.get("totalAmount", 0),
        "sgst": doc.get("sgst", 0),
        "cgst": doc.get("cgst", 0),
        "igst": doc.get("igst", 0),
        "sgstRate": doc.get("sgstRate", 0),
        "cgstRate": doc.get("cgstRate", 0),
        "igstRate": doc.get("igstRate", 0),
        "grossTotal": doc.get("grossTotal", 0),
        "status": doc.get("status", "awaiting_approval"),
        "rejectionReason": doc.get("rejectionReason"),
        "duration": doc.get("duration"),
        "startedAt": _dt_to_ms(doc.get("startedAt")),
        "eta": _dt_to_ms(doc.get("eta")),
        "materials": doc.get("materials", []),
        "taxInvoice": doc.get("taxInvoice"),
        "taxInvoices": doc.get("taxInvoices", []),
        "dispatchNote": doc.get("dispatchNote"),
        "dispatchDeliveryNote": doc.get("dispatchDeliveryNote"),
        "refBillReceived": doc.get("refBillReceived"),
        "refBillNote": doc.get("refBillNote"),
        "loadedAt": _dt_to_ms(doc.get("loadedAt")),
        "deliveredAt": _dt_to_ms(doc.get("deliveredAt")),
        "createdBy": doc.get("createdBy"),
        "createdAt": _dt_to_iso(doc.get("createdAt")),
        "updatedAt": _dt_to_iso(doc.get("updatedAt")),
        # Legacy field the frontend references
        "customerName": doc.get("taxInvoice", {}).get("consigneeName") if doc.get("taxInvoice") else doc.get("customerName"),
        "deliveryAddress": doc.get("taxInvoice", {}).get("consigneeAddress") if doc.get("taxInvoice") else doc.get("deliveryAddress"),
    }

    # Convert timestamps inside deliveryBatches (startedAt, eta, etc.)
    for line in result.get("lines", []):
        for batch in line.get("deliveryBatches", []):
            for ts_field in ("startedAt", "eta", "loadedAt", "deliveredAt"):
                if ts_field in batch:
                    batch[ts_field] = _dt_to_ms(batch[ts_field])

    # Convert timestamps inside taxInvoices
    for inv in result.get("taxInvoices", []):
        for ts_field in ("loadedAt", "deliveredAt"):
            if ts_field in inv:
                inv[ts_field] = _dt_to_ms(inv[ts_field])

    # Production role cannot see financial fields
    if role == "production":
        for field in FINANCIAL_FIELDS:
            result.pop(field, None)

    return result
