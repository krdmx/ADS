CREATE TABLE "ApplicationTicketCompanySummary" (
  "ticketId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "companyType" TEXT NOT NULL,
  "companySize" TEXT NOT NULL,
  "companyIndustry" TEXT NOT NULL,
  "companyBusinessModel" TEXT NOT NULL,
  "companyProductType" TEXT NOT NULL,
  "companyFounded" TEXT NOT NULL,
  "companyHq" TEXT NOT NULL,
  "companyFundingStage" TEXT NOT NULL,
  "cultureValues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "cultureWorkStyle" TEXT NOT NULL,
  "cultureEngineeringCulture" TEXT NOT NULL,
  "flagsGreen" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "flagsRed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTicketCompanySummary_pkey" PRIMARY KEY ("ticketId")
);

CREATE TABLE "ApplicationTicketVacancySummary" (
  "ticketId" TEXT NOT NULL,
  "positionTitle" TEXT NOT NULL,
  "positionSeniority" TEXT NOT NULL,
  "positionTeamContext" TEXT NOT NULL,
  "positionKeyTasks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "positionRequiredStack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "positionNiceToHaveStack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "positionSalaryMin" DOUBLE PRECISION,
  "positionSalaryMax" DOUBLE PRECISION,
  "positionSalaryCurrency" TEXT,
  "positionInterviewProcess" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "positionGrowthOpportunities" TEXT NOT NULL,
  "screeningPrepWhyHireMe" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "screeningPrepSmartQuestionsHr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "screeningPrepSmartQuestionsTech" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplicationTicketVacancySummary_pkey" PRIMARY KEY ("ticketId")
);

ALTER TABLE "ApplicationTicketCompanySummary"
ADD CONSTRAINT "ApplicationTicketCompanySummary_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "ApplicationTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationTicketVacancySummary"
ADD CONSTRAINT "ApplicationTicketVacancySummary_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "ApplicationTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
