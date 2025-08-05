import api from "./http";

export const valuationApi = {
  async getValuationReport(businessId: string) {
    const { data } = await api.get(`/valuation/report/${businessId}`);
    return data;
  }
};
