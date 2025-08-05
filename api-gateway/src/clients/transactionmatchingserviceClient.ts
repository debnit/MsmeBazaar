import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const transactionmatchingserviceClient = createBaseClient(servicesConfig.transactionmatchingservice);
