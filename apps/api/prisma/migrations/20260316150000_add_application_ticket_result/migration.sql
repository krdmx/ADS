CREATE TABLE "ApplicationTicketResult" (
  "ticketId" TEXT NOT NULL,
  "cvPdf" BYTEA NOT NULL,
  "cvFileName" TEXT NOT NULL,
  "cvMimeType" TEXT NOT NULL,
  "coverLetterPdf" BYTEA NOT NULL,
  "coverLetterFileName" TEXT NOT NULL,
  "coverLetterMimeType" TEXT NOT NULL,
  "personalNote" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTicketResult_pkey" PRIMARY KEY ("ticketId"),
  CONSTRAINT "ApplicationTicketResult_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ApplicationTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
