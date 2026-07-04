from utils.db import get_db


def _next(counter_name: str, prefix: str, pad: int = 3) -> str:
    db = get_db()
    result = db.counters.find_one_and_update(
        {"_id": counter_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = result["seq"]
    return f"{prefix}{str(seq).zfill(pad)}"


def next_order_id():    return _next("order_seq",    "ORD-", 3)
def next_po_number():   return _next("po_seq",       "PO-",  6)
def next_invoice_id():  return _next("invoice_seq",  "INV-", 3)
def next_material_id(): return _next("material_seq", "MAT-", 3)
def next_user_id():     return _next("user_seq",     "USR-", 3)
def next_message_id():  return _next("message_seq",  "MSG-", 3)
