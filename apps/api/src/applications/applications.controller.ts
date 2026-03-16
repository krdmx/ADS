import type {
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
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UnsupportedMediaTypeException,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

import { ApplicationsService } from "./applications.service";

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

type UploadedDocument = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

type UploadedResultFiles = {
  cv?: UploadedDocument[];
  coverLetter?: UploadedDocument[];
};

@Controller("api/v1/applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createApplication(
    @Body() body: CreateApplicationRequest
  ): Promise<CreateApplicationResponse> {
    return this.applicationsService.createApplication(body);
  }

  @Get()
  async listApplications(): Promise<GetApplicationsResponse> {
    return this.applicationsService.listApplications();
  }

  @Get("baseCv")
  async getBaseCv(): Promise<GetBaseCvResponse> {
    return this.applicationsService.getBaseCv();
  }

  @Get("workTasks")
  async getWorkTasks(): Promise<GetWorkTasksResponse> {
    return this.applicationsService.getWorkTasks();
  }

  @Put("baseCv")
  async updateBaseCv(
    @Body() body: UpdateBaseCvRequest
  ): Promise<GetBaseCvResponse> {
    return this.applicationsService.updateBaseCv(body);
  }

  @Put("workTasks")
  async updateWorkTasks(
    @Body() body: UpdateWorkTasksRequest
  ): Promise<GetWorkTasksResponse> {
    return this.applicationsService.updateWorkTasks(body);
  }

  @Get(":ticketId")
  async getApplicationTicket(
    @Param("ticketId") ticketId: string
  ): Promise<GetApplicationTicketResponse> {
    return this.applicationsService.getApplicationTicket(ticketId);
  }

  @Post(":ticketId/result")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "cv", maxCount: 1 },
        { name: "coverLetter", maxCount: 1 },
      ],
      {
        limits: {
          fileSize: MAX_PDF_FILE_SIZE_BYTES,
          files: 2,
        },
      }
    )
  )
  async uploadResult(
    @Param("ticketId") ticketId: string,
    @Headers("x-app-secret") appSecret: string | undefined,
    @Body("personalNote") personalNote: unknown,
    @UploadedFiles() files: UploadedResultFiles
  ): Promise<void> {
    const cv = this.getRequiredPdfFile(files?.cv, "cv");
    const coverLetter = this.getRequiredPdfFile(
      files?.coverLetter,
      "coverLetter"
    );

    await this.applicationsService.saveApplicationResult({
      ticketId,
      appSecret,
      personalNote,
      cv,
      coverLetter,
    });
  }

  private getRequiredPdfFile(
    fileList: UploadedDocument[] | undefined,
    fieldName: string
  ): UploadedDocument {
    const file = fileList?.[0];

    if (!file) {
      throw new BadRequestException(`${fieldName} file is required.`);
    }

    if (file.mimetype !== PDF_MIME_TYPE) {
      throw new UnsupportedMediaTypeException(
        `${fieldName} must be a PDF file.`
      );
    }

    return file;
  }
}
