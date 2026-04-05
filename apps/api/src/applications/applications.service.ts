import type {
  ApplicationTicketListItemResponse,
  ApplicationTicketResultResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  GetApplicationsResponse,
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetFullNameResponse,
  GetWorkTasksResponse,
  UpdateApplicationResultRequest,
  UpdateBaseCvRequest,
  UpdateFullNameRequest,
  UpdateWorkTasksRequest,
} from "@repo/contracts";
import {
  BadGatewayException,
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import { AccountService } from "../account/account.service";
import { logHttpExchange } from "../logging/http-log.util";
import { PrismaService } from "../prisma/prisma.service";
import { ApplicationSummaryService } from "./application-summary.service";

const APPLICATION_PIPELINE_CALLBACK_SECRET = "change-me-backend-secret";

type SaveApplicationResultInput = {
  ticketId: string;
  appSecret: string | undefined;
  request: unknown;
};

type PersistApplicationResultInput = {
  ticketId: string;
  personalNote: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
};

type PipelineDispatchInput = {
  ticketId: string;
  companyName: string;
  fullName: string;
  vacancyDescription: string;
  baseCv: string;
  workTasks: string;
};

const CALLBACK_RESULT_FIELDS = [
  "personalNote",
  "cvMarkdown",
  "coverLetterMarkdown",
] as const;
const CALLBACK_PAYLOAD_CONTAINER_KEYS = [
  "body",
  "request",
  "result",
  "data",
  "payload",
] as const;

type CallbackResultField = (typeof CALLBACK_RESULT_FIELDS)[number];

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger("HttpLogger");

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
    private readonly applicationSummaryService: ApplicationSummaryService
  ) {}

  async createApplication(
    userId: string,
    request: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    const companyName = this.requireText(request?.companyName, "companyName");
    const companyWebsite = this.optionalText(
      request?.companyWebsite,
      "companyWebsite"
    );
    const positionTitle = this.requireText(
      request?.positionTitle,
      "positionTitle"
    );
    const jdUrl = this.requireText(request?.jdUrl, "jdUrl");
    const vacancyDescription = this.requireText(
      request?.vacancyDescription,
      "vacancyDescription"
    );

    const [fullName, baseCv, workTasks] = await Promise.all([
      this.accountService.getRequiredProfileField(userId, "fullName"),
      this.accountService.getRequiredProfileField(userId, "baseCv"),
      this.accountService.getRequiredProfileField(userId, "workTasks"),
    ]);

    const ticket = await this.prisma.applicationTicket.create({
      data: {
        userId,
        status: "processing",
        companyName,
        companyWebsite,
        positionTitle,
        jdUrl,
        vacancyDescription,
      },
    });

    const pipelineInput: PipelineDispatchInput = {
      ticketId: ticket.id,
      companyName,
      fullName,
      vacancyDescription,
      baseCv,
      workTasks,
    };
    const [pipelineDispatchResult, summaryDispatchResult] =
      await Promise.allSettled([
        this.dispatchApplicationPipeline(pipelineInput),
        this.applicationSummaryService.requestApplicationSummary(
          userId,
          ticket.id
        ),
      ]);

    if (summaryDispatchResult.status === "rejected") {
      this.logger.warn(
        `Failed to trigger summary workflow for ticket ${ticket.id}: ${this.getErrorMessage(
          summaryDispatchResult.reason
        )}`
      );
    }

    if (pipelineDispatchResult.status === "rejected") {
      throw pipelineDispatchResult.reason;
    }

    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async listApplications(userId: string): Promise<GetApplicationsResponse> {
    const tickets = await this.prisma.applicationTicket.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      applications: tickets.map((ticket) =>
        this.toApplicationTicketListItem(ticket)
      ),
    };
  }

  async getApplicationTicket(
    userId: string,
    ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    const ticket = await this.prisma.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: {
        result: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }

    return {
      ticketId: ticket.id,
      status: ticket.status,
      companyName: ticket.companyName,
      companyWebsite: ticket.companyWebsite,
      positionTitle: ticket.positionTitle,
      jdUrl: ticket.jdUrl,
      vacancyDescription: ticket.vacancyDescription,
      lastError: ticket.lastError,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      result: ticket.result
        ? this.toApplicationTicketResultResponse(ticket.result)
        : null,
    };
  }

  async getBaseCv(userId: string): Promise<GetBaseCvResponse> {
    const baseCv = await this.accountService.getProfileField(userId, "baseCv");
    return { baseCv };
  }

  async getFullName(userId: string): Promise<GetFullNameResponse> {
    const fullName = await this.accountService.getProfileField(
      userId,
      "fullName"
    );
    return { fullName };
  }

  async getWorkTasks(userId: string): Promise<GetWorkTasksResponse> {
    const workTasks = await this.accountService.getProfileField(
      userId,
      "workTasks"
    );
    return { workTasks };
  }

  async updateFullName(
    userId: string,
    request: UpdateFullNameRequest
  ): Promise<GetFullNameResponse> {
    const fullName = await this.accountService.updateProfileField(
      userId,
      "fullName",
      request?.fullName
    );

    return { fullName };
  }

  async updateBaseCv(
    userId: string,
    request: UpdateBaseCvRequest
  ): Promise<GetBaseCvResponse> {
    const baseCv = await this.accountService.updateProfileField(
      userId,
      "baseCv",
      request?.baseCv
    );

    return { baseCv };
  }

  async updateWorkTasks(
    userId: string,
    request: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    const workTasks = await this.accountService.updateProfileField(
      userId,
      "workTasks",
      request?.workTasks
    );

    return { workTasks };
  }

  async saveApplicationResult(
    input: SaveApplicationResultInput
  ): Promise<void> {
    const expectedSecret = this.getAppSecret();

    if (input.appSecret?.trim() !== expectedSecret) {
      throw new UnauthorizedException("Invalid application result secret.");
    }

    const requestFields = this.getSaveApplicationResultFields(input.request);

    await this.persistApplicationResult({
      ticketId: input.ticketId,
      personalNote: this.requireCallbackText(
        requestFields.personalNote,
        "personalNote"
      ),
      cvMarkdown: this.requireCallbackText(
        requestFields.cvMarkdown,
        "cvMarkdown"
      ),
      coverLetterMarkdown: this.requireCallbackText(
        requestFields.coverLetterMarkdown,
        "coverLetterMarkdown"
      ),
    });
  }

  async updateApplicationResult(
    userId: string,
    ticketId: string,
    request: UpdateApplicationResultRequest
  ): Promise<ApplicationTicketResultResponse> {
    const cvMarkdown = this.requireText(request?.cvMarkdown, "cvMarkdown");
    const coverLetterMarkdown = this.requireText(
      request?.coverLetterMarkdown,
      "coverLetterMarkdown"
    );

    const updatedResult = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.applicationTicket.findFirst({
        where: {
          id: ticketId,
          userId,
        },
        select: { id: true },
      });

      if (!ticket) {
        throw new NotFoundException("Application ticket was not found.");
      }

      const existingResult = await tx.applicationTicketResult.findUnique({
        where: { ticketId },
      });

      if (!existingResult) {
        throw new NotFoundException("Application result was not found.");
      }

      const result = await tx.applicationTicketResult.update({
        where: { ticketId },
        data: {
          cvMarkdown,
          coverLetterMarkdown,
        },
      });

      await tx.applicationTicket.update({
        where: { id: ticketId },
        data: {
          status: "completed",
          lastError: null,
        },
      });

      return result;
    });

    return this.toApplicationTicketResultResponse(updatedResult);
  }

  async deleteApplication(userId: string, ticketId: string): Promise<void> {
    const deleted = await this.prisma.applicationTicket.deleteMany({
      where: {
        id: ticketId,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException("Application ticket was not found.");
    }
  }

  async assertTicketAccess(userId: string, ticketId: string): Promise<void> {
    const ticket = await this.prisma.applicationTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Application ticket was not found.");
    }
  }

  private async dispatchApplicationPipeline(
    input: PipelineDispatchInput
  ): Promise<void> {
    await this.triggerWorkflow(input);
  }

  private async triggerWorkflow(input: PipelineDispatchInput): Promise<void> {
    const webhookUrl = this.getWebhookUrl();
    const startedAt = Date.now();

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const failureMessage = await this.getWebhookFailureMessage(response);

        logHttpExchange({
          logger: this.logger,
          kind: "Outgoing Request",
          method: "POST",
          address: webhookUrl,
          body: input,
          statusCode: response.status,
          statusText: response.statusText,
          durationMs: Date.now() - startedAt,
          error: failureMessage,
        });

        await this.markTicketFailed(input.ticketId, failureMessage);
        throw new BadGatewayException(failureMessage);
      }

      logHttpExchange({
        logger: this.logger,
        kind: "Outgoing Request",
        method: "POST",
        address: webhookUrl,
        body: input,
        statusCode: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const errorMessage = this.getErrorMessage(error);

      logHttpExchange({
        logger: this.logger,
        kind: "Outgoing Request",
        method: "POST",
        address: webhookUrl,
        body: input,
        statusCode: HttpStatus.BAD_GATEWAY,
        statusText: "Bad Gateway",
        durationMs: Date.now() - startedAt,
        error: errorMessage,
      });

      await this.markTicketFailed(input.ticketId, errorMessage);
      throw new BadGatewayException("Failed to trigger n8n workflow.");
    }
  }

  private async persistApplicationResult(
    input: PersistApplicationResultInput
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.applicationTicket.findUnique({
        where: { id: input.ticketId },
        select: { id: true },
      });

      if (!ticket) {
        throw new NotFoundException("Application ticket was not found.");
      }

      await tx.applicationTicketResult.upsert({
        where: { ticketId: input.ticketId },
        create: {
          ticketId: input.ticketId,
          cvMarkdown: input.cvMarkdown,
          coverLetterMarkdown: input.coverLetterMarkdown,
          personalNote: input.personalNote,
        },
        update: {
          cvMarkdown: input.cvMarkdown,
          coverLetterMarkdown: input.coverLetterMarkdown,
          personalNote: input.personalNote,
        },
      });

      await tx.applicationTicket.update({
        where: { id: input.ticketId },
        data: {
          status: "completed",
          lastError: null,
        },
      });
    });
  }

  private getWebhookUrl(): string {
    const value = process.env.N8N_WORKFLOW_WEBHOOK_URL?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        "N8N workflow webhook is not configured."
      );
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new ServiceUnavailableException(
        "N8N workflow webhook URL is invalid."
      );
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ServiceUnavailableException(
        "N8N workflow webhook URL must use http or https."
      );
    }

    return url.toString();
  }
  private getAppSecret(): string {
    return APPLICATION_PIPELINE_CALLBACK_SECRET;
  }

  private getSaveApplicationResultFields(
    request: unknown
  ): Partial<Record<CallbackResultField, unknown>> {
    return CALLBACK_RESULT_FIELDS.reduce<
      Partial<Record<CallbackResultField, unknown>>
    >((fields, fieldName) => {
      fields[fieldName] = this.getCallbackPayloadField(request, fieldName);
      return fields;
    }, {});
  }

  private getCallbackPayloadField(
    request: unknown,
    fieldName: CallbackResultField
  ): unknown {
    for (const candidate of this.collectCallbackPayloadCandidates(request)) {
      if (fieldName in candidate) {
        return candidate[fieldName];
      }
    }

    return undefined;
  }

  private collectCallbackPayloadCandidates(
    value: unknown,
    visited = new Set<object>()
  ): Record<string, unknown>[] {
    if (!this.isRecord(value) || visited.has(value)) {
      return [];
    }

    visited.add(value);

    const candidates = [value];

    for (const key of CALLBACK_PAYLOAD_CONTAINER_KEYS) {
      candidates.push(
        ...this.collectCallbackPayloadCandidates(value[key], visited)
      );
    }

    return candidates;
  }

  private requireCallbackText(value: unknown, fieldName: string): string {
    const extracted = this.extractStructuredText(value);

    if (extracted === null) {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }

    const normalized = extracted.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private extractStructuredText(
    value: unknown,
    visited = new Set<object>()
  ): string | null {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value == null) {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const extracted = this.extractStructuredText(item, visited);

        if (extracted && extracted.trim()) {
          return extracted;
        }
      }

      return null;
    }

    if (!this.isRecord(value) || visited.has(value)) {
      return null;
    }

    visited.add(value);

    for (const key of [
      "text",
      "content",
      "message",
      "note",
      "markdown",
      "value",
    ]) {
      const extracted = this.extractStructuredText(value[key], visited);

      if (extracted && extracted.trim()) {
        return extracted;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const extracted = this.extractStructuredText(nestedValue, visited);

      if (extracted && extracted.trim()) {
        return extracted;
      }
    }

    return null;
  }

  private requireText(value: unknown, fieldName: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private optionalText(value: unknown, fieldName: string): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private async markTicketFailed(id: string, lastError: string) {
    try {
      await this.prisma.applicationTicket.update({
        where: { id },
        data: {
          status: "failed",
          lastError: lastError.slice(0, 1000),
        },
      });
    } catch {
      // Keep the original pipeline error as the API response even if the update fails.
    }
  }

  private async getWebhookFailureMessage(response: Response): Promise<string> {
    const body = (await response.text()).trim();

    if (!body) {
      return `n8n webhook responded with HTTP ${response.status}.`;
    }

    return `n8n webhook responded with HTTP ${response.status}: ${body.slice(0, 900)}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return "Unknown application pipeline error.";
  }

  private toApplicationTicketResultResponse(result: {
    personalNote: string;
    createdAt: Date;
    updatedAt: Date;
    cvMarkdown: string;
    coverLetterMarkdown: string;
  }): ApplicationTicketResultResponse {
    return {
      personalNote: result.personalNote,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      cvMarkdown: result.cvMarkdown,
      coverLetterMarkdown: result.coverLetterMarkdown,
    };
  }

  private toApplicationTicketListItem(ticket: {
    id: string;
    status: ApplicationTicketListItemResponse["status"];
    companyName: string;
    vacancyDescription: string;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApplicationTicketListItemResponse {
    return {
      ticketId: ticket.id,
      status: ticket.status,
      companyName: ticket.companyName,
      vacancyDescription: ticket.vacancyDescription,
      lastError: ticket.lastError,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
