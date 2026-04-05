import type {
  ApplicationTicketResultResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ExportApplicationArchiveRequest,
  ExportApplicationPdfRequest,
  GetApplicationBoardResponse,
  GetApplicationsResponse,
  GetApplicationSummaryResponse,
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetFullNameResponse,
  SaveApplicationSummaryRequest,
  GetWorkTasksResponse,
  SaveApplicationResultRequest,
  TransitionApplicationBoardStageRequest,
  UpdateApplicationBoardStageRequest,
  UpdateApplicationResultRequest,
  UpdateBaseCvRequest,
  UpdateFullNameRequest,
  UpdateWorkTasksRequest,
} from "@repo/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  StreamableFile,
} from "@nestjs/common";

import { AccountService } from "../account/account.service";
import { PdfService } from "../pdf/pdf.service";
import { ApplicationBoardService } from "./application-board.service";
import { ApplicationSummaryService } from "./application-summary.service";
import { ApplicationsService } from "./applications.service";

@Controller("api/v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly applicationBoardService: ApplicationBoardService,
    private readonly applicationSummaryService: ApplicationSummaryService,
    private readonly accountService: AccountService,
    private readonly pdfService: PdfService
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createApplication(
    @Body() body: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.createApplication(userId, body);
  }

  @Get()
  async listApplications(): Promise<GetApplicationsResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.listApplications(userId);
  }

  @Get("board")
  async getApplicationBoard(): Promise<GetApplicationBoardResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationBoardService.listApplicationBoard(userId);
  }

  @Get("baseCv")
  async getBaseCv(): Promise<GetBaseCvResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.getBaseCv(userId);
  }

  @Get("fullName")
  async getFullName(): Promise<GetFullNameResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.getFullName(userId);
  }

  @Get("workTasks")
  async getWorkTasks(): Promise<GetWorkTasksResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.getWorkTasks(userId);
  }

  @Put("baseCv")
  async updateBaseCv(
    @Body() body: UpdateBaseCvRequest
  ): Promise<GetBaseCvResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.updateBaseCv(userId, body);
  }

  @Put("fullName")
  async updateFullName(
    @Body() body: UpdateFullNameRequest
  ): Promise<GetFullNameResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.updateFullName(userId, body);
  }

  @Put("workTasks")
  async updateWorkTasks(
    @Body() body: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.updateWorkTasks(userId, body);
  }

  @Get(":ticketId/summary")
  async getApplicationSummary(
    @Param("ticketId") ticketId: string
  ): Promise<GetApplicationSummaryResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationSummaryService.getApplicationSummary(
      userId,
      ticketId
    );
  }

  @Post(":ticketId/summary/generate")
  @HttpCode(HttpStatus.ACCEPTED)
  async requestApplicationSummary(
    @Param("ticketId") ticketId: string
  ): Promise<void> {
    const userId = await this.accountService.getLocalUserId();
    await this.applicationSummaryService.requestApplicationSummary(
      userId,
      ticketId
    );
  }

  @Post(":ticketId/summary")
  @HttpCode(HttpStatus.NO_CONTENT)
  async uploadSummary(
    @Param("ticketId") ticketId: string,
    @Headers("x-app-secret") appSecret: string | undefined,
    @Body() body: SaveApplicationSummaryRequest
  ): Promise<void> {
    await this.applicationSummaryService.saveApplicationSummary({
      ticketId,
      appSecret,
      request: body,
    });
  }

  @Get(":ticketId")
  async getApplicationTicket(
    @Param("ticketId") ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.getApplicationTicket(userId, ticketId);
  }

  @Post(":ticketId/result")
  @HttpCode(HttpStatus.NO_CONTENT)
  async uploadResult(
    @Param("ticketId") ticketId: string,
    @Headers("x-app-secret") appSecret: string | undefined,
    @Body() body: SaveApplicationResultRequest
  ): Promise<void> {
    await this.applicationsService.saveApplicationResult({
      ticketId,
      appSecret,
      request: body,
    });
  }

  @Put(":ticketId/result")
  async updateResult(
    @Param("ticketId") ticketId: string,
    @Body() body: UpdateApplicationResultRequest
  ): Promise<ApplicationTicketResultResponse> {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationsService.updateApplicationResult(
      userId,
      ticketId,
      body
    );
  }

  @Put(":ticketId/tracker/stages/:stageKey")
  async updateTrackerStage(
    @Param("ticketId") ticketId: string,
    @Param("stageKey") stageKey: string,
    @Body() body: UpdateApplicationBoardStageRequest
  ) {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationBoardService.updateApplicationTrackerStage(
      userId,
      ticketId,
      stageKey,
      body
    );
  }

  @Post(":ticketId/tracker/transitions")
  async transitionTrackerStage(
    @Param("ticketId") ticketId: string,
    @Body() body: TransitionApplicationBoardStageRequest
  ) {
    const userId = await this.accountService.getLocalUserId();
    return this.applicationBoardService.transitionApplicationTrackerStage(
      userId,
      ticketId,
      body
    );
  }

  @Post(":ticketId/pdf")
  @HttpCode(HttpStatus.OK)
  async exportPdf(
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationPdfRequest
  ): Promise<StreamableFile> {
    const userId = await this.accountService.getLocalUserId();
    await this.applicationsService.assertTicketAccess(userId, ticketId);

    const { buffer, fileName } = await this.pdfService.renderApplicationPdf({
      ticketId,
      html: body.html,
      fileName: body.fileName,
    });

    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }

  @Post(":ticketId/archive")
  @HttpCode(HttpStatus.OK)
  async exportArchive(
    @Param("ticketId") ticketId: string,
    @Body() body: ExportApplicationArchiveRequest
  ): Promise<StreamableFile> {
    const userId = await this.accountService.getLocalUserId();
    await this.applicationsService.assertTicketAccess(userId, ticketId);

    const { buffer, fileName } =
      await this.pdfService.renderApplicationArchive({
        ticketId,
        archiveName: body.archiveName,
        documents: body.documents,
      });

    return new StreamableFile(buffer, {
      type: "application/zip",
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }

  @Delete(":ticketId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApplication(
    @Param("ticketId") ticketId: string
  ): Promise<void> {
    const userId = await this.accountService.getLocalUserId();
    await this.applicationsService.deleteApplication(userId, ticketId);
  }
}
