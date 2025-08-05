import apiClient from './client';

export const loanApi = {
  getLoans: (userId: string) =>
    apiClient.get(`/loan/user/${userId}`).then(res => res.data),
  applyLoan: (data: object) =>
    apiClient.post('/loan/apply', data).then(res => res.data),
};
