export type DatabaseStatus = "up" | "down";
export type ServiceStatus = "ok" | "degraded";
export type ApplicationTicketStatus = "processing" | "completed" | "failed";
export const APPLICATION_BOARD_STAGE_ORDER = [
  "resume_sent",
  "hr_screening",
  "technical_interview",
  "system_design",
  "algorithm_session",
  "custom_status",
  "passed",
  "failed",
  "ignored",
] as const;
export type ApplicationBoardStage =
  (typeof APPLICATION_BOARD_STAGE_ORDER)[number];
export const APPLICATION_JOB_SITE_OPTIONS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Wellfound",
  "Greenhouse",
  "Lever",
  "Company Site",
  "Other",
] as const;
export type ApplicationJobSitePreset =
  (typeof APPLICATION_JOB_SITE_OPTIONS)[number];
export const APPLICATION_COMPENSATION_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "ILS",
  "PLN",
  "CAD",
  "AUD",
] as const;
export type ApplicationCompensationCurrency =
  (typeof APPLICATION_COMPENSATION_CURRENCIES)[number];
export const APPLICATION_COMPENSATION_PERIODS = [
  "yearly",
  "monthly",
  "hourly",
] as const;
export type ApplicationCompensationPeriod =
  (typeof APPLICATION_COMPENSATION_PERIODS)[number];
export const APPLICATION_NORMALIZED_CURRENCY = "USD" as const;
export type ApplicationNormalizedCurrency =
  typeof APPLICATION_NORMALIZED_CURRENCY;
export const APPLICATION_COMPANY_SUMMARY_TYPES = [
  "startup",
  "scaleup",
  "enterprise",
  "agency",
  "other",
] as const;
export type ApplicationCompanySummaryType =
  (typeof APPLICATION_COMPANY_SUMMARY_TYPES)[number];
export const APPLICATION_COMPANY_SUMMARY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;
export type ApplicationCompanySummarySize =
  (typeof APPLICATION_COMPANY_SUMMARY_SIZES)[number];
export const APPLICATION_COMPANY_SUMMARY_BUSINESS_MODELS = [
  "B2B",
  "B2C",
  "B2B2C",
  "marketplace",
  "other",
] as const;
export type ApplicationCompanySummaryBusinessModel =
  (typeof APPLICATION_COMPANY_SUMMARY_BUSINESS_MODELS)[number];
export const APPLICATION_COMPANY_SUMMARY_PRODUCT_TYPES = [
  "SaaS",
  "mobile app",
  "platform",
  "service",
  "hardware",
  "other",
] as const;
export type ApplicationCompanySummaryProductType =
  (typeof APPLICATION_COMPANY_SUMMARY_PRODUCT_TYPES)[number];
export const APPLICATION_COMPANY_SUMMARY_FUNDING_STAGES = [
  "bootstrapped",
  "pre-seed",
  "seed",
  "series_a",
  "series_b",
  "series_c",
  "public",
  "unknown",
] as const;
export type ApplicationCompanySummaryFundingStage =
  (typeof APPLICATION_COMPANY_SUMMARY_FUNDING_STAGES)[number];
export const APPLICATION_COMPANY_SUMMARY_WORK_STYLES = [
  "remote",
  "hybrid",
  "office",
] as const;
export type ApplicationCompanySummaryWorkStyle =
  (typeof APPLICATION_COMPANY_SUMMARY_WORK_STYLES)[number];
export const APPLICATION_VACANCY_SUMMARY_SENIORITIES = [
  "intern",
  "junior",
  "middle",
  "senior",
  "lead",
  "principal",
  "unknown",
] as const;
export type ApplicationVacancySummarySeniority =
  (typeof APPLICATION_VACANCY_SUMMARY_SENIORITIES)[number];

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
  companyName: string;
  companyWebsite?: string;
  positionTitle: string;
  jdUrl: string;
}

export interface CreateApplicationResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  createdAt: string;
}

export interface ApplicationTicketListItemResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetApplicationsResponse {
  applications: ApplicationTicketListItemResponse[];
}

export interface ApplicationCompanySummaryCompanyResponse {
  name: string;
  type: ApplicationCompanySummaryType | null;
  size: ApplicationCompanySummarySize | null;
  industry: string | null;
  business_model: ApplicationCompanySummaryBusinessModel | null;
  product_type: ApplicationCompanySummaryProductType | null;
  founded: string | null;
  hq: string | null;
  funding_stage: ApplicationCompanySummaryFundingStage | null;
}

export interface ApplicationCompanySummaryCultureResponse {
  values: string[];
  work_style: ApplicationCompanySummaryWorkStyle | null;
  engineering_culture: string | null;
}

export interface ApplicationCompanySummaryFlagsResponse {
  green: string[];
  red: string[];
}

export interface ApplicationCompanySummaryResponse {
  company: ApplicationCompanySummaryCompanyResponse;
  culture: ApplicationCompanySummaryCultureResponse;
  flags: ApplicationCompanySummaryFlagsResponse;
}

export interface ApplicationVacancySummarySalaryRangeResponse {
  min: number | null;
  max: number | null;
  currency: string | null;
}

