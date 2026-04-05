import "server-only";

import { createApiClient } from "@/lib/axios-client";
import { apiUrl } from "@/lib/api-config";
import { lookupWithLocalhostFallback } from "@/lib/localhost-lookup";

export const serverApi = createApiClient({
  adapter: "http",
  baseURL: apiUrl,
  lookup: lookupWithLocalhostFallback,
});

export async function getAuthenticatedServerApi() {
  return serverApi;
}
