import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const searchmatchmakingserviceClient = createBaseClient(servicesConfig.searchmatchmakingservice);
