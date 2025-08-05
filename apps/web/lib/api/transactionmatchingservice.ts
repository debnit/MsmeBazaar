import apiClient from './client';

export const transactionMatchingApi = {
  matchTransactions: (data: { userId: string; dateRange: [string, string] }) =>
    apiClient.post('/transaction-matching/match', data).then(res => res.data),
};
