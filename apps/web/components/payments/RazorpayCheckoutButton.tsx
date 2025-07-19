'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function RazorpayCheckoutButton({
  amount,
  email,
  phone,
  onSuccess,
}: {
  amount: number
  email: string
  phone: string
  onSuccess: (paymentId: string) => void
}) {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  const handleClick = async () => {
    const res = await fetch('/api/payment/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: data.amount,
      currency: 'INR',
      name: 'MSMEBazaar Valuation',
      order_id: data.id,
      prefill: { email, contact: phone },
      handler: async (resp: any) => { onSuccess(resp.razorpay_payment_id) },
    }
    // @ts-ignore
    new window.Razorpay(options).open()
  }

  return <Button onClick={handleClick}>Pay ₹{amount/100} to Unlock Valuation</Button>
}
