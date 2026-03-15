export type DatabaseStatus = "up" | "down";
export type ServiceStatus = "ok" | "degraded";

export interface ApiStatusResponse {
  service: string;
  environment: string;
  database: DatabaseStatus;
  status: ServiceStatus;
  timestamp: string;
  version: string;
}
