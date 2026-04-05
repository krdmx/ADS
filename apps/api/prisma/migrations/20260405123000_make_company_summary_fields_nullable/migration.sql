ALTER TABLE "ApplicationTicketCompanySummary"
ALTER COLUMN "companyType" DROP NOT NULL,
ALTER COLUMN "companySize" DROP NOT NULL,
ALTER COLUMN "companyIndustry" DROP NOT NULL,
ALTER COLUMN "companyBusinessModel" DROP NOT NULL,
ALTER COLUMN "companyProductType" DROP NOT NULL,
ALTER COLUMN "companyFounded" DROP NOT NULL,
ALTER COLUMN "companyHq" DROP NOT NULL,
ALTER COLUMN "companyFundingStage" DROP NOT NULL,
ALTER COLUMN "cultureWorkStyle" DROP NOT NULL,
ALTER COLUMN "cultureEngineeringCulture" DROP NOT NULL;
