# services/razorpay_service.py
import razorpay
from fastapi import HTTPException
from utils.config import RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY
import hmac
import hashlib

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY))

def create_order_service(req):
    try:
        order = client.order.create({
            "amount": req.amount * 100,  # amount in paise
            "currency": req.currency,
            "receipt": req.receipt,
            "payment_capture": 1
        })
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def verify_payment_service(req):
    try:
        generated_signature = hmac.new(
            bytes(RAZORPAY_SECRET_KEY, 'utf-8'),
            bytes(f"{req.razorpay_order_id}|{req.razorpay_payment_id}", 'utf-8'),
            hashlib.sha256
        ).hexdigest()
        return generated_signature == req.razorpay_signature
    except Exception as e:
        return False
