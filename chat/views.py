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

# This is where we get our secret API key from the settings file
gemini_key = getattr(settings, 'GEMINI_API_KEY', None)

# We initialize the Gemini Client
client = None
if gemini_key:
    client = genai.Client(api_key=gemini_key)
else:
    print("WARNING: GEMINI_API_KEY is not set in settings. The AI won't work!")



# --- CUSTOM LOGIN VIEWS ---
# These override the default JWT login to also send back the username
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # We add the username to the response
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# --- SIGNUP VIEW ---
# This view helps new users create an account
class SignupView(APIView):
    # Anyone can access this page (obviously, they aren't logged in yet!)
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        # We take the data the user typed in the form
        data_from_user = request.data
        # We use a 'serializer' to turn that data into a User object
        my_serializer = UserSerializer(data=data_from_user)
        
        # We check if the data is valid (like if the username is unique)
        if my_serializer.is_valid():
            # If everything is good, we save the new user to the database
            my_serializer.save()
            # We tell the user you are signed up!
            return Response(my_serializer.data, status=status.HTTP_201_CREATED)
        else:
            # If something is wrong, we show the errors
            return Response(my_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- USER PROFILE VIEW ---
# This view lets the frontend fetch information about the current logged-in user
class UserProfileView(APIView):
    def get(self, request):
        # We use the UserSerializer to turn the current user object into JSON
        my_serializer = UserSerializer(request.user)
        return Response(my_serializer.data)

# --- CONVERSATION LIST VIEW ---
# This view shows all the chats the logged-in user has
class ConversationListView(APIView):
    def get(self, request):
        # We find all conversations that belong to the current user
        # We also put the newest ones at the top
        user_chats = Conversation.objects.filter(user=request.user).order_by('-created_at')
        # We turn those database objects into a simple list (JSON)
        my_serializer = ConversationSerializer(user_chats, many=True, context={'request': request})
        # We send that list back to the frontend
        return Response(my_serializer.data)

    def post(self, request):
        # This handles creating a brand new chat thread
        # We make a serializer and tell it which user owns this chat
        my_serializer = ConversationSerializer(data=request.data, context={'request': request})
        if my_serializer.is_valid():
            # We pass the 'user' manually here
            my_serializer.save(user=request.user)
            return Response(my_serializer.data, status=status.HTTP_201_CREATED)
        return Response(my_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- CONVERSATION DETAIL VIEW ---
# This view lets you see or delete one specific chat
class ConversationDetailView(APIView):
    def get(self, request, pk):
        try:
            # Try to find the chat by its ID (pk)
            this_chat = Conversation.objects.get(pk=pk, user=request.user)
            my_serializer = ConversationSerializer(this_chat, context={'request': request})
            return Response(my_serializer.data)
        except Conversation.DoesNotExist:
            # If it doesn't exist, tell them 'Oops'
            return Response({'error': 'Chat not found!'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            # Find it and delete it forever
            this_chat = Conversation.objects.get(pk=pk, user=request.user)
            this_chat.delete()
            # 204 means 'Success, but there is nothing left to show'
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Conversation.DoesNotExist:
            return Response({'error': 'Could not find that chat to delete.'}, status=status.HTTP_404_NOT_FOUND)

# --- MESSAGE VIEW ---
# This is the big one! It handles sending messages and getting AI replies
class MessageListCreateView(APIView):
    def get(self, request, conversation_id):
        # Get all messages for this specific chat, sorted by time
        all_messages = Message.objects.filter(
            conversation__id=conversation_id, 
            conversation__user=request.user
        ).order_by('timestamp')
        
        my_serializer = MessageSerializer(all_messages, many=True, context={'request': request})
        return Response(my_serializer.data)

    def post(self, request, conversation_id):
        # We need a special tool to find the chat or error out
        from django.shortcuts import get_object_or_404
        
        try:
            # 1. Find the chat thread
            this_conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
            
            # 2. Check if this is a regenerate request
            is_regenerate = request.data.get('regenerate', False)

            if is_regenerate:
                # Find the last message in this conversation
                last_message = this_conversation.messages.order_by('timestamp').last()
                if not last_message or last_message.sender != 'user':
                    return Response({'error': 'No user message found to regenerate a response for.'}, status=status.HTTP_400_BAD_REQUEST)
                new_user_msg = last_message
                user_text = new_user_msg.content
                has_files_staged = False
            else:
                # Get the text the user sent
                user_text = request.data.get('content', '').strip()
                
                # Check if they have files staged (attached but not yet part of any message)
                staged_attachments = this_conversation.all_attachments.filter(message__isnull=True)
                has_files_staged = staged_attachments.exists()

                # Check if they actually typed something or have files uploaded
                if not user_text and not has_files_staged:
                    return Response({'error': 'Please type a message or upload a file!'}, status=status.HTTP_400_BAD_REQUEST)

                # 3. Save the user's message to our database
                new_user_msg = Message.objects.create(
                    conversation=this_conversation,
                    sender='user',
                    content=user_text
                )

                # Associate all staged/unstaged files with this new message
                if has_files_staged:
                    for att in staged_attachments:
                        att.message = new_user_msg
                        att.save()

                # 4. If this is the first message, change the chat title to match
                total_messages_so_far = this_conversation.messages.count()
                if total_messages_so_far == 1:
                    # If message is empty but there's a file, set the title to the file name
                    if not user_text and has_files_staged:
                        first_file = new_user_msg.attachments.first()
                        this_conversation.title = f"Document: {first_file.file_name[:40]}"
                    else:
                        this_conversation.title = user_text[:50]
                    this_conversation.save()

            # 5. Now we talk to the AI (Gemini)
            if client is None:
                return Response({'error': 'AI is not ready. Call the developer!'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # We need to tell the AI what we talked about before
            all_past_messages = list(Message.objects.filter(conversation=this_conversation).order_by('timestamp'))
            
            # Formatting history for Gemini
            # CRITICAL: Roles must alternate (user -> model -> user). 
            contents = []
            if len(all_past_messages) > 1:
                current_role = None
                current_parts = []
                
                # We process all messages except the very last one (which is the current user_text)
                for m in all_past_messages[:-1]:
                    role = "user" if m.sender == 'user' else "model"
                    
                    if role == current_role:
                        current_parts.append(m.content)
                    else:
                        if current_role:
                            contents.append(types.Content(role=current_role, parts=[types.Part(text="\n".join(current_parts))]))
                        current_role = role
                        current_parts = [m.content]
                
                if current_role:
                    contents.append(types.Content(role=current_role, parts=[types.Part(text="\n".join(current_parts))]))
            
            # Build files context from all uploads in this conversation
            all_atts = this_conversation.all_attachments.all()
            files_context = ""
            if all_atts.exists():
                files_context = "CONTEXT FROM FILES UPLOADED BY USER:\n"
                for att in all_atts:
                    files_context += f"\n--- Start File: {att.file_name} ---\n{att.extracted_text}\n--- End File: {att.file_name} ---\n"
                files_context += "\nUse the above context to answer the user query. Always cite sources where appropriate (e.g. document name and page number/section if available).\n\n"

            # If the last turn was 'user', we pull it out and merge with current
            final_user_text = user_text
            if contents and contents[-1].role == "user":
                last_user_parts = [p.text for p in contents[-1].parts]
                extra_context = "\n".join(last_user_parts)
                final_user_text = f"{extra_context}\n{user_text}"
                contents.pop()

            # Prepend context from uploaded files to the user's active prompt
            if files_context:
                final_user_text = f"{files_context}USER QUERY: {final_user_text}"

            # Add the current user message as the final item in contents
            contents.append(types.Content(role="user", parts=[types.Part(text=final_user_text)]))

            # Try to get an answer from Gemini
            try:
                # In the new SDK, we use generate_content
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction="You are a helpful assistant named Nexus AI. Provide the answers politely and correctly. When answering queries based on the uploaded file contexts, always show citations or references to target documents/source sections. If the user asks you to translate, compare, or extract action items, do it cleanly with headings/bullet points."
                    )
                )
                
                # Extract the text safely.
                if response.text:
                    ai_text_final = response.text
                else:
                    ai_text_final = "I'm sorry, I cannot process that request right now."
                    
            except Exception as error:
                # This happens if there's an API error
                print(f"Oops, Gemini had an error: {error}")
                if 'quota' in str(error).lower():
                    return Response(
                        {'error': 'The AI is currently busy or we hit the usage limit. Try again later!'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
                # If it's a different error, just re-raise it for the outer catch block
                raise

            # 6. Save the AI's reply to our database too
            new_ai_msg = Message.objects.create(
                conversation=this_conversation,
                sender='ai',
                content=ai_text_final
            )

            # 7. Send both messages back to the website so they show up on screen
            return Response({
                'user_message': MessageSerializer(new_user_msg, context={'request': request}).data,
                'ai_message': MessageSerializer(new_ai_msg, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)

        except Exception as big_error:
            # This is our safety net if anything goes wrong in the whole process
            import traceback
            error_details = traceback.format_exc()
            print(f"A big error happened: {str(big_error)}")
            print(error_details)
            return Response({
                'error': 'Internal server error! Something went wrong please stand-by.',
                'message': str(big_error),
                'details': error_details
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- FILE UPLOAD AND MANAGING VIEWS ---
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

        # Create record in DB
        new_file = UploadedFile.objects.create(
            conversation=conversation,
            file=uploaded_file,
            file_name=uploaded_file.name,
            file_type=uploaded_file.content_type or 'application/octet-stream',
            file_size=uploaded_file.size,
            storage_option=storage_option
        )

        # Analyze using utility helper (OCR, text extraction, summary)
        try:
            analyze_file_content(client, new_file)
        except Exception as analysis_err:
            print(f"Error during file analysis: {analysis_err}")
            # Still save but register analysis error
            new_file.extracted_text = f"Error during parsing analysis: {str(analysis_err)}"
            new_file.summary = "Processing error."
            new_file.save()

        serializer = UploadedFileSerializer(new_file, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UploadedFileDetailView(APIView):
    def delete(self, request, pk):
        try:
            file_record = UploadedFile.objects.get(pk=pk, conversation__user=request.user)
            # Delete direct file from storage
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
        # Clean up files from disk before cascade deletion
        files = UploadedFile.objects.filter(conversation__user=user)
        for f in files:
            if f.file and os.path.exists(f.file.path):
                try:
                    os.remove(f.file.path)
                except OSError as os_err:
                    print(f"Error deleting file from disk: {os_err}")
        user.delete()
        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_200_OK)

