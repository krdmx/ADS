import type {
  ApplicationCompanySummaryBusinessModel,
  ApplicationCompanySummaryFundingStage,
  ApplicationCompanySummaryProductType,
  ApplicationCompanySummaryResponse,
  ApplicationCompanySummarySize,
  ApplicationCompanySummaryType,
  ApplicationCompanySummaryWorkStyle,
  ApplicationVacancySummaryResponse,
  ApplicationVacancySummarySeniority,
  GetApplicationSummaryResponse,
  SaveApplicationSummaryRequest,
} from "@repo/contracts";
import {
  APPLICATION_COMPANY_SUMMARY_BUSINESS_MODELS,
  APPLICATION_COMPANY_SUMMARY_FUNDING_STAGES,
  APPLICATION_COMPANY_SUMMARY_PRODUCT_TYPES,
  APPLICATION_COMPANY_SUMMARY_SIZES,
  APPLICATION_COMPANY_SUMMARY_TYPES,
  APPLICATION_COMPANY_SUMMARY_WORK_STYLES,
  APPLICATION_VACANCY_SUMMARY_SENIORITIES,
} from "@repo/contracts";
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

const APPLICATION_PIPELINE_CALLBACK_SECRET = "change-me-backend-secret";

const SUMMARY_PAYLOAD_CONTAINER_KEYS = [
  "body",
  "data",
  "result",
  "payload",
] as const;

type SaveApplicationSummaryInput = {
  ticketId: string;
  appSecret: string | undefined;
  request: unknown;
};

type SummaryWorkflowDispatchInput = {
  ticketId: string;
  companyName: string;
  companyWebsite: string;
  positionTitle: string;
  jdUrl: string;
  vacancyDescription: string;
  companySummary: string;
  vacancySummary: string;
  cachedCompanySummary: string;
  cachedVacancySummary: string;
};

type SummaryPayloadCandidate = {
  ticketId?: unknown;
  companySummary: unknown;
  vacancySummary?: unknown;
};

type PersistedCompanySummaryRecord = {
  companyName: string;
  companyType: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  companyBusinessModel: string | null;
  companyProductType: string | null;
  companyFounded: string | null;
  companyHq: string | null;
  companyFundingStage: string | null;
  cultureValues: string[];
  cultureWorkStyle: string | null;
  cultureEngineeringCulture: string | null;
  flagsGreen: string[];
  flagsRed: string[];
};

type PersistedVacancySummaryRecord = {
  positionTitle: string;
  positionSeniority: string;
  positionTeamContext: string;
  positionKeyTasks: string[];
  positionRequiredStack: string[];
  positionNiceToHaveStack: string[];
  positionSalaryMin: number | null;
  positionSalaryMax: number | null;
  positionSalaryCurrency: string | null;
  positionInterviewProcess: string[];
  positionGrowthOpportunities: string | null;
  screeningPrepWhyHireMe: string[];
  screeningPrepSmartQuestionsHr: string[];
  screeningPrepSmartQuestionsTech: string[];
};

type ParsedSaveApplicationSummaryRequest = SaveApplicationSummaryRequest & {
  vacancySummary?: ApplicationVacancySummaryResponse | null;
};

