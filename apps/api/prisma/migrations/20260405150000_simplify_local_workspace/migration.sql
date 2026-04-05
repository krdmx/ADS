DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'User'
  ) THEN
    INSERT INTO "User" (
      "id",
      "email",
      "googleSub",
      "name",
      "image",
      "stripeCustomerId",
      "hasExclusivePlan",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      'local-workspace-user',
      'local-workspace-user@pep.local',
      'local-workspace-user',
      'Local workspace',
      NULL,
      NULL,
      false,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE
    SET
      "updatedAt" = CURRENT_TIMESTAMP;

    WITH "latest_profile" AS (
      SELECT
        "userId",
        "fullName",
        "baseCv",
        "workTasks"
      FROM "UserProfile"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "userId" DESC
      LIMIT 1
    )
    INSERT INTO "UserProfile" (
      "userId",
      "fullName",
      "baseCv",
      "workTasks",
      "createdAt",
      "updatedAt"
    )
    SELECT
      'local-workspace-user',
      COALESCE("fullName", ''),
      COALESCE("baseCv", ''),
      COALESCE("workTasks", ''),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "latest_profile"
    UNION ALL
    SELECT
      'local-workspace-user',
      '',
      '',
      '',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "latest_profile")
    ON CONFLICT ("userId") DO UPDATE
    SET
      "fullName" = EXCLUDED."fullName",
      "baseCv" = EXCLUDED."baseCv",
      "workTasks" = EXCLUDED."workTasks",
      "updatedAt" = CURRENT_TIMESTAMP;

    UPDATE "ApplicationTicket"
    SET "userId" = 'local-workspace-user'
    WHERE "userId" IS DISTINCT FROM 'local-workspace-user';

    DELETE FROM "UserProfile"
    WHERE "userId" <> 'local-workspace-user';

    DELETE FROM "User"
    WHERE "id" <> 'local-workspace-user';
  END IF;
END $$;

ALTER TABLE "ApplicationTicket"
DROP CONSTRAINT IF EXISTS "ApplicationTicket_userId_fkey";

DROP TABLE IF EXISTS "Subscription";
DROP TABLE IF EXISTS "UsageBucket";

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_googleSub_key";
DROP INDEX IF EXISTS "User_stripeCustomerId_key";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ApplicationTicket'
      AND column_name = 'userId'
  ) THEN
    UPDATE "ApplicationTicket"
    SET "userId" = 'local-workspace-user'
    WHERE "userId" IS NULL;

    ALTER TABLE "ApplicationTicket"
    ALTER COLUMN "userId" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "User"
DROP COLUMN IF EXISTS "email",
DROP COLUMN IF EXISTS "googleSub",
DROP COLUMN IF EXISTS "name",
DROP COLUMN IF EXISTS "image",
DROP COLUMN IF EXISTS "stripeCustomerId",
DROP COLUMN IF EXISTS "hasExclusivePlan";

ALTER TABLE "ApplicationTicket"
ADD CONSTRAINT "ApplicationTicket_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE IF EXISTS "BillingSubscriptionStatus";
