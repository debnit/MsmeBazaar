import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const eaasClient = createBaseClient(servicesConfig.eaas);
