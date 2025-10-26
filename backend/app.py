import os
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER)
RECEIVER_EMAIL = os.getenv('RECEIVER_EMAIL', SMTP_USER)

app = Flask(__name__)
CORS(app)

# -------------------------------
# Utility: format order email body
# -------------------------------
def format_order_email(order: dict):
    subject = f"New Mail Order — {order.get('name','(no name)')} — {order.get('id','')}"
    lines = []
    lines.append(f"Order ID: {order.get('id','(none)')}")
    lines.append(f"Date: {order.get('createdAt','(unknown)')}")
    lines.append("")
    lines.append("Customer:")
    lines.append(f"  Name: {order.get('name','')}")
    lines.append(f"  Email: {order.get('email','')}")
    lines.append(f"  Phone: {order.get('phone','')}")
    lines.append("  Address:")
    for l in (order.get('address','') or '').splitlines():
        lines.append(f"    {l}")
    lines.append("")
    lines.append("Items:")
    items = order.get('items', [])
    for it in items:
        title = it.get('title') or it.get('name') or '(item)'
        qty = it.get('qty', it.get('quantity', 1))
        price = float(it.get('price') or 0)
        lines.append(f"  - {title}  x {qty}  @ ${price:.2f}   = ${price * int(qty):.2f}")
    lines.append("")
    lines.append(f"Subtotal: ${float(order.get('subtotal',0)):.2f}")
    lines.append("")
    notes = order.get('notes', '') or order.get('message', '')
    if notes:
        lines.append("Notes:")
        for l in notes.splitlines():
            lines.append(f"  {l}")
        lines.append("")
    lines.append('----')
    lines.append('This order was submitted from your website checkout. Please follow up with the customer for payment if needed.')
    body = "\n".join(lines)
    return subject, body


# -------------------------------
# Utility: send email function
# -------------------------------
def send_email(subject: str, body: str, to_email: str):
    msg = EmailMessage()
    msg['From'] = SMTP_FROM or SMTP_USER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
        s.ehlo()
        if SMTP_PORT == 587:
            s.starttls()
            s.ehlo()
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


# -------------------------------
# Route: Send Order
# -------------------------------
@app.route('/send-order', methods=['POST'])
def send_order():
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'message': 'JSON body required'}), 400
    if not data.get('name') or not data.get('address') or not data.get('items'):
        return jsonify({'ok': False, 'message': 'Missing name, address or items'}), 400

    try:
        subject, body = format_order_email(data)
        send_email(subject, body, RECEIVER_EMAIL)
    except Exception as e:
        print('Error sending email:', e)
        return jsonify({'ok': False, 'message': 'Failed to send email'}), 500

    return jsonify({'ok': True, 'message': 'Order emailed successfully'}), 200


# -------------------------------
# Route: Send Contact Message
# -------------------------------
@app.route('/send-contact', methods=['POST'])
def send_contact():
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'message': 'JSON body required'}), 400

    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not all([name, email, message]):
        return jsonify({'ok': False, 'message': 'Missing fields'}), 400

    subject = f"New Contact Message — {name}"
    body = f"From: {name} <{email}>\n\nMessage:\n{message}"

    try:
        send_email(subject, body, RECEIVER_EMAIL)
    except Exception as e:
        print('Error sending contact email:', e)
        return jsonify({'ok': False, 'message': 'Failed to send message'}), 500

    return jsonify({'ok': True, 'message': 'Message sent successfully'}), 200


# -------------------------------
# Health Check
# -------------------------------
@app.route('/')
def home():
    return jsonify({"status": "ok", "message": "Backend is running"})


# -------------------------------
# Run app
# -------------------------------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=True)
