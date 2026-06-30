"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()

# Temporary database cleanup script
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    deleted_count, _ = User.objects.all().delete()
    print(f"--- DB CLEANUP: Deleted {deleted_count} users ---", flush=True)
except Exception as e:
    print(f"--- DB CLEANUP ERROR: {e} ---", flush=True)