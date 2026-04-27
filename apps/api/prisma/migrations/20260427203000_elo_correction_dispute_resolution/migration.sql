ALTER TABLE "MatchResult"
ADD COLUMN IF NOT EXISTS "correctedTeamAScore" INTEGER,
ADD COLUMN IF NOT EXISTS "correctedTeamBScore" INTEGER,
ADD COLUMN IF NOT EXISTS "correctedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "correctedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "correctionReason" TEXT,
ADD COLUMN IF NOT EXISTS "isCorrected" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE "MatchResult"
  ADD CONSTRAINT "MatchResult_correctedByUserId_fkey"
  FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "RatingHistory"
ADD COLUMN IF NOT EXISTS "correctionOfRatingHistoryId" TEXT,
ADD COLUMN IF NOT EXISTS "isReverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "revertedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "revertReason" TEXT;

CREATE INDEX IF NOT EXISTS "RatingHistory_matchId_createdAt_idx"
ON "RatingHistory"("matchId", "createdAt");

ALTER TABLE "ModerationAction"
ADD COLUMN IF NOT EXISTS "metadata" JSONB;
