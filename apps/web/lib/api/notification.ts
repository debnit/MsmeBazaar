import api from "./http";

export const notificationApi = {
  async sendSMS(to: string, message: string) {
    const { data } = await api.post(`/notification/sms`, { to, message });
    return data;
  }
};
