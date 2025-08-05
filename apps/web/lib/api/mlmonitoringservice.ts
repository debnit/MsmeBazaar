import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000/api";

export const mlmonitoringserviceClient = axios.create({
  baseURL: `${API_URL}/mlmonitoringservice`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Example API Call
export async function example() {
  const { data } = await mlmonitoringserviceClient.get("/");
  return data;
}
