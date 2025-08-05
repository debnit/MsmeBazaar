import apiClient from './client';

export const searchMatchmakingApi = {
  searchMatches: (query: string) =>
    apiClient.get('/search-matchmaking/search', { params: { q: query } }).then(res => res.data),
};
