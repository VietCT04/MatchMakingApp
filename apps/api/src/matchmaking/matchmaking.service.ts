import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchParticipantStatus,
  MatchStatus,
  MatchmakingProposalParticipantStatus,
  MatchmakingProposalStatus,
  MatchmakingTicketStatus,
  NotificationType,
  Prisma,
  SportFormat,
  Team,
} from '@prisma/client';
import { calculateDistanceKm } from '../common/geo/haversine';
import { NotificationsService } from '../notifications/notifications.service';
import { PreferencesService } from '../preferences/preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { RatingsService } from '../ratings/ratings.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { CreateMatchmakingTicketDto } from './dto.create-matchmaking-ticket';

type TicketWithUser = Prisma.MatchmakingTicketGetPayload<{
  include: {
    user: { select: { id: true; displayName: true } };
    preferredVenue: { select: { id: true; name: true; latitude: true; longitude: true } };
    sport: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingsService: RatingsService,
    private readonly reliabilityService: ReliabilityService,
    private readonly preferencesService: PreferencesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrReplaceTicket(userId: string, dto: CreateMatchmakingTicketDto) {
    await this.validateTicketPayload(dto);

    const earliestStart = new Date(dto.earliestStart);
    const latestEnd = new Date(dto.latestEnd);
    const expiresAt = new Date(Math.min(latestEnd.getTime(), Date.now() + 1000 * 60 * 30));

    return this.prisma.$transaction(async (tx) => {
      await tx.matchmakingTicket.updateMany({
        where: {
          userId,
          sportId: dto.sportId,
          format: dto.format,
          status: MatchmakingTicketStatus.SEARCHING,
        },
        data: { status: MatchmakingTicketStatus.CANCELLED },
      });

      return tx.matchmakingTicket.create({
        data: {
          userId,
          sportId: dto.sportId,
          format: dto.format,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radiusKm: dto.radiusKm,
          earliestStart,
          latestEnd,
          preferredVenueId: dto.preferredVenueId,
          minElo: dto.minElo,
          maxElo: dto.maxElo,
          expiresAt,
          status: MatchmakingTicketStatus.SEARCHING,
        },
      });
    });
  }

  async runSearchForUser(userId: string) {
    const myTicket = await this.prisma.matchmakingTicket.findFirst({
      where: {
        userId,
        status: MatchmakingTicketStatus.SEARCHING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true } },
        preferredVenue: { select: { id: true, name: true, latitude: true, longitude: true } },
        sport: { select: { id: true, name: true } },
      },
    });

    if (!myTicket) {
      throw new NotFoundException('No active matchmaking ticket found. Create a ticket first.');
    }

    const expansion = this.getExpansion(myTicket.createdAt, myTicket.radiusKm);

    const candidateTickets = await this.prisma.matchmakingTicket.findMany({
      where: {
        id: { not: myTicket.id },
        sportId: myTicket.sportId,
        format: myTicket.format,
        status: MatchmakingTicketStatus.SEARCHING,
        expiresAt: { gt: new Date() },
        earliestStart: { lt: myTicket.latestEnd },
        latestEnd: { gt: myTicket.earliestStart },
      },
      include: {
        user: { select: { id: true, displayName: true } },
        preferredVenue: { select: { id: true, name: true, latitude: true, longitude: true } },
        sport: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const myRating = await this.getTicketRating(myTicket.userId, myTicket.sportId, myTicket.format);
    const myReliability = await this.getUserReliability(myTicket.userId);
    const myPreferences = await this.preferencesService.getRankingPreferences(myTicket.userId);

    const scoredCandidates = [] as Array<{ ticket: TicketWithUser; score: number; rating: number; reliability: number }>;
    for (const candidate of candidateTickets) {
      const candidateRating = await this.getTicketRating(candidate.userId, candidate.sportId, candidate.format);
      const candidateReliability = await this.getUserReliability(candidate.userId);
      const compatible = this.isCompatiblePair(
        myTicket,
        candidate,
        myRating,
        candidateRating,
        myReliability,
        candidateReliability,
        expansion.eloTolerance,
        expansion.radiusKm,
      );
      if (!compatible) {
        continue;
      }

      const availabilityScore = this.calculateAvailabilityOverlapScore(myTicket, candidate);
      const distanceScore = this.calculateDistanceScore(myTicket, candidate, expansion.radiusKm);
      const eloScore = this.calculateEloScore(myRating, candidateRating, expansion.eloTolerance);
      const reliabilityScore = (myReliability + candidateReliability) / 2;
      const preferenceScore = this.calculatePreferenceCompatibilityScore(myTicket, candidate, myPreferences);

      const score =
        eloScore * 0.35 +
        distanceScore * 0.25 +
        availabilityScore * 0.2 +
        reliabilityScore * 0.15 +
        preferenceScore * 0.05;

      scoredCandidates.push({ ticket: candidate, score: Number(score.toFixed(2)), rating: candidateRating, reliability: candidateReliability });
    }

    if (myTicket.format === SportFormat.SINGLES) {
      if (scoredCandidates.length === 0) {
        return {
          found: false,
          message: 'No match found yet. Try widening your radius or time window.',
          suggestions: {
            eloTolerance: expansion.eloTolerance,
            suggestedRadiusKm: Number(expansion.radiusKm.toFixed(2)),
          },
        };
      }

      scoredCandidates.sort((a, b) => b.score - a.score || a.ticket.createdAt.getTime() - b.ticket.createdAt.getTime());
      const selected = scoredCandidates[0];
      const proposal = await this.createProposal([myTicket, selected.ticket], SportFormat.SINGLES);
      return { found: true, proposal };
    }

    // Doubles: pick best 3 compatible candidates and split to balanced teams.
    if (scoredCandidates.length < 3) {
      return {
        found: false,
        message: 'No match found yet. Try widening your radius or time window.',
        suggestions: {
          eloTolerance: expansion.eloTolerance,
          suggestedRadiusKm: Number(expansion.radiusKm.toFixed(2)),
        },
      };
    }

    scoredCandidates.sort((a, b) => b.score - a.score || a.ticket.createdAt.getTime() - b.ticket.createdAt.getTime());
    const topThree = scoredCandidates.slice(0, 3);
    const tickets = [myTicket, ...topThree.map((item) => item.ticket)];
    const proposal = await this.createProposal(tickets, SportFormat.DOUBLES);
    return { found: true, proposal };
  }

  getMyTickets(userId: string, limit = 20) {
    return this.prisma.matchmakingTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sport: true,
        preferredVenue: true,
      },
    });
  }

  getMyProposals(userId: string, limit = 20) {
    return this.prisma.matchmakingProposal.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sport: true,
        venue: true,
        confirmedMatch: true,
        participants: {
          include: {
            user: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async acceptProposal(userId: string, proposalId: string) {
    const participant = await this.prisma.matchmakingProposalParticipant.findFirst({
      where: { proposalId, userId },
      include: {
        proposal: {
          include: {
            participants: true,
            sport: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Proposal participant not found');
    }
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) {
      throw new BadRequestException('Proposal is not pending');
    }

    await this.prisma.matchmakingProposalParticipant.update({
      where: { id: participant.id },
      data: { status: MatchmakingProposalParticipantStatus.ACCEPTED, respondedAt: new Date() },
    });

    const refreshed = await this.prisma.matchmakingProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        participants: true,
        sport: true,
      },
    });

    const allAccepted = refreshed.participants.every((item) => item.status === MatchmakingProposalParticipantStatus.ACCEPTED);
    if (!allAccepted) {
      return this.getProposalById(proposalId);
    }

    const createdMatch = await this.confirmProposalAndCreateMatch(refreshed);
    return {
      ...(await this.getProposalById(proposalId)),
      confirmedMatch: createdMatch,
    };
  }

  async declineProposal(userId: string, proposalId: string) {
    const participant = await this.prisma.matchmakingProposalParticipant.findFirst({
      where: { proposalId, userId },
      include: { proposal: true },
    });

    if (!participant) {
      throw new NotFoundException('Proposal participant not found');
    }
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) {
      throw new BadRequestException('Proposal is not pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matchmakingProposalParticipant.update({
        where: { id: participant.id },
        data: { status: MatchmakingProposalParticipantStatus.DECLINED, respondedAt: new Date() },
      });

      await tx.matchmakingProposal.update({
        where: { id: proposalId },
        data: { status: MatchmakingProposalStatus.DECLINED },
      });

      const peers = await tx.matchmakingProposalParticipant.findMany({
        where: { proposalId },
      });

      for (const peer of peers) {
        const ticket = await tx.matchmakingTicket.findUnique({ where: { id: peer.ticketId } });
        if (!ticket) {
          continue;
        }
        const nextStatus = ticket.expiresAt > new Date()
          ? MatchmakingTicketStatus.SEARCHING
          : MatchmakingTicketStatus.EXPIRED;
        await tx.matchmakingTicket.update({
          where: { id: ticket.id },
          data: { status: nextStatus },
        });
      }
    });

    const proposal = await this.getProposalById(proposalId);
    await this.notificationsService.createManyNotifications(
      proposal.participants.map((p) => ({
        userId: p.userId,
        type: NotificationType.AUTO_MATCH_DECLINED,
        title: 'Auto match declined',
        body: 'An auto matchmaking proposal was declined.',
        data: { proposalId, dedupeKey: `auto-match-declined:${proposalId}` },
      })),
    );

    return proposal;
  }

  private async confirmProposalAndCreateMatch(proposal: Prisma.MatchmakingProposalGetPayload<{ include: { participants: true; sport: true } }>) {
    const startsAt = proposal.proposedStartTime;
    const maxPlayers = proposal.format === SportFormat.SINGLES ? 2 : 4;

    const createdMatch = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          sportId: proposal.sportId,
          venueId: proposal.venueId,
          createdByUserId: proposal.participants[0].userId,
          title: `Auto match - ${proposal.sport.name} ${proposal.format.toLowerCase()}`,
          description: 'Created by auto matchmaking',
          format: proposal.format,
          status: MatchStatus.FULL,
          startsAt,
          maxPlayers,
        },
      });

      await tx.matchParticipant.createMany({
        data: proposal.participants.map((participant) => ({
          matchId: match.id,
          userId: participant.userId,
          status: MatchParticipantStatus.JOINED,
          team: participant.team,
        })),
      });

      await tx.matchmakingProposal.update({
        where: { id: proposal.id },
        data: {
          status: MatchmakingProposalStatus.CONFIRMED,
          confirmedMatchId: match.id,
        },
      });

      return match;
    });

    await this.notificationsService.createManyNotifications(
      proposal.participants.map((participant) => ({
        userId: participant.userId,
        type: NotificationType.AUTO_MATCH_CONFIRMED,
        title: 'Match confirmed',
        body: 'Your auto matchmaking proposal was confirmed.',
        data: {
          matchId: createdMatch.id,
          proposalId: proposal.id,
          dedupeKey: `auto-match-confirmed:${proposal.id}:${participant.userId}`,
        },
      })),
    );

    return createdMatch;
  }

  private async createProposal(tickets: TicketWithUser[], format: SportFormat) {
    const proposedStartTime = this.pickOverlappingStart(tickets);
    const venueId = await this.pickVenue(tickets);
    const teamAssignments = await this.assignTeams(tickets, format);

    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.matchmakingProposal.create({
        data: {
          sportId: tickets[0].sportId,
          format,
          venueId,
          proposedStartTime,
          status: MatchmakingProposalStatus.PENDING,
        },
      });

      await tx.matchmakingProposalParticipant.createMany({
        data: tickets.map((ticket) => ({
          proposalId: created.id,
          userId: ticket.userId,
          ticketId: ticket.id,
          team: teamAssignments.get(ticket.userId) ?? Team.UNKNOWN,
          status: MatchmakingProposalParticipantStatus.PENDING,
        })),
      });

      await tx.matchmakingTicket.updateMany({
        where: { id: { in: tickets.map((item) => item.id) } },
        data: { status: MatchmakingTicketStatus.MATCHED },
      });

      return created;
    });

    await this.notificationsService.createManyNotifications(
      tickets.map((ticket) => ({
        userId: ticket.userId,
        type: NotificationType.AUTO_MATCH_FOUND,
        title: 'Auto match found',
        body: `A proposal is ready for ${ticket.sport.name}. Accept or decline now.`,
        data: {
          proposalId: proposal.id,
          sportId: ticket.sportId,
          dedupeKey: `auto-match-found:${proposal.id}:${ticket.userId}`,
        },
      })),
    );

    return this.getProposalById(proposal.id);
  }

  private async getProposalById(proposalId: string) {
    return this.prisma.matchmakingProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        sport: true,
        venue: true,
        confirmedMatch: true,
        participants: {
          include: {
            user: { select: { id: true, displayName: true } },
            ticket: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private async assignTeams(tickets: TicketWithUser[], format: SportFormat): Promise<Map<string, Team>> {
    if (format === SportFormat.SINGLES) {
      return new Map<string, Team>([
        [tickets[0].userId, Team.A],
        [tickets[1].userId, Team.B],
      ]);
    }

    const withRatings = await Promise.all(
      tickets.map(async (ticket) => ({
        ticket,
        rating: await this.getTicketRating(ticket.userId, ticket.sportId, ticket.format),
      })),
    );

    withRatings.sort((a, b) => b.rating - a.rating);
    // Simple balancing: A gets highest+lowest, B gets middle pair.
    return new Map<string, Team>([
      [withRatings[0].ticket.userId, Team.A],
      [withRatings[3].ticket.userId, Team.A],
      [withRatings[1].ticket.userId, Team.B],
      [withRatings[2].ticket.userId, Team.B],
    ]);
  }

  private async pickVenue(tickets: TicketWithUser[]): Promise<string | null> {
    const allSamePreferred = tickets.every(
      (ticket) => ticket.preferredVenueId && ticket.preferredVenueId === tickets[0].preferredVenueId,
    );
    if (allSamePreferred && tickets[0].preferredVenueId) {
      return tickets[0].preferredVenueId;
    }
    if (tickets[0].preferredVenueId) {
      return tickets[0].preferredVenueId;
    }

    // Nearest venue to average location fallback.
    const withLocation = tickets.filter((ticket) => ticket.latitude !== null && ticket.longitude !== null && ticket.latitude !== undefined && ticket.longitude !== undefined);
    if (withLocation.length === 0) {
      return null;
    }
    const avgLatitude = withLocation.reduce((sum, t) => sum + (t.latitude as number), 0) / withLocation.length;
    const avgLongitude = withLocation.reduce((sum, t) => sum + (t.longitude as number), 0) / withLocation.length;
    const venue = await this.prisma.venue.findFirst({
      where: { latitude: { not: null }, longitude: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    if (!venue || venue.latitude === null || venue.longitude === null) {
      return null;
    }
    // Keep simple MVP: choose first venue if no direct nearest query helper.
    void avgLatitude;
    void avgLongitude;
    return venue.id;
  }

  private pickOverlappingStart(tickets: TicketWithUser[]): Date {
    const earliest = new Date(Math.max(...tickets.map((ticket) => ticket.earliestStart.getTime())));
    return earliest;
  }

  private isCompatiblePair(
    a: TicketWithUser,
    b: TicketWithUser,
    aRating: number,
    bRating: number,
    aReliability: number,
    bReliability: number,
    eloTolerance: number,
    expandedRadiusKm: number,
  ): boolean {
    if (a.userId === b.userId) {
      return false;
    }

    if (aReliability < 50 || bReliability < 50) {
      return false;
    }

    const overlapStart = Math.max(a.earliestStart.getTime(), b.earliestStart.getTime());
    const overlapEnd = Math.min(a.latestEnd.getTime(), b.latestEnd.getTime());
    if (overlapEnd <= overlapStart) {
      return false;
    }

    if (!this.isEloCompatible(a, b, aRating, bRating, eloTolerance)) {
      return false;
    }

    return this.isDistanceCompatible(a, b, expandedRadiusKm);
  }

  private isDistanceCompatible(a: TicketWithUser, b: TicketWithUser, expandedRadiusKm: number): boolean {
    if (
      a.latitude === null || a.latitude === undefined || a.longitude === null || a.longitude === undefined ||
      b.latitude === null || b.latitude === undefined || b.longitude === null || b.longitude === undefined
    ) {
      return true;
    }

    const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
    const aRadius = a.radiusKm || expandedRadiusKm;
    const bRadius = b.radiusKm || expandedRadiusKm;
    return distanceKm <= Math.min(aRadius * 2, expandedRadiusKm * 2) && distanceKm <= Math.min(bRadius * 2, expandedRadiusKm * 2);
  }

  private isEloCompatible(
    a: TicketWithUser,
    b: TicketWithUser,
    aRating: number,
    bRating: number,
    eloTolerance: number,
  ): boolean {
    const absGap = Math.abs(aRating - bRating);
    if (absGap > eloTolerance) {
      return false;
    }

    const aMin = a.minElo ?? Number.NEGATIVE_INFINITY;
    const aMax = a.maxElo ?? Number.POSITIVE_INFINITY;
    const bMin = b.minElo ?? Number.NEGATIVE_INFINITY;
    const bMax = b.maxElo ?? Number.POSITIVE_INFINITY;

    return aRating >= bMin && aRating <= bMax && bRating >= aMin && bRating <= aMax;
  }

  private calculateAvailabilityOverlapScore(a: TicketWithUser, b: TicketWithUser): number {
    const overlapStart = Math.max(a.earliestStart.getTime(), b.earliestStart.getTime());
    const overlapEnd = Math.min(a.latestEnd.getTime(), b.latestEnd.getTime());
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    const referenceMs = Math.min(
      a.latestEnd.getTime() - a.earliestStart.getTime(),
      b.latestEnd.getTime() - b.earliestStart.getTime(),
    );
    if (referenceMs <= 0) {
      return 0;
    }
    return Number(Math.min(100, (overlapMs / referenceMs) * 100).toFixed(2));
  }

  private calculateDistanceScore(a: TicketWithUser, b: TicketWithUser, expandedRadiusKm: number): number {
    if (
      a.latitude === null || a.latitude === undefined || a.longitude === null || a.longitude === undefined ||
      b.latitude === null || b.latitude === undefined || b.longitude === null || b.longitude === undefined
    ) {
      return 50;
    }
    const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
    const score = 100 * (1 - distanceKm / Math.max(expandedRadiusKm, 0.1));
    return Number(Math.max(0, Math.min(100, score)).toFixed(2));
  }

  private calculateEloScore(myRating: number, candidateRating: number, tolerance: number): number {
    const gap = Math.abs(myRating - candidateRating);
    const score = 100 * (1 - gap / Math.max(tolerance, 1));
    return Number(Math.max(0, Math.min(100, score)).toFixed(2));
  }

  private calculatePreferenceCompatibilityScore(
    myTicket: TicketWithUser,
    candidateTicket: TicketWithUser,
    myPreferences: {
      sportPreferences: Array<{ sportId: string; prefersSingles: boolean; prefersDoubles: boolean }>;
      preferredVenues: Array<{ venueId: string }>;
      availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
      hasPreferences: boolean;
    },
  ): number {
    if (!myPreferences.hasPreferences) {
      return 50;
    }

    let score = 40;
    const sportPreference = myPreferences.sportPreferences.find((item) => item.sportId === myTicket.sportId);
    if (sportPreference) {
      score += 30;
      const formatMatches =
        (myTicket.format === SportFormat.SINGLES && sportPreference.prefersSingles) ||
        (myTicket.format === SportFormat.DOUBLES && sportPreference.prefersDoubles);
      if (formatMatches) {
        score += 15;
      }
    }

    if (candidateTicket.preferredVenueId && myPreferences.preferredVenues.some((v) => v.venueId === candidateTicket.preferredVenueId)) {
      score += 10;
    }

    const day = myTicket.earliestStart.getDay();
    const minutes = myTicket.earliestStart.getHours() * 60 + myTicket.earliestStart.getMinutes();
    const hasAvail = myPreferences.availability.some((slot) => {
      if (slot.dayOfWeek !== day) {
        return false;
      }
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      return minutes >= start && minutes < end;
    });
    if (hasAvail) {
      score += 5;
    }

    return Math.min(100, score);
  }

  private getExpansion(createdAt: Date, radiusKm: number) {
    const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
    if (ageMinutes < 5) {
      return { eloTolerance: 100, radiusKm };
    }
    if (ageMinutes <= 10) {
      return { eloTolerance: 200, radiusKm: radiusKm * 1.5 };
    }
    return { eloTolerance: 300, radiusKm: radiusKm * 2 };
  }

  private async getTicketRating(userId: string, sportId: string, format: SportFormat): Promise<number> {
    const ratings = await this.ratingsService.listUserRatings(userId);
    const target = ratings.find((item) => item.sportId === sportId && item.format === format);
    return target?.rating ?? 1200;
  }

  private async getUserReliability(userId: string): Promise<number> {
    const stats = await this.reliabilityService.toSummaryByUserId(userId);
    return stats.reliabilityScore;
  }

  private async validateTicketPayload(dto: CreateMatchmakingTicketDto) {
    const earliestStart = new Date(dto.earliestStart);
    const latestEnd = new Date(dto.latestEnd);

    if (Number.isNaN(earliestStart.getTime()) || Number.isNaN(latestEnd.getTime())) {
      throw new BadRequestException('Invalid earliestStart/latestEnd');
    }
    if (earliestStart >= latestEnd) {
      throw new BadRequestException('earliestStart must be before latestEnd');
    }
    if (earliestStart.getTime() <= Date.now()) {
      throw new BadRequestException('earliestStart must be in the future');
    }
    if (dto.minElo !== undefined && dto.maxElo !== undefined && dto.minElo > dto.maxElo) {
      throw new BadRequestException('minElo must be less than or equal to maxElo');
    }
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException('latitude and longitude must be provided together');
    }

    const sport = await this.prisma.sport.findUnique({ where: { id: dto.sportId }, select: { id: true } });
    if (!sport) {
      throw new BadRequestException('sportId is invalid');
    }

    if (dto.preferredVenueId) {
      const venue = await this.prisma.venue.findUnique({ where: { id: dto.preferredVenueId }, select: { id: true } });
      if (!venue) {
        throw new BadRequestException('preferredVenueId is invalid');
      }
    }
  }
}
