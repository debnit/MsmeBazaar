import apiClient from './client';

export const msmeListingApi = {
  getAllListings: () => apiClient.get('/msme-listing/all').then(res => res.data),
  getListing: (id: string) => apiClient.get(`/msme-listing/${id}`).then(res => res.data),
};
