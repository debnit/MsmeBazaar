import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const authClient = createBaseClient(servicesConfig.auth);
