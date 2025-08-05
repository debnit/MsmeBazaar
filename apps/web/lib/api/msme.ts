import api from "./http";

cexport const msmeApi = {
  async getBusinessDetails(id: string) {
    const { data } = await api.get(`/msme/business/${id}`);
    return data;
  },
  async createBusiness(payload: any) {
    const { data } = await api.post(`/msme/business`, payload);
    return data;
  }
};
