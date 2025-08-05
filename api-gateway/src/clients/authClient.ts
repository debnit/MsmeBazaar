import { config } from "../config/env";
import { createHttpClient } from "./baseClient";

export const authClient = createHttpClient(config.AUTH_SERVICE_URL);
