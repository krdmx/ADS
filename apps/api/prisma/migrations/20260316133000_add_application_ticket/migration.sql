CREATE TYPE "ApplicationTicketStatus" AS ENUM ('processing', 'completed', 'failed');

CREATE TABLE "ApplicationTicket" (
  "id" TEXT NOT NULL,
  "status" "ApplicationTicketStatus" NOT NULL,
  "vacancyDescription" TEXT NOT NULL,
  "companySite" TEXT NOT NULL,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTicket_pkey" PRIMARY KEY ("id")
);
