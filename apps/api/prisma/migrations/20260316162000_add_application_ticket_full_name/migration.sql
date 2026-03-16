ALTER TABLE "ApplicationTicket"
ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ApplicationTicket"
ALTER COLUMN "fullName" DROP DEFAULT;
