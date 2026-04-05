import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import type { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";

type PrismaDbClient = PrismaService | Prisma.TransactionClient;
type ProfileFieldName = "fullName" | "baseCv" | "workTasks";
export const LOCAL_WORKSPACE_USER_ID = "local-workspace-user";

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocalUserId(db: PrismaDbClient = this.prisma): Promise<string> {
    await this.ensureLocalUser(db);
    return LOCAL_WORKSPACE_USER_ID;
  }

  async getProfileField(
    userId: string,
    fieldName: ProfileFieldName
  ): Promise<string> {
    const profile = await this.ensureUserProfile(userId);
    return profile[fieldName];
  }

  async getRequiredProfileField(
    userId: string,
    fieldName: ProfileFieldName
  ): Promise<string> {
    const value = await this.getProfileField(userId, fieldName);
    const normalized = value.trim();

    if (!normalized) {
      throw new ServiceUnavailableException(
        `Application profile field "${fieldName}" is not configured.`
      );
    }

    return normalized;
  }

  async updateProfileField(
    userId: string,
    fieldName: ProfileFieldName,
    value: unknown
  ): Promise<string> {
    if (userId !== LOCAL_WORKSPACE_USER_ID) {
      throw new ServiceUnavailableException(
        "Unexpected workspace user identifier."
      );
    }

    await this.ensureLocalUser();

    const normalized = this.requireTrimmedText(value, fieldName);
    const profile = await this.prisma.userProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        [fieldName]: normalized,
      },
      update: {
        [fieldName]: normalized,
      },
    });

    return profile[fieldName];
  }

  private async ensureUserProfile(
    userId: string,
    db: PrismaDbClient = this.prisma
  ) {
    if (userId !== LOCAL_WORKSPACE_USER_ID) {
      throw new ServiceUnavailableException(
        "Unexpected workspace user identifier."
      );
    }

    await this.ensureLocalUser(db);

    const profile = await db.userProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
      },
      update: {},
    });

    return profile;
  }

  private async ensureLocalUser(db: PrismaDbClient = this.prisma) {
    return db.user.upsert({
      where: {
        id: LOCAL_WORKSPACE_USER_ID,
      },
      create: {
        id: LOCAL_WORKSPACE_USER_ID,
      },
      update: {},
    });
  }

  private requireTrimmedText(value: unknown, fieldName: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }
}
