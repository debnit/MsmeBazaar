import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const loanserviceClient = createBaseClient(servicesConfig.loanservice);
