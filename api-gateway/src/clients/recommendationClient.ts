import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const recommendationClient = createBaseClient(servicesConfig.recommendation);
