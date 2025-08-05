import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const matchmakingClient = createBaseClient(servicesConfig.matchmaking);