export interface ApplicationVacancySummaryPositionResponse {
  title: string;
  seniority: ApplicationVacancySummarySeniority;
  team_context: string;
  key_tasks: string[];
  required_stack: string[];
  nice_to_have_stack: string[];
  salary_range: ApplicationVacancySummarySalaryRangeResponse;
  interview_process: string[];
  growth_opportunities: string | null;
}

export interface ApplicationVacancySummarySmartQuestionsResponse {
  hr: string[];
  tech: string[];
}

export interface ApplicationVacancySummaryScreeningPrepResponse {
  why_hire_me: string[];
  smart_questions: ApplicationVacancySummarySmartQuestionsResponse;
}

export interface ApplicationVacancySummaryResponse {
  position: ApplicationVacancySummaryPositionResponse;
  screening_prep: ApplicationVacancySummaryScreeningPrepResponse;
}

export interface ApplicationCombinedSummaryResponse {
  companySummary: ApplicationCompanySummaryResponse;
  vacancySummary: ApplicationVacancySummaryResponse | null;
}

export interface AvailableApplicationSummaryResponse {
  status: "available";
  summary: ApplicationCombinedSummaryResponse;
}

export interface UnavailableApplicationSummaryResponse {
  status: "unavailable";
  reason: "not_saved";
  message: string;
}

export type GetApplicationSummaryResponse =
  | AvailableApplicationSummaryResponse
  | UnavailableApplicationSummaryResponse;

export interface ApplicationBoardQuestionResponse {
  id: string;
  prompt: string;
  answer: string | null;
  sortOrder: number;
}

export interface ApplicationBoardCompensationResponse {
  minAmount: number | null;
  maxAmount: number | null;
  currency: ApplicationCompensationCurrency | null;
  period: ApplicationCompensationPeriod | null;
  normalizedMinAmount: number | null;
  normalizedMaxAmount: number | null;
  normalizedCurrency: ApplicationNormalizedCurrency | null;
}

export interface ApplicationBoardStageRecordResponse {
  stage: ApplicationBoardStage;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  jobSite: string | null;
  jobSiteOther: string | null;
  notes: string | null;
  roundNumber: number | null;
  customStatusLabel: string | null;
  failureReason: string | null;
  compensation: ApplicationBoardCompensationResponse | null;
  questions: ApplicationBoardQuestionResponse[];
}

export interface ApplicationBoardAssetsResponse {
  hasGeneratedCv: boolean;
  hasCoverLetter: boolean;
  hasCompanySummary: boolean;
}

export interface ApplicationBoardTicketResponse {
  ticketId: string;
  pipelineStatus: ApplicationTicketStatus;
  companyName: string;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  currentStage: ApplicationBoardStage;
  lastTransitionAt: string;
  stages: ApplicationBoardStageRecordResponse[];
  assets: ApplicationBoardAssetsResponse;
  offerCompensation: ApplicationBoardCompensationResponse | null;
}

export interface GetApplicationBoardResponse {
  applications: ApplicationBoardTicketResponse[];
  stageOrder: ApplicationBoardStage[];
  jobSiteOptions: ApplicationJobSitePreset[];
  normalizedCurrency: ApplicationNormalizedCurrency;
}

export interface ApplicationTicketResultResponse {
  personalNote: string;
  createdAt: string;
  updatedAt: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface GetApplicationTicketResponse {
  ticketId: string;
  status: ApplicationTicketStatus;
  companyName: string;
  companyWebsite: string | null;
  positionTitle: string | null;
  jdUrl: string | null;
  vacancyDescription: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  result: ApplicationTicketResultResponse | null;
}

export interface SaveApplicationSummaryRequest {
  ticketId: string;
  companySummary: ApplicationCompanySummaryResponse;
  vacancySummary?: ApplicationVacancySummaryResponse | null;
}

export interface SaveApplicationResultRequest {
  personalNote: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface UpdateApplicationResultRequest {
  cvMarkdown: string;
  coverLetterMarkdown: string;
}

export interface UpdateApplicationBoardStageQuestionRequest {
  prompt: string;
  answer?: string | null;
  sortOrder?: number | null;
}

export interface UpdateApplicationBoardCompensationRequest {
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: ApplicationCompensationCurrency | null;
  period?: ApplicationCompensationPeriod | null;
}

export interface UpdateApplicationBoardStageRequest {
  submittedAt?: string | null;
  jobSite?: string | null;
  jobSiteOther?: string | null;
  notes?: string | null;
  roundNumber?: number | null;
  customStatusLabel?: string | null;
  failureReason?: string | null;
  compensation?: UpdateApplicationBoardCompensationRequest | null;
  questions?: UpdateApplicationBoardStageQuestionRequest[];
}

export interface TransitionApplicationBoardStageRequest {
  toStage: ApplicationBoardStage;
  confirmBackward?: boolean;
}

export interface ExportApplicationPdfRequest {
  html: string;
  fileName: string;
}

export interface ExportApplicationArchiveDocumentRequest {
  html: string;
  fileName: string;
}

export interface ExportApplicationArchiveRequest {
  archiveName: string;
  documents: ExportApplicationArchiveDocumentRequest[];
}

export interface GetFullNameResponse {
  fullName: string;
}

export interface UpdateFullNameRequest {
  fullName: string;
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

export interface JoinWhitelistRequest {
  email: string;
}

export interface JoinWhitelistResponse {
  email: string;
  alreadyListed: boolean;
  createdAt: string;
}
