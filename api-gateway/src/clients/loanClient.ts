import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const loanClient = createBaseClient(servicesConfig.loan);
