import os
import bcrypt
from datetime import datetime, timezone
from django.core.management.base import BaseCommand
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class Command(BaseCommand):
    help = "Seed default users, materials, counters and company config"

    def handle(self, *args, **kwargs):
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        db_name = os.getenv("MONGO_DB_NAME", "jaisakthi_erp")
        client = MongoClient(uri)
        db = client[db_name]
        now = datetime.now(timezone.utc)

        # 1. Users
        default_users = [
            {"userId": "USR-001", "username": "manager",    "role": "manager"},
            {"userId": "USR-002", "username": "sales",      "role": "sales"},
            {"userId": "USR-003", "username": "production", "role": "production"},
            {"userId": "USR-004", "username": "inventory",  "role": "inventory"},
            {"userId": "USR-005", "username": "dispatch",   "role": "dispatch"},
        ]
        for u in default_users:
            pw = u["username"].encode("utf-8")
            hashed = bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")
            db.users.update_one(
                {"username": u["username"]},
                {"$setOnInsert": {
                    "userId": u["userId"],
                    "username": u["username"],
                    "role": u["role"],
                    "password_hash": hashed,
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                }},
                upsert=True,
            )
            self.stdout.write(f"  ✔ user: {u['username']}")

        # 2. Materials
        default_materials = [
            {"materialId": "MAT-001", "name": "Steel Rods",      "unit": "kg",  "quantity": 200},
            {"materialId": "MAT-002", "name": "Copper Wire",     "unit": "m",   "quantity": 500},
            {"materialId": "MAT-003", "name": "Plastic Pellets", "unit": "kg",  "quantity": 150},
            {"materialId": "MAT-004", "name": "Circuit Boards",  "unit": "pcs", "quantity": 80},
            {"materialId": "MAT-005", "name": "Lubricant Oil",   "unit": "L",   "quantity": 60},
        ]
        for m in default_materials:
            db.materials.update_one(
                {"materialId": m["materialId"]},
                {"$setOnInsert": {**m, "createdAt": now, "updatedAt": now}},
                upsert=True,
            )
            self.stdout.write(f"  ✔ material: {m['name']}")

        # 3. Counters
        for name, start in [
            ("order_seq", 0), ("po_seq", 100000), ("invoice_seq", 0),
            ("material_seq", 5), ("user_seq", 5), ("message_seq", 0),
        ]:
            db.counters.update_one(
                {"_id": name},
                {"$setOnInsert": {"seq": start}},
                upsert=True,
            )
            self.stdout.write(f"  ✔ counter: {name}")

        # 4. Company config
        db.company_config.update_one(
            {"_id": "company_config"},
            {"$setOnInsert": {
                "_id": "company_config",
                "name": "JaiSakthi Packaging",
                "address": "58, Annai Avenue, Rathnamangalam, Near Tagore Medical College",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "stateCode": "33",
                "phone": "9884200477",
                "gstin": "",
                "email": "",
                "bankName": "HDFC BANK",
                "bankAccountHolder": "JaiSakthi Packaging",
                "bankAccountNo": "",
                "bankIfscCode": "",
                "invoiceDeclaration": (
                    "We declare that this invoice shows the actual price "
                    "of the goods described and that all particulars are "
                    "true and correct."
                ),
                "updatedAt": now,
            }},
            upsert=True,
        )
        self.stdout.write("  ✔ company config")
        self.stdout.write(self.style.SUCCESS("\n✅ Database seeded successfully"))
