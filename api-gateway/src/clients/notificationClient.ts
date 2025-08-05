import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const notificationClient = createBaseClient(servicesConfig.notification);
