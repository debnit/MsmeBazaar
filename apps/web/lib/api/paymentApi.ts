import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const paymentClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api/payment`,
  headers: {
    "Content-Type": "application/json"
  }
});
