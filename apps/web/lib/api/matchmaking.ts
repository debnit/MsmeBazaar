import api from "./http";

export const matchmakingApi = {
  async findMatches(businessId: string) {
    const { data } = await api.get(`/matchmaking/matches/${businessId}`);
    return data;
  }
};
