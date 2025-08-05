import apiClient from './client';

export const recommendationApi = {
  getRecommendations: (userId: string, context?: string) =>
    apiClient.get(`/recommendation/user/${userId}`, { params: { context } }).then(res => res.data),
};
