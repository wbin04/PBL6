import os, time, random
from flask import Flask, render_template, jsonify, request, url_for
from dotenv import load_dotenv
from payos import PaymentData, PayOS

load_dotenv()

payOs = PayOS(
    client_id=os.environ.get('CLIENT_ID'),
    api_key=os.environ.get('API_KEY'),
    checksum_key=os.environ.get('CHECKSUM_KEY')
)

app = Flask(__name__, static_folder='public', static_url_path='', template_folder='public')

@app.route('/')
def index():
    return render_template('checkout.html')

def gen_unique_order_code(base_id: str | int) -> int:
    ts = int(time.time()) % 100
    rnd = random.randint(100, 999)
    return int(f"{int(base_id)}{ts:02d}{rnd}")

def _get_payment_link_info(order_code: int):
    try:
        return payOs.get_payment_link_information(order_code)
    except AttributeError:
        return payOs.getPaymentLinkInformation(order_code)

@app.route('/create_payment_link', methods=['POST'])
def create_payment():
    try:
        data = request.get_json(force=True) or {}
        user_id = data.get('user_id')
        order_id = str(data.get('order_id'))
        amount = int(data.get('amount', 0))
        message = data.get('message') or f"Order #{order_id}"

        if not order_id or amount <= 0:
            return jsonify(error="Thiếu order_id hoặc amount không hợp lệ"), 400

        primary_order_code = int(order_id)
        
        try:
            info = _get_payment_link_info(primary_order_code)
            status = getattr(info, 'status', None) or (info.get('status') if isinstance(info, dict) else None)
            checkout_url = getattr(info, 'checkoutUrl', None) or (info.get('checkoutUrl') if isinstance(info, dict) else None)
            if status in ('PENDING', 'PROCESSING') and checkout_url:
                return jsonify({"checkoutUrl": checkout_url, "status": status, "orderCode": primary_order_code})
            if status == 'PAID':
                return jsonify(error="Đơn này đã thanh toán."), 409
        except Exception:
            pass

        
        new_order_code = gen_unique_order_code(order_id)
        paymentData = PaymentData(
            orderCode=new_order_code,
            amount=amount,
            description=message,
            returnUrl=f"{request.host_url.rstrip('/')}/checkout.html?payos=success",
            cancelUrl=f"{request.host_url.rstrip('/')}/checkout.html?payos=cancel"
        )
        try:
            created = payOs.create_payment_link(paymentData)
        except AttributeError:
            created = payOs.createPaymentLink(paymentData=paymentData)

        checkout_url = getattr(created, 'checkoutUrl', None) or (created.get('checkoutUrl') if isinstance(created, dict) else None)
        if not checkout_url:
            return jsonify(error="Không nhận được checkoutUrl từ PayOS"), 502

        return jsonify({"checkoutUrl": checkout_url, "status": "CREATED", "orderCode": new_order_code})

    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == '__main__':
    app.run(port=7000, debug=True)
