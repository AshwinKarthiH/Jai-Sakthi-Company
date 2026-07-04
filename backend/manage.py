#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jaisakthi.settings")
    try:
        from django.core.management import execute_from_command_line
        import django
        from django.conf import settings
        django.setup()
        
        import sys
        print("==="*15, file=sys.stderr)
        print("MANAGE.PY DIAGNOSTICS:", file=sys.stderr)
        print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE')}", file=sys.stderr)
        print(f"CORS_ALLOWED_ORIGINS from django.conf.settings: {getattr(settings, 'CORS_ALLOWED_ORIGINS', 'NOT SET')}", file=sys.stderr)
        print("==="*15, file=sys.stderr)
        
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
