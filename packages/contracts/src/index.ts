export type DatabaseStatus = "up" | "down";
export type ServiceStatus = "ok" | "degraded";
export type ApplicationTicketStatus = "processing" | "completed" | "failed";

export interface ApiStatusResponse {
  service: string;
  environment: string;
  database: DatabaseStatus;
  status: ServiceStatus;
  timestamp: string;
  version: string;
}

export interface CreateApplicationRequest {
  vacancyDescription: string;
  fullName: string;
}

export interface CreateApplicationResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  createdAt: string;
}

export interface ApplicationTicketListItemResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  fullName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetApplicationsResponse {
  applications: ApplicationTicketListItemResponse[];
}

export interface ApplicationResultFileResponse {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export interface ApplicationTicketResultResponse {
  personalNote: string;
  createdAt: string;
  updatedAt: string;
  cv: ApplicationResultFileResponse;
  coverLetter: ApplicationResultFileResponse;
}

export interface GetApplicationTicketResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  fullName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  result: ApplicationTicketResultResponse | null;
}

export interface GetBaseCvResponse {
  baseCv: string;
}

export interface UpdateBaseCvRequest {
  baseCv: string;
}

export interface GetWorkTasksResponse {
  workTasks: string;
}

export interface UpdateWorkTasksRequest {
  workTasks: string;
}
