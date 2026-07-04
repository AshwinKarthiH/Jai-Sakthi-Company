from datetime import datetime, timezone
from utils.db import get_db
from utils.id_generator import next_message_id


def send_message(from_role: str, to_role: str, text: str,
                 order_id: str = None, po_number: str = None):
    db = get_db()
    db.messages.insert_one({
        "messageId":  next_message_id(),
        "from":       from_role,
        "to":         to_role,
        "text":       text,
        "orderId":    order_id,
        "poNumber":   po_number,
        "isRead":     False,
        "createdAt":  datetime.now(timezone.utc),
    })
