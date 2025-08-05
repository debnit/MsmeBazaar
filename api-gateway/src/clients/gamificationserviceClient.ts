import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const gamificationserviceClient = createBaseClient(servicesConfig.gamificationservice);
