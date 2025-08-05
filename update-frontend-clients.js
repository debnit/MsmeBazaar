// scripts/update-frontend-clients.js
import fs from "fs";
import path from "path";

const services = [
  "auth",
  "msme",
  "valuation",
  "matchmaking",
  "notification",
  "admin",
  "compliance",
  "eaasservice",
  "gamificationservice",
  "loanservice",
  "mlmonitoringservice",
  "msmelistingservice",
  "nbfcservice",
  "paymentservice",
  "recommendationservice",
  "searchmatchmakingservice",
  "sellerservice",
  "transactionmatchingservice",
  "userprofileservice",
];

const baseDir = path.resolve("apps/web/lib/api");
fs.mkdirSync(baseDir, { recursive: true });

services.forEach((service) => {
  const filePath = path.join(baseDir, `${service}.ts`);
  const content = `import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:6000/api";

export const ${service}Client = axios.create({
  baseURL: \`\${API_URL}/${service}\`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Example API Call
export async function example() {
  const { data } = await ${service}Client.get("/");
  return data;
}
`;

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Updated ${service} client`);
});

console.log("🎯 All frontend API clients now use API Gateway.");
