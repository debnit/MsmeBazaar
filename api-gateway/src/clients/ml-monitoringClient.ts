import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const ml-monitoringClient = createBaseClient(servicesConfig.ml-monitoring);
