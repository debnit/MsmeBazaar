import razorpay
from apps.payments-api.utils.razorpay_config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_order(amount_paise: int, currency="INR", receipt_id="receipt#1"):
    data = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt_id,
        "payment_capture": 1
    }
    return client.order.create(data=data)

def verify_payment_signature(payload, signature, order_id):
    return client.utility.verify_payment_signature({
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payload.get('razorpay_payment_id'),
        'razorpay_signature': signature
    })