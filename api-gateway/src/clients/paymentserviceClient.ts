import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const paymentserviceClient = createBaseClient(servicesConfig.paymentservice);
