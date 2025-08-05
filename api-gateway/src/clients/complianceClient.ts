import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const complianceClient = createBaseClient(servicesConfig.compliance);
