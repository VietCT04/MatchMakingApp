ALTER TABLE "NotificationPreference"
ADD COLUMN IF NOT EXISTS "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "quietHoursStart" TEXT,
ADD COLUMN IF NOT EXISTS "quietHoursEnd" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT;

CREATE TABLE IF NOT EXISTS "MatchNotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "muteUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MatchNotificationPreference_userId_matchId_key"
ON "MatchNotificationPreference"("userId", "matchId");

CREATE INDEX IF NOT EXISTS "MatchNotificationPreference_matchId_userId_idx"
ON "MatchNotificationPreference"("matchId", "userId");

ALTER TABLE "MatchNotificationPreference"
ADD CONSTRAINT "MatchNotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchNotificationPreference"
ADD CONSTRAINT "MatchNotificationPreference_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChatReadState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatReadState_userId_matchId_key"
ON "ChatReadState"("userId", "matchId");

CREATE INDEX IF NOT EXISTS "ChatReadState_matchId_userId_idx"
ON "ChatReadState"("matchId", "userId");

ALTER TABLE "ChatReadState"
ADD CONSTRAINT "ChatReadState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatReadState"
ADD CONSTRAINT "ChatReadState_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
