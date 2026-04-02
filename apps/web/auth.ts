import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import type { SyncGoogleUserResponse } from "@repo/contracts";

import { createApiClient } from "@/lib/axios-client";
import { apiUrl } from "@/lib/api-config";
import { appUrl, buildAppUrl, marketingUrl } from "@/lib/app-urls";
import { lookupWithLocalhostFallback } from "@/lib/localhost-lookup";

async function syncGoogleUser(input: {
  googleSub: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<SyncGoogleUserResponse> {
  const internalSecret = process.env.INTERNAL_API_SHARED_SECRET?.trim();

  if (!internalSecret) {
    throw new Error("INTERNAL_API_SHARED_SECRET is not configured.");
  }

  const api = createApiClient({
    adapter: "http",
    baseURL: apiUrl,
    headers: {
      Accept: "application/json",
      "x-internal-app-secret": internalSecret,
    },
    lookup: lookupWithLocalhostFallback,
  });

  const response = await api.post<SyncGoogleUserResponse>(
    "/api/v1/internal/auth/sync",
    input
  );

  return response.data;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        token.googleSub = account.providerAccountId;
      }

      if (
        typeof token.googleSub === "string" &&
        typeof token.email === "string" &&
        (!token.appUserId || account?.provider === "google")
      ) {
        const payload = await syncGoogleUser({
          googleSub: token.googleSub,
          email: token.email,
          name: typeof token.name === "string" ? token.name : null,
          image: typeof token.picture === "string" ? token.picture : null,
        });

        token.appUserId = payload.user.id;
        token.name = payload.user.name ?? token.name;
        token.picture = payload.user.image ?? token.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.appUserId === "string") {
        session.user.id = token.appUserId;
      }

      return session;
    },
    async redirect({ url }) {
      if (url.startsWith("/")) {
        return new URL(url, `${appUrl}/`).toString();
      }

      try {
        const targetUrl = new URL(url);
        const allowedOrigins = new Set([
          new URL(`${appUrl}/`).origin,
          new URL(`${marketingUrl}/`).origin,
        ]);

        if (allowedOrigins.has(targetUrl.origin)) {
          return targetUrl.toString();
        }
      } catch {
        // Fall through to the canonical app landing page.
      }

      return buildAppUrl("/");
    },
  },
};
