// src/clients/index.ts
import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

/**
 * Type definition for all available service names.
 * This comes directly from servicesConfig so it's always in sync.
 */
export type ServiceName = keyof typeof servicesConfig;

/**
 * Clients object — dynamically creates a base client for each service.
 * No hardcoding — adding a new service to servicesConfig automatically adds a client here.
 */
export const Clients: Record<ServiceName, ReturnType<typeof createBaseClient>> =
  Object.entries(servicesConfig).reduce((acc, [name, url]) => {
    acc[name as ServiceName] = createBaseClient(url);
    return acc;
  }, {} as Record<ServiceName, ReturnType<typeof createBaseClient>>);

// Example usage:
// await Clients.auth.request({ method: "GET", url: "/users" });
// await Clients.msme.request({ method: "POST", url: "/applications", data: {...} });
