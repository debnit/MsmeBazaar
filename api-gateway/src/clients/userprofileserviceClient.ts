import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const userprofileserviceClient = createBaseClient(servicesConfig.userprofileservice);
