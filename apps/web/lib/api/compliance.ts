import apiClient from './client';

export const complianceApi = {
  verifyAadhaar: (aadhaar: string) =>
    apiClient.post('/compliance/aadhaar', { aadhaar }).then(res => res.data),
  verifyGST: (gst: string) =>
    apiClient.post('/compliance/gst', { gst }).then(res => res.data),
  getComplianceStatus: (entityId: string) =>
    apiClient.get(`/compliance/status/${entityId}`).then(res => res.data),
};
