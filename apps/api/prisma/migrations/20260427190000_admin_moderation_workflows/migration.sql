DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ModerationActionType" AS ENUM (
    'REPORT_REVIEWED',
    'REPORT_DISMISSED',
    'DISPUTE_RESOLVED',
    'DISPUTE_REJECTED',
    'NO_SHOW_CONFIRMED',
    'NO_SHOW_REVERSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "UserReport"
ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "moderatorNote" TEXT;

ALTER TABLE "MatchResultDispute"
ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "moderatorNote" TEXT;

CREATE TABLE IF NOT EXISTS "ModerationAction" (
  "id" TEXT NOT NULL,
  "moderatorUserId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "reportId" TEXT,
  "disputeId" TEXT,
  "matchId" TEXT,
  "participantId" TEXT,
  "actionType" "ModerationActionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationAction_moderatorUserId_createdAt_idx"
ON "ModerationAction"("moderatorUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "ModerationAction_targetUserId_createdAt_idx"
ON "ModerationAction"("targetUserId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MatchResultDispute"
  ADD CONSTRAINT "MatchResultDispute_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_moderatorUserId_fkey"
  FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "UserReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_disputeId_fkey"
  FOREIGN KEY ("disputeId") REFERENCES "MatchResultDispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
