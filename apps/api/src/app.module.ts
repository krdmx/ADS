import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ApplicationsModule } from "./applications/applications.module";
import { HealthModule } from "./health/health.module";
import { StatusModule } from "./status/status.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ApplicationsModule,
    HealthModule,
    StatusModule,
  ],
})
export class AppModule {}
