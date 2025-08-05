import apiClient from './client';

export const mlMonitoringApi = {
  getMetrics: () => apiClient.get('/ml-monitoring/metrics').then(res => res.data),
  getHealth: () => apiClient.get('/ml-monitoring/health').then(res => res.data),
};
