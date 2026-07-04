import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key-change-me-in-production")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", os.getenv("ALLOWED_HOST", ""),".onrender.com",".vercel.app"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.auth_app",
    "apps.orders",
    "apps.inventory",
    "apps.messages_app",
    "apps.files",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    "corsheaders.middleware.CorsMiddleware",  
    'django.middleware.common.CommonMiddleware',
    "django.middleware.csrf.CsrfViewMiddleware",
]

ROOT_URLCONF = "jaisakthi.urls"
WSGI_APPLICATION = "jaisakthi.wsgi.application"

# No Django ORM database needed — all data access uses raw PyMongo directly
# Django still needs a database config for its internal auth/session tables
# Use sqlite for that (in-memory, we don't use Django's built-in auth at all)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.auth_app.authentication.MongoJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = [
    "https://jai-sakthi-company-ebon.vercel.app",
]
CORS_ALLOW_CREDENTIALS = True

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Static files configuration for Render
STATIC_URL = '/static/'

# Use pathlib's native division operator and cast to string to guarantee a filesystem path
STATIC_ROOT = str(BASE_DIR / 'staticfiles')

# WhiteNoise storage engine for compression and caching
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# MongoDB settings (used directly by PyMongo helpers)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "jaisakthi_erp")

import sys
import os

print("\n\n" + "="*50, file=sys.stderr)
print("FORENSIC AUDIT: SETTINGS.PY IS EXECUTING!", file=sys.stderr)
print(f"CURRENT FILE PATH: {__file__}", file=sys.stderr)
if "CORS_ALLOWED_ORIGINS" in locals():
    print(f"CORS_ALLOWED_ORIGINS RAW TYPE: {type(CORS_ALLOWED_ORIGINS)}", file=sys.stderr)
    print(f"CORS_ALLOWED_ORIGINS RAW VALUE: {CORS_ALLOWED_ORIGINS}", file=sys.stderr)
else:
    print("CORS_ALLOWED_ORIGINS is NOT defined in this file!", file=sys.stderr)
print(f"ENVIRONMENT VARIABLES DUMP (KEYS ONLY): {list(os.environ.keys())}", file=sys.stderr)
print("="*50 + "\n\n", file=sys.stderr)
# --- FORCE OVERRIDE & DEBUGGING BLOCK ---
# This guarantees that no matter what sets CORS_ALLOWED_ORIGINS earlier,
# any trailing slashes are forcefully stripped before Django processes it.
if "CORS_ALLOWED_ORIGINS" in locals():
    CORS_ALLOWED_ORIGINS = [origin.rstrip("/") for origin in CORS_ALLOWED_ORIGINS]

print("=== DEBUG: RENDER BUILD DIAGNOSTICS ===")
print(f"CORS_ALLOWED_ORIGINS is currently: {CORS_ALLOWED_ORIGINS}")
print("=======================================")
