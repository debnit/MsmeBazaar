import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const sellerserviceClient = createBaseClient(servicesConfig.sellerservice);
