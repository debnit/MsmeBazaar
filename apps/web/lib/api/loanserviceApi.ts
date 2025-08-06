import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000/api";

export const loanserviceApi = axios.create({
  baseURL: `${API_URL}/loanservice`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Example API Call
export async function example() {
  const { data } = await loanserviceApi.get("/");
  return data;
}
