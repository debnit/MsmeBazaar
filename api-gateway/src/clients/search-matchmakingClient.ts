import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const search-matchmakingClient = createBaseClient(servicesConfig.search-matchmaking);
