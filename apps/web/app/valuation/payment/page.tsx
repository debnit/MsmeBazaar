'use client'



import { Button } from '@/components/ui/button';
import RazorpayCheckoutButton from '@/components/payments/RazorpayCheckoutButton';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'

export default function PaymentPage() {
  const router = useRouter()

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Valuation Payment</h1>
      <RazorpayCheckoutButton
        amount={19900}
        email="user@example.com"
        phone="9999999999"
        onSuccess={async (paymentId) => {
          await fetch('/api/payment/razorpay/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ razorpay_payment_id: paymentId })
          })
          router.push('/valuation/payment/success')
        }}
      />
    </div>
  )
}

