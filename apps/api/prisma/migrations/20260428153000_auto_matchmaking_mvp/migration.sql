-- CreateEnum
CREATE TYPE "MatchmakingTicketStatus" AS ENUM ('SEARCHING', 'MATCHED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatchmakingProposalStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchmakingProposalParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_FOUND';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTO_MATCH_EXPIRED';

-- CreateTable
CREATE TABLE "MatchmakingTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "format" "SportFormat" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "earliestStart" TIMESTAMP(3) NOT NULL,
    "latestEnd" TIMESTAMP(3) NOT NULL,
    "preferredVenueId" TEXT,
    "minElo" INTEGER,
    "maxElo" INTEGER,
    "status" "MatchmakingTicketStatus" NOT NULL DEFAULT 'SEARCHING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchmakingTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchmakingProposal" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "format" "SportFormat" NOT NULL,
    "venueId" TEXT,
    "proposedStartTime" TIMESTAMP(3) NOT NULL,
    "status" "MatchmakingProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedMatchId" TEXT,
    CONSTRAINT "MatchmakingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchmakingProposalParticipant" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "team" "Team" NOT NULL DEFAULT 'UNKNOWN',
    "status" "MatchmakingProposalParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "MatchmakingProposalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchmakingTicket_sportId_format_status_createdAt_idx" ON "MatchmakingTicket"("sportId", "format", "status", "createdAt");
CREATE INDEX "MatchmakingTicket_userId_sportId_format_status_idx" ON "MatchmakingTicket"("userId", "sportId", "format", "status");
CREATE INDEX "MatchmakingProposal_status_createdAt_idx" ON "MatchmakingProposal"("status", "createdAt");
CREATE INDEX "MatchmakingProposal_sportId_format_status_idx" ON "MatchmakingProposal"("sportId", "format", "status");
CREATE UNIQUE INDEX "MatchmakingProposalParticipant_proposalId_userId_key" ON "MatchmakingProposalParticipant"("proposalId", "userId");
CREATE INDEX "MatchmakingProposalParticipant_userId_status_createdAt_idx" ON "MatchmakingProposalParticipant"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "MatchmakingTicket" ADD CONSTRAINT "MatchmakingTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingTicket" ADD CONSTRAINT "MatchmakingTicket_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingTicket" ADD CONSTRAINT "MatchmakingTicket_preferredVenueId_fkey" FOREIGN KEY ("preferredVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposal" ADD CONSTRAINT "MatchmakingProposal_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposal" ADD CONSTRAINT "MatchmakingProposal_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposal" ADD CONSTRAINT "MatchmakingProposal_confirmedMatchId_fkey" FOREIGN KEY ("confirmedMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposalParticipant" ADD CONSTRAINT "MatchmakingProposalParticipant_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MatchmakingProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposalParticipant" ADD CONSTRAINT "MatchmakingProposalParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchmakingProposalParticipant" ADD CONSTRAINT "MatchmakingProposalParticipant_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MatchmakingTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
