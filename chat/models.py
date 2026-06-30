from django.db import models
from django.contrib.auth.models import User

# This model stores info about a single chat thread
class Conversation(models.Model):
    # This refers to the person who started the chat
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    
    # This is the name of the chat (e.g. "Talking about Python")
    title = models.CharField(max_length=255, default='New Conversation')
    
    # This tracks exactly when the chat was created
    created_at = models.DateTimeField(auto_now_add=True)

    # This function tells Python how to print this object in the admin panel
    def __str__(self):
        return f"{self.user.username}'s chat: {self.title}"

# This model stores every single message inside a chat
class Message(models.Model):
    # These are the options for who sent the message
    SENDER_OPTIONS = (
        ('user', 'User (The human)'),
        ('ai', 'AI (The robot)'),
    )
    
    # This links the message to a specific conversation
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    
    # Who sent it? User or AI?
    sender = models.CharField(max_length=10, choices=SENDER_OPTIONS)
    
    # What did they say?
    content = models.TextField()
    
    # When did they say it?
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Shows a preview of the message
        return f"{self.sender}: {self.content[:30]}..."

# This model stores details about files uploaded by the user in a conversation
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


# This model extends the default User model with security question data
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    security_question = models.CharField(max_length=255)
    security_answer = models.CharField(max_length=255) # We store the answer as lowercase, trimmed text

    def __str__(self):
        return f"Profile for {self.user.username}"

