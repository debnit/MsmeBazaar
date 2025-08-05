import { z } from "zod";
import dotenvSafe from "dotenv-safe";

dotenvSafe.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GATEWAY_PORT: z.string().default("3000"),
  JWT_SECRET: z.string().min(10),
  FRONTEND_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  MSME_SERVICE_URL: z.string().url(),
  VALUATION_SERVICE_URL: z.string().url(),
  MATCHMAKING_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url()
});

export const config = envSchema.parse(process.env);
