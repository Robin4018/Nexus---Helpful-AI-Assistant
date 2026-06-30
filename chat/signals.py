import os
from django.dispatch import receiver
# pyrefly: ignore [missing-import]
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.conf import settings

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    # Construct the reset password link pointing to our React frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={reset_password_token.key}"

    # Email text body
    email_plaintext_message = (
        f"Hello {reset_password_token.user.username},\n\n"
        f"You requested a password reset for your Nexus AI account.\n"
        f"Click the link below to set a new password:\n\n"
        f"{reset_url}\n\n"
        f"If you did not request a password reset, please ignore this message.\n\n"
        f"Best regards,\n"
        f"Nexus AI Team"
    )

    # Dispatch email
    mailgun_api_key = getattr(settings, 'MAILGUN_API_KEY', None) or os.getenv('MAILGUN_API_KEY')
    mailgun_domain = getattr(settings, 'MAILGUN_DOMAIN', None) or os.getenv('MAILGUN_DOMAIN')
    sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', None) or os.getenv('SENDGRID_API_KEY')
    
    if mailgun_api_key and mailgun_domain:
        # Mailgun REST API (Uses HTTPS on Port 443 - never blocked by Render)
        try:
            import requests
            url = f"https://api.mailgun.net/v3/{mailgun_domain}/messages"
            auth = ("api", mailgun_api_key)
            data = {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": reset_password_token.user.email,
                "subject": "Password Reset for Nexus AI",
                "text": email_plaintext_message
            }
            response = requests.post(url, auth=auth, data=data)
            if response.status_code not in [200, 201, 202]:
                print(f"--- MAILGUN API ERROR: {response.status_code} - {response.text} ---")
            else:
                print("--- Password reset email successfully dispatched via Mailgun API ---")
        except Exception as e:
            print(f"--- MAILGUN DISPATCH ERROR: {e} ---")
            
    elif sendgrid_api_key:
        # SendGrid REST API (Uses HTTPS on Port 443 - never blocked by Render)
        try:
            import requests
            import json
            
            from_email = settings.DEFAULT_FROM_EMAIL
            sender_name = "Nexus AI"
            sender_email = from_email
            if "<" in from_email and ">" in from_email:
                parts = from_email.split("<")
                sender_name = parts[0].strip()
                sender_email = parts[1].replace(">", "").strip()

            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{"to": [{"email": reset_password_token.user.email}]}],
                "from": {"email": sender_email, "name": sender_name},
                "subject": "Password Reset for Nexus AI",
                "content": [{"type": "text/plain", "value": email_plaintext_message}]
            }
            
            response = requests.post(url, headers=headers, data=json.dumps(payload))
            if response.status_code not in [200, 201, 202]:
                print(f"--- SENDGRID API ERROR: {response.status_code} - {response.text} ---")
            else:
                print("--- Password reset email successfully dispatched via SendGrid API ---")
        except Exception as e:
            print(f"--- SENDGRID DISPATCH ERROR: {e} ---")
    else:
        # Fallback to standard Django send_mail (SMTP or Console logs)
        try:
            send_mail(
                subject="Password Reset for Nexus AI",
                message=email_plaintext_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[reset_password_token.user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"--- SMTP EMAIL DELIVERY ERROR: {e} ---")
