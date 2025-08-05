// src/config/index.ts
import dotenvSafe from "dotenv-safe";
import path from "path";

if (process.env.NODE_ENV !== "production") {
  dotenvSafe.config({
    allowEmptyValues: false,
    path: path.resolve(process.cwd(), ".env"),
    example: path.resolve(process.cwd(), ".env.example"),
  });
}

export const Config = {
  port: parseInt(process.env.GATEWAY_PORT || "6000", 10),
  jwtSecret: process.env.JWT_SECRET!,
  frontendUrl: process.env.FRONTEND_URL || "*",
  services: {
    auth: process.env.AUTH_SERVICE_URL!,
    msme: process.env.MSME_SERVICE_URL!,
    valuation: process.env.VALUATION_SERVICE_URL!,

    
  }
} as const;
