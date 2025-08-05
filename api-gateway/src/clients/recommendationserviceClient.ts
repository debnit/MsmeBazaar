import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const recommendationserviceClient = createBaseClient(servicesConfig.recommendationservice);
