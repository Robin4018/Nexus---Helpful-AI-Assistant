from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    security_question = serializers.CharField(write_only=True, required=False)
    security_answer = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'security_question', 'security_answer')

    def create(self, validated_data):
        security_question = validated_data.pop('security_question', None)
        security_answer = validated_data.pop('security_answer', None)

        new_user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )

        if security_question and security_answer:
            from .models import UserProfile
            UserProfile.objects.create(
                user=new_user,
                security_question=security_question,
                security_answer=security_answer.strip().lower()
            )
        return new_user

from .models import Conversation, Message, UploadedFile

class UploadedFileSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    def get_file(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        elif obj.file:
            return obj.file.url
        return None

    class Meta:
        model = UploadedFile
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    attachments = UploadedFileSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = '__all__'

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    staged_attachments = serializers.SerializerMethodField()

    def get_staged_attachments(self, obj):
        request = self.context.get('request')
        unstaged = obj.all_attachments.filter(message__isnull=True)
        return UploadedFileSerializer(unstaged, many=True, context={'request': request}).data

    class Meta:
        model = Conversation
        fields = ('id', 'user', 'title', 'created_at', 'messages', 'staged_attachments')
        read_only_fields = ('user',)

