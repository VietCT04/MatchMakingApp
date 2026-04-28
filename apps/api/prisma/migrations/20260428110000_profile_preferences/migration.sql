ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "skillDescription" TEXT;

CREATE TABLE IF NOT EXISTS "UserSportPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sportId" TEXT NOT NULL,
  "prefersSingles" BOOLEAN NOT NULL DEFAULT true,
  "prefersDoubles" BOOLEAN NOT NULL DEFAULT true,
  "minPreferredRating" INTEGER,
  "maxPreferredRating" INTEGER,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSportPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPreferredVenue" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreferredVenue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserAvailabilitySlot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSportPreference_userId_sportId_key" ON "UserSportPreference"("userId", "sportId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferredVenue_userId_venueId_key" ON "UserPreferredVenue"("userId", "venueId");
CREATE INDEX IF NOT EXISTS "UserSportPreference_userId_priority_idx" ON "UserSportPreference"("userId", "priority");
CREATE INDEX IF NOT EXISTS "UserPreferredVenue_userId_priority_idx" ON "UserPreferredVenue"("userId", "priority");
CREATE INDEX IF NOT EXISTS "UserAvailabilitySlot_userId_dayOfWeek_startTime_idx" ON "UserAvailabilitySlot"("userId", "dayOfWeek", "startTime");

DO $$
BEGIN
  ALTER TABLE "UserSportPreference"
  ADD CONSTRAINT "UserSportPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserSportPreference"
  ADD CONSTRAINT "UserSportPreference_sportId_fkey"
  FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPreferredVenue"
  ADD CONSTRAINT "UserPreferredVenue_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPreferredVenue"
  ADD CONSTRAINT "UserPreferredVenue_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserAvailabilitySlot"
  ADD CONSTRAINT "UserAvailabilitySlot_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
