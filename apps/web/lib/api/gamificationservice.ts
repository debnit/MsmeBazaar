import apiClient from './client';

export const gamificationApi = {
  getUserBadges: (userId: string) =>
    apiClient.get(`/gamification/badges/${userId}`).then(res => res.data),
  awardBadge: (userId: string, badgeId: string) =>
    apiClient.post(`/gamification/award`, { userId, badgeId }).then(res => res.data),
};
