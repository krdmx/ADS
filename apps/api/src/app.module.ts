import { Module } from "@nestjs/common";

import { AccountModule } from "./account/account.module";
import { ApplicationsModule } from "./applications/applications.module";
import { HealthModule } from "./health/health.module";
import { PdfModule } from "./pdf/pdf.module";
import { StatusModule } from "./status/status.module";

@Module({
  imports: [
    AccountModule,
    ApplicationsModule,
    HealthModule,
    PdfModule,
    StatusModule,
  ],
})
export class AppModule {}
