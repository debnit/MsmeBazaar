import apiClient from './client';

export const eaasApi = {
  runAnalysis: (data: object) =>
    apiClient.post('/eaas/analyze', data).then(res => res.data),
};
