export const apiUrl = "http://api.localhost";

export function buildApiUrl(path: string) {
  if (!path) {
    return apiUrl;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${normalizedPath}`;
}
