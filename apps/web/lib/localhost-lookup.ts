import "server-only";

import type { AxiosRequestConfig } from "axios";
import type { LookupAllOptions, LookupOneOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";

function isLocalhostLookupFailure(hostname: string, error: unknown) {
  return (
    hostname.endsWith(".localhost") &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOTFOUND"
  );
}

type NodeLookupOptions = LookupOneOptions | LookupAllOptions;

export const lookupWithLocalhostFallback = (async (
  hostname: string,
  options: object
) => {
  try {
    if (options) {
      return await dnsLookup(hostname, options as NodeLookupOptions);
    }

    return await dnsLookup(hostname);
  } catch (error) {
    if (!isLocalhostLookupFailure(hostname, error)) {
      throw error;
    }

    const lookupOptions = options as { all?: boolean } | undefined;

    if (lookupOptions?.all) {
      return [{ address: "127.0.0.1", family: 4 }];
    }

    return { address: "127.0.0.1", family: 4 };
  }
}) as unknown as NonNullable<AxiosRequestConfig["lookup"]>;
