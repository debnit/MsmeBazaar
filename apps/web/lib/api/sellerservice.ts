import apiClient from './client';

export const sellerApi = {
  getSellers: () => apiClient.get('/seller/list').then(res => res.data),
  registerSeller: (data: { name: string; email: string }) =>
    apiClient.post('/seller/register', data).then(res => res.data),
};
