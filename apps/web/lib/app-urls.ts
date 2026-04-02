const defaultMarketingUrl = "http://land.localhost";
const defaultAppUrl = "http://localhost";

function normalizeAbsoluteUrl(
  value: string | undefined,
  fallbackValue: string
) {
  const candidate = (value ?? fallbackValue).trim();

  try {
    return new URL(candidate).toString().replace(/\/+$/, "");
  } catch {
    return fallbackValue;
  }
}

function getHostName(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export const marketingUrl = normalizeAbsoluteUrl(
  process.env.NEXT_PUBLIC_MARKETING_URL,
  defaultMarketingUrl
);

export const appUrl = normalizeAbsoluteUrl(
  process.env.NEXT_PUBLIC_APP_URL,
  defaultAppUrl
);

export function isAppHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  return host.split(":")[0]?.toLowerCase() === getHostName(appUrl);
}

export function isMarketingHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  return host.split(":")[0]?.toLowerCase() === getHostName(marketingUrl);
}

export function buildAppUrl(pathname = "/") {
  return new URL(pathname, `${appUrl}/`).toString();
}

export function buildMarketingUrl(pathname = "/") {
  return new URL(pathname, `${marketingUrl}/`).toString();
}
