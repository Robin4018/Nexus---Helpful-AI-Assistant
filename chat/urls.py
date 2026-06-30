from django.urls import path, include
from .views import (
    SignupView, 
    ConversationListView, 
    ConversationDetailView, 
    MessageListCreateView, 
    MyTokenObtainPairView, 
    UserProfileView,
    UploadedFileUploadView,
    UploadedFileDetailView,
    DeleteAccountView,
    GetSecurityQuestionView,
    VerifySecurityQuestionView
)
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),

    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('password_reset/security_question/', GetSecurityQuestionView.as_view(), name='password_reset_security_question'),
    path('password_reset/security_question/verify/', VerifySecurityQuestionView.as_view(), name='password_reset_security_question_verify'),

    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    path('profile/delete/', DeleteAccountView.as_view(), name='delete-account'),
    
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    
    path('conversations/<int:conversation_id>/messages/', MessageListCreateView.as_view(), name='message-list-create'),

    path('conversations/<int:conversation_id>/files/', UploadedFileUploadView.as_view(), name='uploaded-file-list-create'),

    path('files/<int:pk>/', UploadedFileDetailView.as_view(), name='uploaded-file-detail'),
]

