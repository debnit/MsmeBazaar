import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const nbfcClient = createBaseClient(servicesConfig.nbfc);
