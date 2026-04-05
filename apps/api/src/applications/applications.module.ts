import { Module } from "@nestjs/common";

import { AccountModule } from "../account/account.module";
import { PdfModule } from "../pdf/pdf.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ApplicationBoardService } from "./application-board.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationSummaryService } from "./application-summary.service";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [PrismaModule, PdfModule, AccountModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationBoardService,
    ApplicationSummaryService,
  ],
})
export class ApplicationsModule {}
