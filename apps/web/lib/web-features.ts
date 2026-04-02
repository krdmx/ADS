import "server-only";

type AppMode = "production" | "frontend-devmode" | "backend-devmode" | string;

export type WebFeatures = {
  appMode: AppMode;
  hideApiEndpoints: boolean;
  enableStatusPage: boolean;
  mockPipelineEnabled: boolean;
};

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function resolveFeatureFlag(value: string | undefined, fallback: boolean) {
  return parseBooleanEnv(value) ?? fallback;
}

export function getWebFeatures(): WebFeatures {
  const appMode = (
    process.env.APP_MODE ??
    process.env.NODE_ENV ??
    "development"
  ).trim() as AppMode;
  const isProductionApp = appMode === "production";
  const mockMode = parseBooleanEnv(process.env.MOCK_MODE);

  return {
    appMode,
    hideApiEndpoints: resolveFeatureFlag(
      process.env.WEB_HIDE_API_ENDPOINTS,
      isProductionApp
    ),
    enableStatusPage: resolveFeatureFlag(
      process.env.WEB_ENABLE_STATUS_PAGE,
      !isProductionApp
    ),
    mockPipelineEnabled:
      mockMode ??
      process.env.APPLICATION_PIPELINE_MODE?.trim().toLowerCase() === "mock",
  };
}
