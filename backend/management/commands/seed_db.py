"""
Seed command: python manage.py seed_db

Inserts default users, materials, counters, and company config.
Uses $setOnInsert so re-running is idempotent (won't duplicate).
"""
import bcrypt
from datetime import datetime, timezone
from django.core.management.base import BaseCommand

from utils.db import get_db


def hash_pw(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


class Command(BaseCommand):
    help = "Seed the MongoDB database with default users, materials, counters, and company config."

    def handle(self, *args, **options):
        db = get_db()
        now = datetime.now(timezone.utc)

        # ── Users ────────────────────────────────────────────────────────────
        default_users = [
            {"userId": "USR-001", "username": "manager",    "role": "manager"},
            {"userId": "USR-002", "username": "sales",      "role": "sales"},
            {"userId": "USR-003", "username": "production", "role": "production"},
            {"userId": "USR-004", "username": "inventory",  "role": "inventory"},
            {"userId": "USR-005", "username": "dispatch",   "role": "dispatch"},
        ]
        for u in default_users:
            db.users.update_one(
                {"username": u["username"]},
                {
                    "$setOnInsert": {
                        "userId": u["userId"],
                        "username": u["username"],
                        "password_hash": hash_pw(u["username"]),  # password = username
                        "role": u["role"],
                        "isActive": True,
                        "createdAt": now,
                        "updatedAt": now,
                    }
                },
                upsert=True,
            )
        self.stdout.write(self.style.SUCCESS(f"✅ Seeded {len(default_users)} users"))

        # ── Materials ─────────────────────────────────────────────────────────
        default_materials = [
            {"materialId": "MAT-001", "name": "Steel Rods",       "unit": "kg",  "quantity": 200},
            {"materialId": "MAT-002", "name": "Copper Wire",      "unit": "m",   "quantity": 500},
            {"materialId": "MAT-003", "name": "Plastic Pellets",  "unit": "kg",  "quantity": 150},
            {"materialId": "MAT-004", "name": "Circuit Boards",   "unit": "pcs", "quantity": 80},
            {"materialId": "MAT-005", "name": "Lubricant Oil",    "unit": "L",   "quantity": 60},
        ]
        for m in default_materials:
            db.materials.update_one(
                {"materialId": m["materialId"]},
                {
                    "$setOnInsert": {
                        **m,
                        "createdAt": now,
                        "updatedAt": now,
                    }
                },
                upsert=True,
            )
        self.stdout.write(self.style.SUCCESS(f"✅ Seeded {len(default_materials)} materials"))

        # ── Counters ──────────────────────────────────────────────────────────
        counters = [
            {"_id": "order_seq",   "seq": 0},
            {"_id": "po_seq",      "seq": 100000},
            {"_id": "invoice_seq", "seq": 0},
            {"_id": "material_seq","seq": 5},
            {"_id": "user_seq",    "seq": 5},
            {"_id": "message_seq", "seq": 0},
        ]
        for c in counters:
            db.counters.update_one(
                {"_id": c["_id"]},
                {"$setOnInsert": {"seq": c["seq"]}},
                upsert=True,
            )
        self.stdout.write(self.style.SUCCESS(f"✅ Seeded {len(counters)} counters"))

        # ── Company Config ─────────────────────────────────────────────────────
        db.company_config.update_one(
            {"_id": "company_config"},
            {
                "$setOnInsert": {
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
                    "invoiceDeclaration": "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
                }
            },
            upsert=True,
        )
        self.stdout.write(self.style.SUCCESS("✅ Seeded company config"))
        self.stdout.write(self.style.SUCCESS("\n🎉 Database seeded successfully!"))
        self.stdout.write("Default logins: manager/manager, sales/sales, production/production, inventory/inventory, dispatch/dispatch")
