import apiClient from './client';

export const nbfcApi = {
  getNBFCList: () => apiClient.get('/nbfc/list').then(res => res.data),
  getNBFCDetails: (id: string) =>
    apiClient.get(`/nbfc/${id}`).then(res => res.data),
};
