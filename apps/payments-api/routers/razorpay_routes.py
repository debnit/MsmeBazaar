import hmac
import hashlib
from fastapi import Request, APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from apps.payments-api.services.razorpay_service import create_order
from decouple import config

router = APIRouter()

RAZORPAY_KEY_SECRET = config("RAZORPAY_KEY_SECRET")

@router.post("/razorpay/create-order")
def initiate_payment(amount: int):
    try:
        order = create_order(amount_paise=amount)
        return {"order_id": order['id'], "amount": order['amount']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify", response_model=dict)
async def verify_payment(request: Request):
    body = await request.json()

    razorpay_order_id = body.get("razorpay_order_id")
    razorpay_payment_id = body.get("razorpay_payment_id")
    razorpay_signature = body.get("razorpay_signature")

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Missing Razorpay fields")

    # Step 1: Generate expected signature
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
        hashlib.sha256
    ).hexdigest()

    # Step 2: Compare with Razorpay signature
    if generated_signature == razorpay_signature:
        # Save to DB, trigger valuation etc.
        return {"status": "success", "verified": True}
    else:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Signature mismatch")
