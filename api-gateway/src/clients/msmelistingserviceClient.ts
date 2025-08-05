import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const msmelistingserviceClient = createBaseClient(servicesConfig.msmelistingservice);
