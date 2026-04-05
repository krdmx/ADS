import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const apiDir = path.join(rootDir, "apps/api");

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readEnvFile(targetPath) {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  const content = await readFile(targetPath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value.replace(/\\n/g, "\n");
  }

  return entries;
}

function createPrismaClient() {
  const { PrismaClient } = require(
    path.join(apiDir, "src/generated/prisma/index.js")
  );

  return new PrismaClient();
}

function parseCliArgs(argv) {
  const options = {};

  for (const argument of argv) {
    if (argument.startsWith("--user-id=")) {
      options.userId = argument.slice("--user-id=".length).trim();
      continue;
    }

    if (argument.startsWith("--email=")) {
      options.email = argument.slice("--email=".length).trim();
    }
  }

  return options;
}

async function resolveTargetUser(prisma, options) {
  if (options.userId) {
    return prisma.user.findUnique({
      where: {
        id: options.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  if (options.email) {
    return prisma.user.findUnique({
      where: {
        email: options.email,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  const preferredUser = await prisma.user.findFirst({
    where: {
      NOT: {
        email: {
          startsWith: "verify-user+",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (preferredUser) {
    return preferredUser;
  }

  return prisma.user.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      email: true,
    },
  });
}

async function main() {
  const env = {
    ...(await readEnvFile(path.join(apiDir, ".env.example"))),
    ...(await readEnvFile(path.join(apiDir, ".env"))),
  };

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured in apps/api/.env");
  }

  process.env.DATABASE_URL = env.DATABASE_URL;

  const prisma = createPrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const user = await resolveTargetUser(prisma, options);

    if (!user) {
      throw new Error(
        "No users found for seeding. Pass --user-id=<id> or --email=<email>, or create an account first."
      );
    }

    const seededAt = new Date();
    const label = seededAt.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const companyName = "Northstar Labs";
    const positionTitle = "Senior Frontend Engineer";

    const ticket = await prisma.applicationTicket.create({
      data: {
        userId: user.id,
        status: "completed",
        companyName,
        companyWebsite: "https://northstar.example",
        positionTitle,
        jdUrl: `https://northstar.example/jobs/frontend-${label}`,
        vacancyDescription:
          "Build product-facing React flows, partner with design, and improve frontend platform quality.",
        companySummary: {
          create: {
            companyName,
            companyType: "startup",
            companySize: "51-200",
            companyIndustry: "Developer tools",
            companyBusinessModel: "B2B",
            companyProductType: "SaaS",
            companyFounded: "2020",
            companyHq: "Remote",
            companyFundingStage: "series_a",
            cultureValues: ["Ownership", "Clarity", "Speed"],
            cultureWorkStyle: "remote",
            cultureEngineeringCulture:
              "Lean product teams, direct ownership, pragmatic technical decisions.",
            flagsGreen: [
              "Clear product ownership",
              "Healthy engineering standards",
            ],
            flagsRed: ["Priorities may change quickly quarter to quarter"],
          },
        },
      },
      select: {
        id: true,
      },
    });

    console.log(`Seeded partial summary ticket: ${ticket.id}`);
    console.log(`User ID: ${user.id}`);
    console.log(`User email: ${user.email}`);
    console.log(
      `Summary state: company summary saved, vacancy summary missing (null on GET /summary).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `[seed:company-summary-ticket] ${error instanceof Error ? error.stack ?? error.message : String(error)}`
  );
  process.exitCode = 1;
});
