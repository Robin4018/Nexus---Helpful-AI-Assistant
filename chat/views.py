from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Conversation, Message, UploadedFile
from .serializers import UserSerializer, ConversationSerializer, MessageSerializer, UploadedFileSerializer
from .utils import extract_text_from_file, analyze_file_content
from django.conf import settings
from google import genai
from google.genai import types
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
import os

gemini_key = getattr(settings, 'GEMINI_API_KEY', None)

client = None
if gemini_key:
    client = genai.Client(api_key=gemini_key)
else:
    print("WARNING: GEMINI_API_KEY is not set in settings. The AI won't work!")

# CUSTOM LOGIN VIEWS
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# SIGNUP VIEW
class SignupView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        data_from_user = request.data
        my_serializer = UserSerializer(data=data_from_user)
        
        if my_serializer.is_valid():
            my_serializer.save()
            return Response(my_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(my_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# USER PROFILE VIEW
class UserProfileView(APIView):
    def get(self, request):
        my_serializer = UserSerializer(request.user)
        return Response(my_serializer.data)

# CONVERSATION LIST VIEW
class ConversationListView(APIView):
    def get(self, request):
        user_chats = Conversation.objects.filter(user=request.user).order_by('-created_at')
        my_serializer = ConversationSerializer(user_chats, many=True, context={'request': request})
        return Response(my_serializer.data)

    def post(self, request):
        my_serializer = ConversationSerializer(data=request.data, context={'request': request})
        if my_serializer.is_valid():
            my_serializer.save(user=request.user)
            return Response(my_serializer.data, status=status.HTTP_201_CREATED)
        return Response(my_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# CONVERSATION DETAIL VIEW
class ConversationDetailView(APIView):
    def get(self, request, pk):
        try:
            this_chat = Conversation.objects.get(pk=pk, user=request.user)
            my_serializer = ConversationSerializer(this_chat, context={'request': request})
            return Response(my_serializer.data)
        except Conversation.DoesNotExist:
            return Response({'error': 'Chat not found!'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            this_chat = Conversation.objects.get(pk=pk, user=request.user)
            this_chat.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Conversation.DoesNotExist:
            return Response({'error': 'Could not find that chat to delete.'}, status=status.HTTP_404_NOT_FOUND)

# MESSAGE VIEW
class MessageListCreateView(APIView):
    def get(self, request, conversation_id):
        all_messages = Message.objects.filter(
            conversation__id=conversation_id, 
            conversation__user=request.user
        ).order_by('timestamp')
        
        my_serializer = MessageSerializer(all_messages, many=True, context={'request': request})
        return Response(my_serializer.data)

    def post(self, request, conversation_id):
        from django.shortcuts import get_object_or_404
        
        try:
            this_conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
            
            is_regenerate = request.data.get('regenerate', False)

            if is_regenerate:
                last_message = this_conversation.messages.order_by('timestamp').last()
                if not last_message or last_message.sender != 'user':
                    return Response({'error': 'No user message found to regenerate a response for.'}, status=status.HTTP_400_BAD_REQUEST)
                new_user_msg = last_message
                user_text = new_user_msg.content
                has_files_staged = False
            else:
                user_text = request.data.get('content', '').strip()
                
                staged_attachments = this_conversation.all_attachments.filter(message__isnull=True)
                has_files_staged = staged_attachments.exists()

                if not user_text and not has_files_staged:
                    return Response({'error': 'Please type a message or upload a file!'}, status=status.HTTP_400_BAD_REQUEST)

                new_user_msg = Message.objects.create(
                    conversation=this_conversation,
                    sender='user',
                    content=user_text
                )

                if has_files_staged:
                    for att in staged_attachments:
                        att.message = new_user_msg
                        att.save()

                total_messages_so_far = this_conversation.messages.count()
                if total_messages_so_far == 1:
                    if not user_text and has_files_staged:
                        first_file = new_user_msg.attachments.first()
                        this_conversation.title = f"Document: {first_file.file_name[:40]}"
                    else:
                        this_conversation.title = user_text[:50]
                    this_conversation.save()

            if client is None:
                return Response({'error': 'AI is not ready. Call the developer!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            all_past_messages = list(Message.objects.filter(conversation=this_conversation).order_by('timestamp'))
            
            def get_message_content_with_attachments(m):
                m_text = m.content
                atts = m.attachments.all()
                if atts.exists():
                    files_context = "CONTEXT FROM FILES UPLOADED BY USER:\n"
                    for att in atts:
                        files_context += f"\n--- Start File: {att.file_name} ---\n{att.extracted_text}\n--- End File: {att.file_name} ---\n"
                    files_context += "\nUse the above context to answer the user query. Always cite sources where appropriate (e.g. document name and page number/section if available).\n\n"
                    m_text = f"{files_context}USER QUERY: {m_text}"
                return m_text

            contents = []
            if len(all_past_messages) > 1:
                current_role = None
                current_parts = []
                
                for m in all_past_messages[:-1]:
                    role = "user" if m.sender == 'user' else "model"
                    m_text = get_message_content_with_attachments(m) if role == "user" else m.content
                    
                    if role == current_role:
                        current_parts.append(m_text)
                    else:
                        if current_role:
                            contents.append(types.Content(role=current_role, parts=[types.Part(text="\n".join(current_parts))]))
                        current_role = role
                        current_parts = [m_text]
                
                if current_role:
                    contents.append(types.Content(role=current_role, parts=[types.Part(text="\n".join(current_parts))]))

            final_user_text = get_message_content_with_attachments(new_user_msg)
            if contents and contents[-1].role == "user":
                last_user_parts = [p.text for p in contents[-1].parts]
                extra_context = "\n".join(last_user_parts)
                final_user_text = f"{extra_context}\n{final_user_text}"
                contents.pop()

            contents.append(types.Content(role="user", parts=[types.Part(text=final_user_text)]))
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        tools=[{'google_search': {}}],
                        system_instruction="You are a helpful assistant named Nexus AI. Provide the answers politely and correctly. When answering queries based on the uploaded file contexts, always show citations or references to target documents/source sections. If the user asks you to translate, compare, or extract action items, do it cleanly with headings/bullet points."
                    )
                )
                
                if response.text:
                    ai_text_final = response.text
                else:
                    ai_text_final = "I'm sorry, I cannot process that request right now."
                    
            except Exception as error:
                # Handling API error
                print(f"Oops, Gemini had an error: {error}")
                if 'quota' in str(error).lower():
                    return Response(
                        {'error': 'The AI is currently busy or we hit the usage limit. Try again later!'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
                raise

            new_ai_msg = Message.objects.create(
                conversation=this_conversation,
                sender='ai',
                content=ai_text_final
            )

            return Response({
                'user_message': MessageSerializer(new_user_msg, context={'request': request}).data,
                'ai_message': MessageSerializer(new_ai_msg, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)

        except Exception as big_error:
            import traceback
            error_details = traceback.format_exc()
            print(f"A big error happened: {str(big_error)}")
            print(error_details)
            return Response({
                'error': 'Internal server error! Something went wrong please stand-by.',
                'message': str(big_error),
                'details': error_details
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# FILE UPLOAD AND MANAGING VIEWS 
class UploadedFileUploadView(APIView):
    def post(self, request, conversation_id):
        from django.shortcuts import get_object_or_404
        conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file was provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # File size limits (10MB per file)
        max_file_size = 10 * 1024 * 1024
        if uploaded_file.size > max_file_size:
            return Response({'error': 'File is too large. Max limit is 10MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Combined size limit (30MB total)
        current_total_size = sum(att.file_size for att in conversation.all_attachments.all())
        if current_total_size + uploaded_file.size > 30 * 1024 * 1024:
            return Response({'error': 'Session limit exceeded. Combined size of attachments in this chat cannot exceed 30MB.'}, status=status.HTTP_400_BAD_REQUEST)

        storage_option = request.data.get('storage_option', 'local')

        # Creatinig record in DB
        new_file = UploadedFile.objects.create(
            conversation=conversation,
            file=uploaded_file,
            file_name=uploaded_file.name,
            file_type=uploaded_file.content_type or 'application/octet-stream',
            file_size=uploaded_file.size,
            storage_option=storage_option
        )

        # OCR, text extraction, summary
        try:
            analyze_file_content(client, new_file)
        except Exception as analysis_err:
            print(f"Error during file analysis: {analysis_err}")
            new_file.extracted_text = f"Error during parsing analysis: {str(analysis_err)}"
            new_file.summary = "Processing error."
            new_file.save()

        serializer = UploadedFileSerializer(new_file, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UploadedFileDetailView(APIView):
    def delete(self, request, pk):
        try:
            file_record = UploadedFile.objects.get(pk=pk, conversation__user=request.user)
            if file_record.file and os.path.exists(file_record.file.path):
                try:
                    os.remove(file_record.file.path)
                except OSError as os_err:
                    print(f"Error removing file from disk: {os_err}")
            file_record.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found.'}, status=status.HTTP_404_NOT_FOUND)

class DeleteAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request):
        user = request.user
        files = UploadedFile.objects.filter(conversation__user=user)
        for f in files:
            if f.file and os.path.exists(f.file.path):
                try:
                    os.remove(f.file.path)
                except OSError as os_err:
                    print(f"Error deleting file from disk: {os_err}")
        user.delete()
        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_200_OK)


class GetSecurityQuestionView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        identity = request.data.get('identity', '').strip() # can be username or email
        if not identity:
            return Response({'error': 'Please enter your username or email address.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(username=identity).first() or User.objects.filter(email=identity).first()
        if not user:
            return Response({'error': 'No account associated with that username or email address.'}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            profile = user.profile
            if not profile.security_question:
                return Response({'error': 'No security question set up for this account.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'security_question': profile.security_question}, status=status.HTTP_200_OK)
        except User.profile.RelatedObjectDoesNotExist:
            return Response({'error': 'No security question set up for this account.'}, status=status.HTTP_400_BAD_REQUEST)


class VerifySecurityQuestionView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        identity = request.data.get('identity', '').strip()
        answer = request.data.get('security_answer', '').strip().lower()
        new_password = request.data.get('new_password', '').strip()

        if not identity or not answer or not new_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username=identity).first() or User.objects.filter(email=identity).first()
        if not user:
            return Response({'error': 'No account associated with that username or email address.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            profile = user.profile
            if profile.security_answer.strip().lower() == answer:
                user.set_password(new_password)
                user.save()
                return Response({'detail': 'Password updated successfully!'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Incorrect security answer.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.profile.RelatedObjectDoesNotExist:
            return Response({'error': 'No security question set up for this account.'}, status=status.HTTP_400_BAD_REQUEST)

