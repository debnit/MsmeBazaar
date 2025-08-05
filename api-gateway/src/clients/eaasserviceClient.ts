import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const eaasserviceClient = createBaseClient(servicesConfig.eaasservice);
