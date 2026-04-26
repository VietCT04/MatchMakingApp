-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "UserReliabilityStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedMatches" INTEGER NOT NULL DEFAULT 0,
    "cancelledMatches" INTEGER NOT NULL DEFAULT 0,
    "lateCancellationCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "disputedResults" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReliabilityStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResultDispute" (
    "id" TEXT NOT NULL,
    "matchResultId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResultDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "matchId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserReliabilityStats_userId_key" ON "UserReliabilityStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResultDispute_matchResultId_createdByUserId_key" ON "MatchResultDispute"("matchResultId", "createdByUserId");

-- CreateIndex
CREATE INDEX "MatchResultDispute_matchId_status_idx" ON "MatchResultDispute"("matchId", "status");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_status_idx" ON "UserReport"("reportedUserId", "status");

-- CreateIndex
CREATE INDEX "UserReport_reporterUserId_createdAt_idx" ON "UserReport"("reporterUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserReliabilityStats" ADD CONSTRAINT "UserReliabilityStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultDispute" ADD CONSTRAINT "MatchResultDispute_matchResultId_fkey" FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultDispute" ADD CONSTRAINT "MatchResultDispute_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultDispute" ADD CONSTRAINT "MatchResultDispute_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
