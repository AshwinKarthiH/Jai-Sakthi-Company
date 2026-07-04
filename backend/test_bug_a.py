import requests

def test():
    res = requests.post("http://localhost:8000/api/auth/login/", json={"username": "manager1", "password": "password"})
    token = res.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    
    res = requests.get("http://localhost:8000/api/orders/", headers=headers)
    orders = res.json()
    
    print(f"Total orders: {len(orders)}")
    for order in orders:
        if order.get("taxInvoices"):
            print(f"Order {order['poNumber']} has invoices: {order['taxInvoices']}")

if __name__ == "__main__":
    test()
