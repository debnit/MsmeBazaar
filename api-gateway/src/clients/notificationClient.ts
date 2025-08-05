import { config } from "../config/env";
import { createHttpClient } from "./baseClient";

export const notificationClient = createHttpClient(config.NOTIFICATION_SERVICE_URL);
