-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('MANUAL', 'GPS', 'QR');

-- AlterTable
ALTER TABLE "MatchParticipant"
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkInMethod" "CheckInMethod",
ADD COLUMN "checkedInLatitude" DOUBLE PRECISION,
ADD COLUMN "checkedInLongitude" DOUBLE PRECISION;
