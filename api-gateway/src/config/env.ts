import dotenv from "dotenv";
dotenv.config();

export const config = {
  gatewayPort: Number(process.env.GATEWAY_PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "changeme"
};
