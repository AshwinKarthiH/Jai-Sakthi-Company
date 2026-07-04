import sys, os
sys.path.append(os.getcwd())
try:
    from utils.db import get_db
    from apps.orders.views import recompute_order_status
    db = get_db()
    orders = db.orders.find({})
    count = 0
    for order in orders:
        new_status = recompute_order_status(order)
        if new_status != order.get('status'):
            db.orders.update_one({'_id': order['_id']}, {'$set': {'status': new_status}})
            print(f"Updated {order.get('poNumber')} from {order.get('status')} to {new_status}")
            count += 1
    print(f'Total updated: {count}')
except Exception as e:
    print('ERROR:', e)
