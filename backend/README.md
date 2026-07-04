# JaiSakthi Packaging ERP — Backend

Django REST API connected to MongoDB via PyMongo.

## Prerequisites

- Python 3.10+
- MongoDB 5.0+ running on `localhost:27017`

## Setup

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env    # edit if needed

python manage.py seed_db
python manage.py runserver 8000
```

## Default Logins

| Username    | Password    | Role       |
|-------------|-------------|------------|
| manager     | manager     | manager    |
| sales       | sales       | sales      |
| production  | production  | production |
| inventory   | inventory   | inventory  |
| dispatch    | dispatch    | dispatch   |

## API Base URL

`http://localhost:8000/api/`

## Key Endpoints

- `POST /api/auth/login/` — Login, returns JWT tokens
- `POST /api/auth/refresh/` — Refresh access token
- `GET  /api/auth/me/` — Current user info
- `GET/POST /api/orders/` — Orders list/create
- `POST /api/orders/{id}/approve/` — Approve order
- `POST /api/orders/{id}/accept/` — Accept for production
- `POST /api/orders/{id}/complete/` — Mark production complete
- `POST /api/orders/{id}/generate-invoice/` — Generate tax invoice
- `POST /api/orders/{id}/confirm-loaded/` — Mark as loaded
- `POST /api/orders/{id}/confirm-delivery/` — Mark as delivered
- `GET/POST /api/inventory/` — Materials list/create
- `POST /api/files/upload/` — Upload file (multipart)
- `GET /api/messages/inbox/` — Role-based inbox
- `GET /api/config/` — Company config

## Frontend

```bash
cd ..           # back to project root
npm install
npm run dev     # http://localhost:5173
```
