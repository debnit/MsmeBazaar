import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config/env";
import { limiter } from "./middlewares/rateLimiter";
import { verifyJwt } from "./middlewares/auth";
import { correlationId } from "./middlewares/correlationId";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import serviceRoutes from "./routes/serviceRoutes";
import { logger } from "./utils/logger";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(correlationId);
app.use(requestLogger);
app.use(limiter);

app.get("/health", (_, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// API versioning
app.use("/api/v1", serviceRoutes);

app.use(errorHandler);

const server = app.listen(config.GATEWAY_PORT, () => {
  logger.info(`🚀 API Gateway running on port ${config.GATEWAY_PORT}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  logger.info("Shutting down API Gateway...");
  server.close(() => {
    logger.info("✅ Gateway stopped.");
    process.exit(0);
  });
}
