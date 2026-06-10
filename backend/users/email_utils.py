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


def send_welcome_email(to_email: str, name: str = ""):
    subject = "Welcome to KinaHub"
    first_name = name.split(" ", 1)[0] if name else "there"
    text_content = (
        f"Welcome to KinaHub, {first_name}.\n\n"
        "KinaHub is your local commerce marketplace for shopping from real seller stores.\n"
        "Browse products, compare deals, order locally, and track everything in one place."
    )
    html_content = render_to_string("emails/welcome.html", {"name": name or first_name})

    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [to_email])
    msg.attach_alternative(html_content, "text/html")

    logo_path = os.path.normpath(LOGO_PATH)
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
        logo_mime = MIMEImage(logo_data)
        logo_mime.add_header('Content-ID', '<logo>')
        logo_mime.add_header('Content-Disposition', 'inline', filename='logo.png')
        msg.attach(logo_mime)

    msg.send(fail_silently=False)


def send_password_reset_email(to_email: str, otp: str):
    subject = "Reset your KinaHub password"
    otp_display = f"{otp[:3]} {otp[3:]}"
    text_content = (
        f"Use this code to reset your KinaHub password: {otp}.\n"
        "It expires in 5 minutes."
    )
    html_content = render_to_string("emails/password_reset.html", {"otp_code": otp_display})

    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [to_email])
    msg.attach_alternative(html_content, "text/html")

    logo_path = os.path.normpath(LOGO_PATH)
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
        logo_mime = MIMEImage(logo_data)
        logo_mime.add_header('Content-ID', '<logo>')
        logo_mime.add_header('Content-Disposition', 'inline', filename='logo.png')
        msg.attach(logo_mime)

    msg.send(fail_silently=False)


def send_promo_email(to_email: str, subject: str, headline: str, body: str, cta_text: str = "Shop now", cta_url: str = "http://localhost:5173/products"):
    text_content = f"{headline}\n\n{body}\n\n{cta_text}: {cta_url}"
    html_content = render_to_string(
        "emails/promo.html",
        {"headline": headline, "body": body, "cta_text": cta_text, "cta_url": cta_url},
    )
    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [to_email])
    msg.attach_alternative(html_content, "text/html")

    logo_path = os.path.normpath(LOGO_PATH)
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
        logo_mime = MIMEImage(logo_data)
        logo_mime.add_header('Content-ID', '<logo>')
        logo_mime.add_header('Content-Disposition', 'inline', filename='logo.png')
        msg.attach(logo_mime)

    msg.send(fail_silently=False)
