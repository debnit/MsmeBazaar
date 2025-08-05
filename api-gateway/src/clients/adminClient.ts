import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const adminClient = createBaseClient(servicesConfig.admin);
