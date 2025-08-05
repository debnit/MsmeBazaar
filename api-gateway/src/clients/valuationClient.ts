import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const valuationClient = createBaseClient(servicesConfig.valuation);
