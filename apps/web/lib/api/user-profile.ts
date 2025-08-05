import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const user-profileClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api/user-profile`,
  headers: {
    "Content-Type": "application/json"
  }
});
