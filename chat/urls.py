from django.urls import path, include
from .views import (
    SignupView, 
    ConversationListView, 
    ConversationDetailView, 
    MessageListCreateView, 
    MyTokenObtainPairView, 
    UserProfileView,
    UploadedFileUploadView,
    UploadedFileDetailView
)
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

# This is where we list all the chat-related URLs
urlpatterns = [
    # URL for signing up (making a new account)
    path('signup/', SignupView.as_view(), name='signup'),

    # URL for password reset token generation and confirmation
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),

    # URL for fetching the logged-in user's profile
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    # URL for logging in (getting a token)
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # URL for keeping your login active
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # URL for seeing all your chats or starting a new one
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    
    # URL for looking at one specific chat or deleting it
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    
    # URL for sending/receiving messages inside a specific chat
    path('conversations/<int:conversation_id>/messages/', MessageListCreateView.as_view(), name='message-list-create'),

    # URL for uploading files to a conversation
    path('conversations/<int:conversation_id>/files/', UploadedFileUploadView.as_view(), name='uploaded-file-list-create'),

    # URL for deleting/replacing a file
    path('files/<int:pk>/', UploadedFileDetailView.as_view(), name='uploaded-file-detail'),
]

