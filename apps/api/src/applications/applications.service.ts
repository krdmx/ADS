import type {
  ApplicationTicketListItemResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  GetApplicationsResponse,
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetWorkTasksResponse,
  UpdateBaseCvRequest,
  UpdateWorkTasksRequest,
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

const BASE_CV_KEY = "baseCv";
const WORK_TASKS_KEY = "workTasks";

type UploadedApplicationDocument = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

type SaveApplicationResultInput = {
  ticketId: string;
  appSecret: string | undefined;
  personalNote: unknown;
  cv: UploadedApplicationDocument;
  coverLetter: UploadedApplicationDocument;
};

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createApplication(
    request: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    const fullName = this.requireText(request?.fullName, "fullName");
    const vacancyDescription = this.requireText(
      request?.vacancyDescription,
      "vacancyDescription"
    );
    const webhookUrl = this.getWebhookUrl();

    const [baseCv, workTasks] = await Promise.all([
      this.getRequiredProfileText(BASE_CV_KEY),
      this.getRequiredProfileText(WORK_TASKS_KEY),
    ]);

    const ticket = await this.prisma.applicationTicket.create({
      data: {
        status: "processing",
        fullName,
        vacancyDescription,
      },
    });

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          fullName,
          vacancyDescription,
          baseCv,
          workTasks,
        }),
      });

      if (!response.ok) {
        const failureMessage = await this.getWebhookFailureMessage(response);
        await this.markTicketFailed(ticket.id, failureMessage);
        throw new BadGatewayException(failureMessage);
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      await this.markTicketFailed(ticket.id, this.getErrorMessage(error));
      throw new BadGatewayException("Failed to trigger n8n workflow.");
    }

    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async listApplications(): Promise<GetApplicationsResponse> {
    const tickets = await this.prisma.applicationTicket.findMany({
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
    ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    const ticket = await this.prisma.applicationTicket.findUnique({
      where: { id: ticketId },
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
      fullName: ticket.fullName,
      vacancyDescription: ticket.vacancyDescription,
      lastError: ticket.lastError,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      result: ticket.result
        ? {
            personalNote: ticket.result.personalNote,
            createdAt: ticket.result.createdAt.toISOString(),
            updatedAt: ticket.result.updatedAt.toISOString(),
            cv: {
              fileName: ticket.result.cvFileName,
              mimeType: ticket.result.cvMimeType,
              dataUrl: this.toDataUrl(
                ticket.result.cvPdf,
                ticket.result.cvMimeType
              ),
            },
            coverLetter: {
              fileName: ticket.result.coverLetterFileName,
              mimeType: ticket.result.coverLetterMimeType,
              dataUrl: this.toDataUrl(
                ticket.result.coverLetterPdf,
                ticket.result.coverLetterMimeType
              ),
            },
          }
        : null,
    };
  }

  async getBaseCv(): Promise<GetBaseCvResponse> {
    const baseCv = await this.getProfileTextOrEmpty(BASE_CV_KEY);
    return { baseCv };
  }

  async getWorkTasks(): Promise<GetWorkTasksResponse> {
    const workTasks = await this.getProfileTextOrEmpty(WORK_TASKS_KEY);
    return { workTasks };
  }

  async updateBaseCv(request: UpdateBaseCvRequest): Promise<GetBaseCvResponse> {
    const baseCv = await this.saveProfileText(
      BASE_CV_KEY,
      request?.baseCv,
      "baseCv"
    );

    return { baseCv };
  }

  async updateWorkTasks(
    request: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    const workTasks = await this.saveProfileText(
      WORK_TASKS_KEY,
      request?.workTasks,
      "workTasks"
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

    const personalNote = this.requireText(input.personalNote, "personalNote");

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
          cvPdf: this.toPrismaBytes(input.cv.buffer),
          cvFileName: input.cv.originalname,
          cvMimeType: input.cv.mimetype,
          coverLetterPdf: this.toPrismaBytes(input.coverLetter.buffer),
          coverLetterFileName: input.coverLetter.originalname,
          coverLetterMimeType: input.coverLetter.mimetype,
          personalNote,
        },
        update: {
          cvPdf: this.toPrismaBytes(input.cv.buffer),
          cvFileName: input.cv.originalname,
          cvMimeType: input.cv.mimetype,
          coverLetterPdf: this.toPrismaBytes(input.coverLetter.buffer),
          coverLetterFileName: input.coverLetter.originalname,
          coverLetterMimeType: input.coverLetter.mimetype,
          personalNote,
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

  private async getRequiredProfileText(key: string): Promise<string> {
    const entry = await this.prisma.appMetadata.findUnique({
      where: { key },
    });
    const value = entry?.value.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        `Application profile field "${key}" is not configured.`
      );
    }

    return value;
  }

  private async getProfileTextOrEmpty(key: string): Promise<string> {
    const entry = await this.prisma.appMetadata.findUnique({
      where: { key },
    });

    return entry?.value ?? "";
  }

  private async saveProfileText(
    key: string,
    value: unknown,
    fieldName: string
  ): Promise<string> {
    const normalized = this.requireText(value, fieldName);
    const entry = await this.prisma.appMetadata.upsert({
      where: { key },
      create: {
        key,
        value: normalized,
      },
      update: {
        value: normalized,
      },
    });

    return entry.value;
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

  private toPrismaBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
    const arrayBuffer: ArrayBuffer = new ArrayBuffer(buffer.length);
    const bytes = new Uint8Array<ArrayBuffer>(arrayBuffer);
    bytes.set(buffer);
    return bytes;
  }

  private toDataUrl(bytes: Uint8Array, mimeType: string): string {
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  private getAppSecret(): string {
    const value = process.env.BACKEND_APP_SECRET?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        "Application result secret is not configured."
      );
    }

    return value;
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
      // Keep the original webhook error as the API response even if the update fails.
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

    return "Unknown n8n webhook error.";
  }

  private toApplicationTicketListItem(ticket: {
    id: string;
    status: ApplicationTicketListItemResponse["status"];
    fullName: string;
    vacancyDescription: string;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApplicationTicketListItemResponse {
    return {
      ticketId: ticket.id,
      status: ticket.status,
      fullName: ticket.fullName,
      vacancyDescription: ticket.vacancyDescription,
      lastError: ticket.lastError,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
