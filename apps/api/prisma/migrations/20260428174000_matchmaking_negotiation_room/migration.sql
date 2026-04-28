-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_LOCATION_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_LOCATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_LOCATION_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_CANCELLED';

-- CreateEnum
CREATE TYPE "MatchmakingLocationProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "Venue" ADD COLUMN "googlePlaceId" TEXT;

-- CreateTable
CREATE TABLE "MatchmakingProposalMessage" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MatchmakingProposalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchmakingLocationProposal" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "googleMapsUrl" TEXT,
    "googlePlaceId" TEXT,
    "status" "MatchmakingLocationProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "MatchmakingLocationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchmakingLocationProposalResponse" (
    "id" TEXT NOT NULL,
    "locationProposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MatchmakingProposalParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "MatchmakingLocationProposalResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchmakingProposalMessage_proposalId_createdAt_idx" ON "MatchmakingProposalMessage"("proposalId", "createdAt");
CREATE INDEX "MatchmakingProposalMessage_senderUserId_createdAt_idx" ON "MatchmakingProposalMessage"("senderUserId", "createdAt");
CREATE INDEX "MatchmakingLocationProposal_proposalId_status_createdAt_idx" ON "MatchmakingLocationProposal"("proposalId", "status", "createdAt");
CREATE UNIQUE INDEX "MatchmakingLocationProposalResponse_locationProposalId_userId_key" ON "MatchmakingLocationProposalResponse"("locationProposalId", "userId");
CREATE INDEX "MatchmakingLocationProposalResponse_userId_status_createdAt_idx" ON "MatchmakingLocationProposalResponse"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "MatchmakingProposalMessage" ADD CONSTRAINT "MatchmakingProposalMessage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MatchmakingProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposalMessage" ADD CONSTRAINT "MatchmakingProposalMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingLocationProposal" ADD CONSTRAINT "MatchmakingLocationProposal_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MatchmakingProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingLocationProposal" ADD CONSTRAINT "MatchmakingLocationProposal_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingLocationProposalResponse" ADD CONSTRAINT "MatchmakingLocationProposalResponse_locationProposalId_fkey" FOREIGN KEY ("locationProposalId") REFERENCES "MatchmakingLocationProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingLocationProposalResponse" ADD CONSTRAINT "MatchmakingLocationProposalResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
