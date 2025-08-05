import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const ml-monitoringClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api/ml-monitoring`,
  headers: {
    "Content-Type": "application/json"
  }
});
