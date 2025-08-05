import apiClient from './client';

export const userProfileApi = {
  getProfile: (userId: string) =>
    apiClient.get(`/user-profile/${userId}`).then(res => res.data),
  updateProfile: (userId: string, data: object) =>
    apiClient.put(`/user-profile/${userId}`, data).then(res => res.data),
};
