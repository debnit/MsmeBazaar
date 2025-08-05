import apiClient from './client';

export const paymentsApi = {
  createPayment: (data: { orderId: string; amount: number }) =>
    apiClient.post('/payments/create', data).then(res => res.data),
  verifyPayment: (data: { paymentId: string; sig: string }) =>
    apiClient.post('/payments/verify', data).then(res => res.data),
};
