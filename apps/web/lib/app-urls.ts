const defaultMarketingUrl = "http://land.localhost";
const defaultAppUrl = "http://localhost";

function getHostName(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export const marketingUrl = defaultMarketingUrl;

export const appUrl = defaultAppUrl;

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
