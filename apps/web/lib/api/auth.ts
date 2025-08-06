import apiClient from "./client";

// Auth-specific API instance
export const authApi = {
  example: async () => {
    const { data } = await apiClient.get("/auth");
    return data;
  },
  register: async (payload: any) => {
    const { data } = await apiClient.post("/auth/register", payload);
    return data;
  },
  login: async (payload: any) => {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
};

export default authApi;
