import { config } from "../config/env";
import { createHttpClient } from "./baseClient";

export const valuationClient = createHttpClient(config.VALUATION_SERVICE_URL);
