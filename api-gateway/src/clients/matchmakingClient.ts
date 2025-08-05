import { config } from "../config/env";
import { createHttpClient } from "./baseClient";

export const matchmakingClient = createHttpClient(config.MATCHMAKING_SERVICE_URL);
