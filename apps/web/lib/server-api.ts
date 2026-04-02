import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { buildAppUrl } from "@/lib/app-urls";
import { createApiClient } from "@/lib/axios-client";
import { apiUrl } from "@/lib/api-config";
import { lookupWithLocalhostFallback } from "@/lib/localhost-lookup";

export const serverApi = createApiClient({
  adapter: "http",
  baseURL: apiUrl,
  lookup: lookupWithLocalhostFallback,
});

function getInternalApiSharedSecret() {
  const secret = process.env.INTERNAL_API_SHARED_SECRET?.trim();

  if (!secret) {
    throw new Error("INTERNAL_API_SHARED_SECRET is not configured.");
  }

  return secret;
}

export async function requireAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id?.trim();

  if (!userId) {
    redirect(buildAppUrl("/auth/sign-in"));
  }

  return userId;
}

export async function getAuthenticatedServerApi() {
  const userId = await requireAuthenticatedUserId();

  return createApiClient({
    adapter: "http",
    baseURL: apiUrl,
    headers: {
      "x-internal-app-secret": getInternalApiSharedSecret(),
      "x-user-id": userId,
    },
    lookup: lookupWithLocalhostFallback,
  });
}
