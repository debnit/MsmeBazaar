
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handlePayment = async () => {
    const res = await fetch('/api/payment/create-order', { method: 'POST' });
    const data = await res.json();

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: data.amount,
      currency: 'INR',
      name: 'MSMEBazaar',
      description: 'Instant MSME Valuation',
      order_id: data.id,
      handler: function (response: any) {
        alert('Payment Successful');
        console.log(response);
      },
      prefill: {
        name: 'MSME Founder',
        email: 'founder@msmebazaar.in',
        contact: '9999999999',
      },
      theme: {
        color: '#1e40af',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Instant MSME Valuation</h1>
      <Button onClick={handlePayment}>Pay with Razorpay</Button>
    </div>
  );
}
