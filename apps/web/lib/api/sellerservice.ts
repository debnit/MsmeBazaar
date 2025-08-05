import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000/api";

export const sellerserviceClient = axios.create({
  baseURL: `${API_URL}/sellerservice`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Example API Call
export async function example() {
  const { data } = await sellerserviceClient.get("/");
  return data;
}
