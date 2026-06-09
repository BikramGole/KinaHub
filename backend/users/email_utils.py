import os
from email.mime.image import MIMEImage
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


LOGO_PATH = os.path.join(
    settings.BASE_DIR,
    '..', 'frontend', 'public', 'logo_navbar-light.png'
)


def send_otp_email(to_email: str, otp: str, subject: str):
    """Send a styled OTP email with the KinaHub logo attached inline."""
    otp_display = f"{otp[:3]} {otp[3:]}"
    text_content = f"Your verification code is: {otp}. It expires in 5 minutes."
    html_content = render_to_string("emails/otp.html", {"otp_code": otp_display})

    msg = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [to_email],
    )
    msg.attach_alternative(html_content, "text/html")

    # Attach logo as inline image
    logo_path = os.path.normpath(LOGO_PATH)
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
        logo_mime = MIMEImage(logo_data)
        logo_mime.add_header('Content-ID', '<logo>')
        logo_mime.add_header('Content-Disposition', 'inline', filename='logo.png')
        msg.attach(logo_mime)

    msg.send(fail_silently=False)
