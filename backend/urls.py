"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. 

Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.http import JsonResponse
from django.conf import settings

# This is a tiny function that just says "Hello" when you visit the main page
def welcome_message(request):
    return JsonResponse({'status': 'ok', 'message': 'AI Chat API is running and ready!'})

# This list tells Django which URLs go to which pieces of code
urlpatterns = [
    # When you visit http://localhost:8000/, you see the welcome message
    path('', welcome_message, name='api-root'),
    
    # When you visit http://localhost:8000/admin/, you see the Django Admin panel
    path('admin/', admin.site.urls),
    
    # All of our chat-related links (like signup/chat) start with /api/
    # We tell Django to go look in the 'chat/urls.py' file for more details.
    path('api/', include('chat.urls')),
]

# Serve media files in both development and production (necessary for Render local storage fallback)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