@Injectable()
export class ApplicationSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async requestApplicationSummary(
    userId: string,
    ticketId: string
  ): Promise<void> {
    const ticket = await this.prisma.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
        companyName: true,
        companyWebsite: true,
        positionTitle: true,
        jdUrl: true,
        vacancyDescription: true,
        companySummary: {
          select: {
            companyName: true,
            companyType: true,
            companySize: true,
            companyIndustry: true,
            companyBusinessModel: true,
            companyProductType: true,
            companyFounded: true,
            companyHq: true,
            companyFundingStage: true,
            cultureValues: true,
            cultureWorkStyle: true,
            cultureEngineeringCulture: true,
            flagsGreen: true,
            flagsRed: true,
          },
        },
        vacancySummary: {
          select: {
            positionTitle: true,
            positionSeniority: true,
            positionTeamContext: true,
            positionKeyTasks: true,
            positionRequiredStack: true,
            positionNiceToHaveStack: true,
            positionSalaryMin: true,
            positionSalaryMax: true,
            positionSalaryCurrency: true,
            positionInterviewProcess: true,
            positionGrowthOpportunities: true,
            screeningPrepWhyHireMe: true,
            screeningPrepSmartQuestionsHr: true,
            screeningPrepSmartQuestionsTech: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }

    const cachedCompanySummary = this.serializeCachedCompanySummary(
      ticket.companySummary
    );
    const cachedVacancySummary = this.serializeCachedVacancySummary(
      ticket.vacancySummary
    );

    await this.triggerSummaryWorkflow({
      ticketId: ticket.id,
      companyName: ticket.companyName,
      companyWebsite: this.normalizeWorkflowText(ticket.companyWebsite),
      positionTitle: this.normalizeWorkflowText(ticket.positionTitle),
      jdUrl: this.normalizeWorkflowText(ticket.jdUrl),
      vacancyDescription: ticket.vacancyDescription,
      companySummary: cachedCompanySummary,
      vacancySummary: cachedVacancySummary,
      cachedCompanySummary,
      cachedVacancySummary,
    });
  }

  async getApplicationSummary(
    userId: string,
    ticketId: string
  ): Promise<GetApplicationSummaryResponse> {
    const ticket = await this.prisma.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
        companySummary: {
          select: {
            companyName: true,
            companyType: true,
            companySize: true,
            companyIndustry: true,
            companyBusinessModel: true,
            companyProductType: true,
            companyFounded: true,
            companyHq: true,
            companyFundingStage: true,
            cultureValues: true,
            cultureWorkStyle: true,
            cultureEngineeringCulture: true,
            flagsGreen: true,
            flagsRed: true,
          },
        },
        vacancySummary: {
          select: {
            positionTitle: true,
            positionSeniority: true,
            positionTeamContext: true,
            positionKeyTasks: true,
            positionRequiredStack: true,
            positionNiceToHaveStack: true,
            positionSalaryMin: true,
            positionSalaryMax: true,
            positionSalaryCurrency: true,
            positionInterviewProcess: true,
            positionGrowthOpportunities: true,
            screeningPrepWhyHireMe: true,
            screeningPrepSmartQuestionsHr: true,
            screeningPrepSmartQuestionsTech: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }

    if (!ticket.companySummary) {
      return {
        status: "unavailable",
        reason: "not_saved",
        message: "Summary has not been saved for this ticket yet.",
      };
    }

    return {
      status: "available",
      summary: {
        companySummary: this.toCompanySummaryResponse(ticket.companySummary),
        vacancySummary: ticket.vacancySummary
          ? this.toVacancySummaryResponse(ticket.vacancySummary)
          : null,
      },
    };
  }

  async saveApplicationSummary(
    input: SaveApplicationSummaryInput
  ): Promise<void> {
    const expectedSecret = this.getAppSecret();

    if (input.appSecret?.trim() !== expectedSecret) {
      throw new UnauthorizedException("Invalid application summary secret.");
    }

    const request = this.parseSaveApplicationSummaryRequest(
      input.ticketId,
      input.request
    );

    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.applicationTicket.findUnique({
        where: {
          id: input.ticketId,
        },
        select: {
          id: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException("Application ticket was not found.");
      }

      await tx.applicationTicketCompanySummary.upsert({
        where: {
          ticketId: input.ticketId,
        },
        create: this.toCompanySummaryPersistenceInput(
          input.ticketId,
          request.companySummary
        ),
        update: this.toCompanySummaryPersistenceUpdate(request.companySummary),
      });

      if (request.vacancySummary !== undefined && request.vacancySummary !== null) {
        await tx.applicationTicketVacancySummary.upsert({
          where: {
            ticketId: input.ticketId,
          },
          create: this.toVacancySummaryPersistenceInput(
            input.ticketId,
            request.vacancySummary
          ),
          update: this.toVacancySummaryPersistenceUpdate(request.vacancySummary),
        });
      }
    });
  }

  private parseSaveApplicationSummaryRequest(
    expectedTicketId: string,
    value: unknown
  ): ParsedSaveApplicationSummaryRequest {
    const payload = this.findSummaryPayloadCandidate(value);

    if (!payload) {
      throw new BadRequestException(
        "Summary payload must include companySummary."
      );
    }

    const ticketId = this.readString(payload.ticketId);

    if (ticketId === null) {
      throw new BadRequestException("ticketId is required.");
    }

    if (ticketId !== expectedTicketId) {
      throw new BadRequestException("ticketId does not match the request path.");
    }

    const companySummary = this.parseCompanySummary(payload.companySummary);

    if (!companySummary) {
      throw new BadRequestException("companySummary is invalid.");
    }

    const hasVacancySummary = Object.prototype.hasOwnProperty.call(
      payload,
      "vacancySummary"
    );

    if (!hasVacancySummary) {
      return {
        ticketId,
        companySummary,
      };
    }

    if (payload.vacancySummary == null) {
      return {
        ticketId,
        companySummary,
        vacancySummary: null,
      };
    }

    const vacancySummary = this.parseVacancySummary(payload.vacancySummary);

    if (!vacancySummary) {
      throw new BadRequestException("vacancySummary is invalid.");
    }

    return {
      ticketId,
      companySummary,
      vacancySummary,
    };
  }

  private findSummaryPayloadCandidate(
    value: unknown
  ): SummaryPayloadCandidate | null {
    for (const candidate of this.collectSummaryPayloadCandidates(value)) {
      if (Object.prototype.hasOwnProperty.call(candidate, "companySummary")) {
        if (Object.prototype.hasOwnProperty.call(candidate, "vacancySummary")) {
          return {
            ticketId: candidate.ticketId,
            companySummary: candidate.companySummary,
            vacancySummary: candidate.vacancySummary,
          };
        }

        return {
          ticketId: candidate.ticketId,
          companySummary: candidate.companySummary,
        };
      }
    }

    return null;
  }

  private collectSummaryPayloadCandidates(
    value: unknown,
    visited = new Set<object>()
  ): Record<string, unknown>[] {
    if (!this.isRecord(value) || visited.has(value)) {
      return [];
    }

    visited.add(value);

    const candidates = [value];

    for (const key of SUMMARY_PAYLOAD_CONTAINER_KEYS) {
      candidates.push(
        ...this.collectSummaryPayloadCandidates(value[key], visited)
      );
    }

    return candidates;
  }

  private parseCompanySummary(
    value: unknown
  ): ApplicationCompanySummaryResponse | null {
    if (!this.isRecord(value)) {
      return null;
    }

    const company = value.company;
    const culture = value.culture;
    const flags = value.flags;

    if (!this.isRecord(company) || !this.isRecord(culture) || !this.isRecord(flags)) {
      return null;
    }

    const name = this.readString(company.name);
    const type = this.readNullableLiteral(
      company.type,
      APPLICATION_COMPANY_SUMMARY_TYPES
    );
    const size = this.readNullableLiteral(
      company.size,
      APPLICATION_COMPANY_SUMMARY_SIZES
    );
    const industry = this.readNullableString(company.industry);
    const businessModel = this.readNullableLiteral(
      company.business_model,
      APPLICATION_COMPANY_SUMMARY_BUSINESS_MODELS
    );
    const productType = this.readNullableLiteral(
      company.product_type,
      APPLICATION_COMPANY_SUMMARY_PRODUCT_TYPES
    );
    const founded = this.readNullableString(company.founded);
    const hq = this.readNullableString(company.hq);
    const fundingStage = this.readNullableLiteral(
      company.funding_stage,
      APPLICATION_COMPANY_SUMMARY_FUNDING_STAGES
    );
    const values = this.readStringArray(culture.values);
    const workStyle = this.readNullableLiteral(
      culture.work_style,
      APPLICATION_COMPANY_SUMMARY_WORK_STYLES
    );
    const engineeringCulture = this.readNullableString(
      culture.engineering_culture
    );
    const green = this.readStringArray(flags.green);
    const red = this.readStringArray(flags.red);

    if (
      name === null ||
      type === undefined ||
      size === undefined ||
      industry === undefined ||
      businessModel === undefined ||
      productType === undefined ||
      founded === undefined ||
      hq === undefined ||
      fundingStage === undefined ||
      values === null ||
      workStyle === undefined ||
      engineeringCulture === undefined ||
      green === null ||
      red === null
    ) {
      return null;
    }

    return {
      company: {
        name,
        type,
        size,
        industry,
        business_model: businessModel,
        product_type: productType,
        founded,
        hq,
        funding_stage: fundingStage,
      },
      culture: {
        values,
        work_style: workStyle,
        engineering_culture: engineeringCulture,
      },
      flags: {
        green,
        red,
      },
    };
  }

  private parseVacancySummary(
    value: unknown
  ): ApplicationVacancySummaryResponse | null {
    if (!this.isRecord(value)) {
      return null;
    }

    const position = value.position;
    const screeningPrep = value.screening_prep;

    if (!this.isRecord(position) || !this.isRecord(screeningPrep)) {
      return null;
    }

    const salaryRange = position.salary_range;
    const smartQuestions = screeningPrep.smart_questions;

    if (!this.isRecord(salaryRange) || !this.isRecord(smartQuestions)) {
      return null;
    }

    const title = this.readString(position.title);
    const seniority = this.readLiteral(
      position.seniority,
      APPLICATION_VACANCY_SUMMARY_SENIORITIES
    );
    const teamContext = this.readString(position.team_context);
    const keyTasks = this.readStringArray(position.key_tasks);
    const requiredStack = this.readStringArray(position.required_stack);
    const niceToHaveStack = this.readStringArray(position.nice_to_have_stack);
    const salaryMin = this.readNullableNumber(salaryRange.min);
    const salaryMax = this.readNullableNumber(salaryRange.max);
    const salaryCurrency = this.readNullableString(salaryRange.currency);
    const interviewProcess = this.readStringArray(position.interview_process);
    const growthOpportunities = this.readNullableString(
      position.growth_opportunities
    );
    const whyHireMe = this.readStringArray(screeningPrep.why_hire_me);
    const smartQuestionsHr = this.readStringArray(smartQuestions.hr);
    const smartQuestionsTech = this.readStringArray(smartQuestions.tech);

    if (
      title === null ||
      seniority === null ||
      teamContext === null ||
      keyTasks === null ||
      requiredStack === null ||
      niceToHaveStack === null ||
      salaryMin === undefined ||
      salaryMax === undefined ||
      salaryCurrency === undefined ||
      interviewProcess === null ||
      growthOpportunities === undefined ||
      whyHireMe === null ||
      smartQuestionsHr === null ||
      smartQuestionsTech === null
    ) {
      return null;
    }

    return {
      position: {
        title,
        seniority,
        team_context: teamContext,
        key_tasks: keyTasks,
        required_stack: requiredStack,
        nice_to_have_stack: niceToHaveStack,
        salary_range: {
          min: salaryMin,
          max: salaryMax,
          currency: salaryCurrency,
        },
        interview_process: interviewProcess,
        growth_opportunities: growthOpportunities,
      },
      screening_prep: {
        why_hire_me: whyHireMe,
        smart_questions: {
          hr: smartQuestionsHr,
          tech: smartQuestionsTech,
        },
      },
    };
  }

  private toCompanySummaryPersistenceInput(
    ticketId: string,
    summary: ApplicationCompanySummaryResponse
  ) {
    return {
      ticketId,
      ...this.toCompanySummaryPersistenceUpdate(summary),
    };
  }

  private toCompanySummaryPersistenceUpdate(
    summary: ApplicationCompanySummaryResponse
  ) {
    return {
      companyName: summary.company.name,
      companyType: summary.company.type,
      companySize: summary.company.size,
      companyIndustry: summary.company.industry,
      companyBusinessModel: summary.company.business_model,
      companyProductType: summary.company.product_type,
      companyFounded: summary.company.founded,
      companyHq: summary.company.hq,
      companyFundingStage: summary.company.funding_stage,
      cultureValues: [...summary.culture.values],
      cultureWorkStyle: summary.culture.work_style,
      cultureEngineeringCulture: summary.culture.engineering_culture,
      flagsGreen: [...summary.flags.green],
      flagsRed: [...summary.flags.red],
    };
  }

  private toVacancySummaryPersistenceInput(
    ticketId: string,
    summary: ApplicationVacancySummaryResponse
  ) {
    return {
      ticketId,
      ...this.toVacancySummaryPersistenceUpdate(summary),
    };
  }

  private toVacancySummaryPersistenceUpdate(
    summary: ApplicationVacancySummaryResponse
  ) {
    return {
      positionTitle: summary.position.title,
      positionSeniority: summary.position.seniority,
      positionTeamContext: summary.position.team_context,
      positionKeyTasks: [...summary.position.key_tasks],
      positionRequiredStack: [...summary.position.required_stack],
      positionNiceToHaveStack: [...summary.position.nice_to_have_stack],
      positionSalaryMin: summary.position.salary_range.min,
      positionSalaryMax: summary.position.salary_range.max,
      positionSalaryCurrency: summary.position.salary_range.currency,
      positionInterviewProcess: [...summary.position.interview_process],
      positionGrowthOpportunities: summary.position.growth_opportunities,
      screeningPrepWhyHireMe: [...summary.screening_prep.why_hire_me],
      screeningPrepSmartQuestionsHr: [
        ...summary.screening_prep.smart_questions.hr,
      ],
      screeningPrepSmartQuestionsTech: [
        ...summary.screening_prep.smart_questions.tech,
      ],
    };
  }

  private toCompanySummaryResponse(
    summary: PersistedCompanySummaryRecord
  ): ApplicationCompanySummaryResponse {
    return {
      company: {
        name: summary.companyName,
        type: summary.companyType
          ? (summary.companyType as ApplicationCompanySummaryType)
          : null,
        size: summary.companySize
          ? (summary.companySize as ApplicationCompanySummarySize)
          : null,
        industry: summary.companyIndustry,
        business_model:
          summary.companyBusinessModel
            ? (summary.companyBusinessModel as ApplicationCompanySummaryBusinessModel)
            : null,
        product_type:
          summary.companyProductType
            ? (summary.companyProductType as ApplicationCompanySummaryProductType)
            : null,
        founded: summary.companyFounded,
        hq: summary.companyHq,
        funding_stage:
          summary.companyFundingStage
            ? (summary.companyFundingStage as ApplicationCompanySummaryFundingStage)
            : null,
      },
      culture: {
        values: [...summary.cultureValues],
        work_style:
          summary.cultureWorkStyle
            ? (summary.cultureWorkStyle as ApplicationCompanySummaryWorkStyle)
            : null,
        engineering_culture: summary.cultureEngineeringCulture,
      },
      flags: {
        green: [...summary.flagsGreen],
        red: [...summary.flagsRed],
      },
    };
  }

  private toVacancySummaryResponse(
    summary: PersistedVacancySummaryRecord
  ): ApplicationVacancySummaryResponse {
    return {
      position: {
        title: summary.positionTitle,
        seniority:
          summary.positionSeniority as ApplicationVacancySummarySeniority,
        team_context: summary.positionTeamContext,
        key_tasks: [...summary.positionKeyTasks],
        required_stack: [...summary.positionRequiredStack],
        nice_to_have_stack: [...summary.positionNiceToHaveStack],
        salary_range: {
          min: summary.positionSalaryMin,
          max: summary.positionSalaryMax,
          currency: summary.positionSalaryCurrency,
        },
        interview_process: [...summary.positionInterviewProcess],
        growth_opportunities: summary.positionGrowthOpportunities,
      },
      screening_prep: {
        why_hire_me: [...summary.screeningPrepWhyHireMe],
        smart_questions: {
          hr: [...summary.screeningPrepSmartQuestionsHr],
          tech: [...summary.screeningPrepSmartQuestionsTech],
        },
      },
    };
  }

  private async triggerSummaryWorkflow(
    input: SummaryWorkflowDispatchInput
  ): Promise<void> {
    const webhookUrl = this.getSummaryWebhookUrl();

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const responseBody = (await response.text()).trim();

        throw new BadGatewayException(
          responseBody ||
            `Summary workflow responded with HTTP ${response.status}.`
        );
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException("Failed to trigger n8n summary workflow.");
    }
  }

  private serializeCachedCompanySummary(
    summary: PersistedCompanySummaryRecord | null
  ): string {
    if (!summary) {
      return "No data";
    }

    return JSON.stringify(this.toCompanySummaryResponse(summary));
  }

  private serializeCachedVacancySummary(
    summary: PersistedVacancySummaryRecord | null
  ): string {
    if (!summary) {
      return "No data";
    }

    return JSON.stringify(this.toVacancySummaryResponse(summary));
  }

  private normalizeWorkflowText(value: string | null | undefined): string {
    const normalized = value?.trim();

    return normalized ? normalized : "No data";
  }

  private readString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
  }

  private readNullableString(value: unknown): string | null | undefined {
    return typeof value === "string" || value === null ? value : undefined;
  }

  private readNullableNumber(value: unknown): number | null | undefined {
    return typeof value === "number" || value === null ? value : undefined;
  }

  private readStringArray(value: unknown): string[] | null {
    return this.isStringArray(value) ? [...value] : null;
  }

  private readLiteral<T extends string>(
    value: unknown,
    literals: readonly T[]
  ): T | null {
    return typeof value === "string" && literals.includes(value as T)
      ? (value as T)
      : null;
  }

  private readNullableLiteral<T extends string>(
    value: unknown,
    literals: readonly T[]
  ): T | null | undefined {
    if (value === null) {
      return null;
    }

    return typeof value === "string" && literals.includes(value as T)
      ? (value as T)
      : undefined;
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private getSummaryWebhookUrl(): string {
    const value = process.env.N8N_SUMMARY_WORKFLOW_WEBHOOK_URL?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        "N8N summary workflow webhook is not configured."
      );
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new ServiceUnavailableException(
        "N8N summary workflow webhook URL is invalid."
      );
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ServiceUnavailableException(
        "N8N summary workflow webhook URL must use http or https."
      );
    }

    return url.toString();
  }

  private getAppSecret(): string {
    return APPLICATION_PIPELINE_CALLBACK_SECRET;
  }
}
