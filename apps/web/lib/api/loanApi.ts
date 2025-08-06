import axios from "axios";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000";

export const loanApi = axios.create({
  baseURL: `${API_GATEWAY_URL}/api/loan`,
  headers: {
    "Content-Type": "application/json"
  }
});
