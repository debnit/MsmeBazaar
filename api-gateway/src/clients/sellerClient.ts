import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const sellerClient = createBaseClient(servicesConfig.seller);
