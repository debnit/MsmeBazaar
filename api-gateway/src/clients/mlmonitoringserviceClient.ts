import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const mlmonitoringserviceClient = createBaseClient(servicesConfig.mlmonitoringservice);
