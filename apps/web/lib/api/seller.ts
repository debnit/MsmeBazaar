import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const sellerClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api/seller`,
  headers: {
    "Content-Type": "application/json"
  }
});
