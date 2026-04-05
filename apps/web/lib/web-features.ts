import "server-only";

type AppMode = "local";

export type WebFeatures = {
  appMode: AppMode;
  hideApiEndpoints: boolean;
  enableStatusPage: boolean;
};

export function getWebFeatures(): WebFeatures {
  return {
    appMode: "local",
    hideApiEndpoints: false,
    enableStatusPage: true,
  };
}
