import { config } from "../config/env";
import { createHttpClient } from "./baseClient";

export const msmeClient = createHttpClient(config.MSME_SERVICE_URL);
