from django.db import models
from django.contrib.auth.models import User

class Conversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    
    title = models.CharField(max_length=255, default='New Conversation')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s chat: {self.title}"

class Message(models.Model):
    SENDER_OPTIONS = (
        ('user', 'User (The human)'),
        ('ai', 'AI (The robot)'),
    )
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    
    sender = models.CharField(max_length=10, choices=SENDER_OPTIONS)
    
    content = models.TextField()
    
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.content[:30]}..."

class UploadedFile(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='all_attachments')
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    file = models.FileField(upload_to='attachments/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100) # MIME type
    file_size = models.IntegerField() # File size in bytes
    extracted_text = models.TextField(blank=True, default='')
    summary = models.TextField(blank=True, default='')
    topics = models.JSONField(default=list, blank=True)
    storage_option = models.CharField(max_length=10, default='local') # 'local' or 'cloud'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    security_question = models.CharField(max_length=255)
    security_answer = models.CharField(max_length=255)

    def __str__(self):
        return f"Profile for {self.user.username}"

