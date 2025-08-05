import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const nbfcserviceClient = createBaseClient(servicesConfig.nbfcservice);
