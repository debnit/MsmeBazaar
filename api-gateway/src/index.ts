import express from "express";
import helmet from "helmet";
import cors from "cors";
import { limiter } from "./middlewares/rateLimiter";
import { correlationId } from "./middlewares/correlationId";
import { errorHandler } from "./middlewares/errorHandler";
import { config } from "./config/env";
import serviceRoutes from "./routes/serviceRoutes";
import { logger } from "./utils/logger";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(limiter);
app.use(correlationId);
app.use("/api", serviceRoutes);
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use(errorHandler);

app.listen(config.gatewayPort, () => {
  logger.info(`API Gateway running on port ${config.gatewayPort}`);
});
