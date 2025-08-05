import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const transaction-matchingClient = createBaseClient(servicesConfig.transaction-matching);
