from django.dispatch import receiver
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

    # Dispatch email (will print to console by default in development)
    try:
        send_mail(
            subject="Password Reset for Nexus AI",
            message=email_plaintext_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[reset_password_token.user.email],
            fail_silently=False,
        )
    except Exception as e:
        # Print SMTP errors to the console logs so you can see why Google failed to authenticate
        print(f"--- SMTP EMAIL DELIVERY ERROR: {e} ---")
