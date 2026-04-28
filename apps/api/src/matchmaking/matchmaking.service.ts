import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MatchParticipantStatus,
  MatchStatus,
  MatchmakingLocationProposalStatus,
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
import { ProposeLocationDto } from './dto.propose-location';

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
        where: { userId, sportId: dto.sportId, format: dto.format, status: MatchmakingTicketStatus.SEARCHING },
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
      where: { userId, status: MatchmakingTicketStatus.SEARCHING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, displayName: true } }, preferredVenue: { select: { id: true, name: true, latitude: true, longitude: true } }, sport: { select: { id: true, name: true } } },
    });
    if (!myTicket) throw new NotFoundException('No active matchmaking ticket found. Create a ticket first.');

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
      include: { user: { select: { id: true, displayName: true } }, preferredVenue: { select: { id: true, name: true, latitude: true, longitude: true } }, sport: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const myRating = await this.getTicketRating(myTicket.userId, myTicket.sportId, myTicket.format);
    const myReliability = await this.getUserReliability(myTicket.userId);
    const myPreferences = await this.preferencesService.getRankingPreferences(myTicket.userId);
    const scoredCandidates: Array<{ ticket: TicketWithUser; score: number }> = [];

    for (const candidate of candidateTickets) {
      const candidateRating = await this.getTicketRating(candidate.userId, candidate.sportId, candidate.format);
      const candidateReliability = await this.getUserReliability(candidate.userId);
      if (!this.isCompatiblePair(myTicket, candidate, myRating, candidateRating, myReliability, candidateReliability, expansion.eloTolerance, expansion.radiusKm)) continue;

      const availabilityScore = this.calculateAvailabilityOverlapScore(myTicket, candidate);
      const distanceScore = this.calculateDistanceScore(myTicket, candidate, expansion.radiusKm);
      const eloScore = this.calculateEloScore(myRating, candidateRating, expansion.eloTolerance);
      const reliabilityScore = (myReliability + candidateReliability) / 2;
      const preferenceScore = this.calculatePreferenceCompatibilityScore(myTicket, candidate, myPreferences);
      const score = eloScore * 0.35 + distanceScore * 0.25 + availabilityScore * 0.2 + reliabilityScore * 0.15 + preferenceScore * 0.05;
      scoredCandidates.push({ ticket: candidate, score: Number(score.toFixed(2)) });
    }

    if (myTicket.format === SportFormat.SINGLES && scoredCandidates.length === 0) return this.noMatch(expansion);
    if (myTicket.format === SportFormat.DOUBLES && scoredCandidates.length < 3) return this.noMatch(expansion);

    scoredCandidates.sort((a, b) => b.score - a.score || a.ticket.createdAt.getTime() - b.ticket.createdAt.getTime());
    const tickets = myTicket.format === SportFormat.SINGLES
      ? [myTicket, scoredCandidates[0].ticket]
      : [myTicket, ...scoredCandidates.slice(0, 3).map((i) => i.ticket)];

    const proposal = await this.createProposal(tickets, myTicket.format);
    return { found: true, proposal };
  }

  getMyTickets(userId: string, limit = 20) {
    return this.prisma.matchmakingTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit, include: { sport: true, preferredVenue: true } });
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
        participants: { include: { user: { select: { id: true, displayName: true, reliabilityStats: { select: { reliabilityScore: true } } } } }, orderBy: { createdAt: 'asc' } },
        locationProposals: { orderBy: { createdAt: 'desc' }, take: 1, include: { responses: true } },
      },
    }).then((proposals) => proposals.map((proposal) => this.mapProposalForResponse(proposal)));
  }

  async acceptProposal(userId: string, proposalId: string) {
    const participant = await this.assertProposalParticipant(userId, proposalId);
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');

    await this.prisma.matchmakingProposalParticipant.update({ where: { id: participant.id }, data: { status: MatchmakingProposalParticipantStatus.ACCEPTED, respondedAt: new Date() } });
    return this.getProposalById(proposalId);
  }

  async declineProposal(userId: string, proposalId: string) {
    return this.cancelProposal(userId, proposalId, 'Declined by participant');
  }

  async cancelProposal(userId: string, proposalId: string, reason?: string) {
    const participant = await this.assertProposalParticipant(userId, proposalId);
    if (participant.proposal.status === MatchmakingProposalStatus.CONFIRMED) throw new BadRequestException('Confirmed proposal cannot be cancelled');
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');

    await this.prisma.matchmakingProposal.update({ where: { id: proposalId }, data: { status: MatchmakingProposalStatus.CANCELLED } });
    const proposal = await this.getProposalById(proposalId);
    await this.notificationsService.createManyNotifications(proposal.participants.filter((p) => p.userId !== userId).map((p) => ({
      userId: p.userId,
      type: NotificationType.AUTO_MATCH_CANCELLED,
      title: 'Auto match cancelled',
      body: reason ? `Proposal cancelled: ${reason}` : 'An auto matchmaking proposal was cancelled.',
      data: { proposalId, dedupeKey: `auto-match-cancelled:${proposalId}:${p.userId}` },
    })));
    return proposal;
  }

  async getProposalMessages(userId: string, proposalId: string, limit = 50) {
    await this.assertProposalParticipant(userId, proposalId);
    return this.prisma.matchmakingProposalMessage.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { sender: { select: { id: true, displayName: true } } },
    });
  }

  async sendProposalMessage(userId: string, proposalId: string, body: string) {
    const participant = await this.assertProposalParticipant(userId, proposalId);
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Message body is required');
    if (trimmed.length > 1000) throw new BadRequestException('Message must be at most 1000 characters');

    const message = await this.prisma.matchmakingProposalMessage.create({
      data: { proposalId, senderUserId: userId, body: trimmed },
      include: { sender: { select: { id: true, displayName: true } } },
    });

    await this.notificationsService.createManyNotifications(participant.proposal.participants.filter((p) => p.userId !== userId).map((p) => ({
      userId: p.userId,
      type: NotificationType.CHAT_MESSAGE,
      title: 'New proposal message',
      body: `${participant.user.displayName}: ${trimmed.slice(0, 80)}`,
      data: { proposalId, dedupeKey: `proposal-chat:${proposalId}:${message.id}:${p.userId}` },
    })));

    return message;
  }

  async getLocationProposals(userId: string, proposalId: string) {
    await this.assertProposalParticipant(userId, proposalId);
    return this.prisma.matchmakingLocationProposal.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
      include: { responses: { orderBy: { createdAt: 'asc' } }, proposedByUser: { select: { id: true, displayName: true } } },
    });
  }

  async proposeLocation(userId: string, proposalId: string, dto: ProposeLocationDto) {
    const participant = await this.assertProposalParticipant(userId, proposalId);
    if (participant.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');
    if (!Number.isFinite(dto.latitude) || !Number.isFinite(dto.longitude)) {
      throw new BadRequestException('Please provide latitude and longitude. Google Maps link parsing is coming later.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.matchmakingLocationProposal.create({
        data: {
          proposalId,
          proposedByUserId: userId,
          locationName: dto.locationName,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          googleMapsUrl: dto.googleMapsUrl,
          googlePlaceId: dto.googlePlaceId,
          status: MatchmakingLocationProposalStatus.PENDING,
        },
      });

      await tx.matchmakingLocationProposalResponse.createMany({
        data: participant.proposal.participants.map((p) => ({
          locationProposalId: proposal.id,
          userId: p.userId,
          status: p.userId === userId ? MatchmakingProposalParticipantStatus.ACCEPTED : MatchmakingProposalParticipantStatus.PENDING,
          respondedAt: p.userId === userId ? new Date() : null,
        })),
      });

      return proposal;
    });

    await this.notificationsService.createManyNotifications(participant.proposal.participants.filter((p) => p.userId !== userId).map((p) => ({
      userId: p.userId,
      type: NotificationType.AUTO_MATCH_LOCATION_PROPOSED,
      title: 'Location proposed',
      body: `${participant.user.displayName} proposed ${dto.locationName}`,
      data: { proposalId, locationProposalId: created.id, dedupeKey: `location-proposed:${created.id}:${p.userId}` },
    })));

    return this.getLocationProposalById(created.id);
  }

  async acceptLocationProposal(userId: string, locationProposalId: string) {
    const locationProposal = await this.getLocationProposalById(locationProposalId);
    const proposal = await this.assertProposalParticipant(userId, locationProposal.proposalId);
    if (proposal.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');
    if (locationProposal.status !== MatchmakingLocationProposalStatus.PENDING) throw new BadRequestException('Location proposal is not pending');

    await this.prisma.matchmakingLocationProposalResponse.update({
      where: { locationProposalId_userId: { locationProposalId, userId } },
      data: { status: MatchmakingProposalParticipantStatus.ACCEPTED, respondedAt: new Date() },
    });

    const refreshed = await this.getLocationProposalById(locationProposalId);
    const everyoneAccepted = refreshed.responses.every((r) => r.status === MatchmakingProposalParticipantStatus.ACCEPTED);
    if (!everyoneAccepted) return refreshed;

    const createdMatch = await this.confirmLocationAndCreateMatch(refreshed);
    await this.notificationsService.createManyNotifications(
      proposal.proposal.participants.map((p) => ({
        userId: p.userId,
        type: NotificationType.AUTO_MATCH_LOCATION_ACCEPTED,
        title: 'Location accepted',
        body: `${refreshed.locationName} was accepted by all participants.`,
        data: { proposalId: refreshed.proposalId, locationProposalId, matchId: createdMatch.id, dedupeKey: `location-accepted:${locationProposalId}:${p.userId}` },
      })),
    );

    return this.getLocationProposalById(locationProposalId);
  }

  async declineLocationProposal(userId: string, locationProposalId: string) {
    const locationProposal = await this.getLocationProposalById(locationProposalId);
    const proposal = await this.assertProposalParticipant(userId, locationProposal.proposalId);
    if (proposal.proposal.status !== MatchmakingProposalStatus.PENDING) throw new BadRequestException('Proposal is not pending');
    if (locationProposal.status !== MatchmakingLocationProposalStatus.PENDING) throw new BadRequestException('Location proposal is not pending');

    await this.prisma.$transaction(async (tx) => {
      await tx.matchmakingLocationProposalResponse.update({
        where: { locationProposalId_userId: { locationProposalId, userId } },
        data: { status: MatchmakingProposalParticipantStatus.DECLINED, respondedAt: new Date() },
      });
      await tx.matchmakingLocationProposal.update({ where: { id: locationProposalId }, data: { status: MatchmakingLocationProposalStatus.DECLINED } });
    });

    await this.notificationsService.createManyNotifications(
      proposal.proposal.participants.map((p) => ({
        userId: p.userId,
        type: NotificationType.AUTO_MATCH_LOCATION_DECLINED,
        title: 'Location declined',
        body: 'A proposed location was declined. Propose another location.',
        data: { proposalId: locationProposal.proposalId, locationProposalId, dedupeKey: `location-declined:${locationProposalId}:${p.userId}` },
      })),
    );

    return this.getLocationProposalById(locationProposalId);
  }

  private async confirmLocationAndCreateMatch(locationProposal: Prisma.MatchmakingLocationProposalGetPayload<{ include: { proposal: { include: { participants: true; sport: true } }; responses: true } }>) {
    const latestProposal = await this.prisma.matchmakingProposal.findUniqueOrThrow({
      where: { id: locationProposal.proposalId },
      include: { participants: true, sport: true },
    });
    if (latestProposal.status === MatchmakingProposalStatus.CONFIRMED && latestProposal.confirmedMatchId) {
      return this.prisma.match.findUniqueOrThrow({ where: { id: latestProposal.confirmedMatchId } });
    }
    if (latestProposal.status !== MatchmakingProposalStatus.PENDING) {
      throw new BadRequestException('Proposal is no longer pending');
    }
    const proposal = latestProposal;
    let venueId = proposal.venueId;

    if (!venueId) {
      if (locationProposal.googlePlaceId) {
        const existing = await this.prisma.venue.findFirst({ where: { googlePlaceId: locationProposal.googlePlaceId } });
        if (existing) venueId = existing.id;
      }
      if (!venueId) {
        const createdVenue = await this.prisma.venue.create({
          data: {
            name: locationProposal.locationName,
            address: locationProposal.address ?? locationProposal.locationName,
            latitude: locationProposal.latitude,
            longitude: locationProposal.longitude,
            googleMapsUrl: locationProposal.googleMapsUrl,
            googlePlaceId: locationProposal.googlePlaceId,
          },
        });
        venueId = createdVenue.id;
      }
    }

    const maxPlayers = proposal.format === SportFormat.SINGLES ? 2 : 4;
    const createdMatch = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          sportId: proposal.sportId,
          venueId,
          createdByUserId: proposal.participants[0].userId,
          title: `Auto match - ${proposal.sport.name} ${proposal.format.toLowerCase()}`,
          description: 'Created by auto matchmaking negotiation',
          format: proposal.format,
          status: MatchStatus.FULL,
          startsAt: proposal.proposedStartTime,
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

      const claim = await tx.matchmakingProposal.updateMany({
        where: { id: proposal.id, status: MatchmakingProposalStatus.PENDING, confirmedMatchId: null },
        data: { status: MatchmakingProposalStatus.CONFIRMED, confirmedMatchId: match.id, venueId },
      });

      if (claim.count === 0) {
        await tx.matchParticipant.deleteMany({ where: { matchId: match.id } });
        await tx.match.delete({ where: { id: match.id } });
        const existingProposal = await tx.matchmakingProposal.findUniqueOrThrow({ where: { id: proposal.id } });
        if (!existingProposal.confirmedMatchId) {
          throw new BadRequestException('Proposal already finalized');
        }
        return tx.match.findUniqueOrThrow({ where: { id: existingProposal.confirmedMatchId } });
      }

      await tx.matchmakingLocationProposal.update({ where: { id: locationProposal.id }, data: { status: MatchmakingLocationProposalStatus.ACCEPTED, acceptedAt: new Date() } });
      return match;
    });

    await this.notificationsService.createManyNotifications(
      proposal.participants.map((participant) => ({
        userId: participant.userId,
        type: NotificationType.AUTO_MATCH_CONFIRMED,
        title: 'Auto match confirmed',
        body: 'Your match is confirmed after location acceptance.',
        data: { proposalId: proposal.id, matchId: createdMatch.id, locationProposalId: locationProposal.id, dedupeKey: `auto-match-confirmed:${proposal.id}:${participant.userId}` },
      })),
    );

    return createdMatch;
  }

  private noMatch(expansion: { eloTolerance: number; radiusKm: number }) {
    return {
      found: false,
      message: 'No match found yet. Try widening your radius or time window.',
      suggestions: { eloTolerance: expansion.eloTolerance, suggestedRadiusKm: Number(expansion.radiusKm.toFixed(2)) },
    };
  }

  private async createProposal(tickets: TicketWithUser[], format: SportFormat) {
    const proposedStartTime = this.pickOverlappingStart(tickets);
    const venueId = await this.pickVenue(tickets);
    const teamAssignments = await this.assignTeams(tickets, format);

    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.matchmakingProposal.create({
        data: { sportId: tickets[0].sportId, format, venueId, proposedStartTime, status: MatchmakingProposalStatus.PENDING },
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
      await tx.matchmakingTicket.updateMany({ where: { id: { in: tickets.map((i) => i.id) } }, data: { status: MatchmakingTicketStatus.MATCHED } });
      return created;
    });

    await this.notificationsService.createManyNotifications(tickets.map((ticket) => ({
      userId: ticket.userId,
      type: NotificationType.AUTO_MATCH_FOUND,
      title: 'Auto match found',
      body: `Auto match found. Chat and choose a location for ${ticket.sport.name}.`,
      data: { proposalId: proposal.id, sportId: ticket.sportId, dedupeKey: `auto-match-found:${proposal.id}:${ticket.userId}` },
    })));

    return this.getProposalById(proposal.id);
  }

  private async getProposalById(proposalId: string) {
    return this.prisma.matchmakingProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        sport: true,
        venue: true,
        confirmedMatch: true,
        participants: { include: { user: { select: { id: true, displayName: true, reliabilityStats: { select: { reliabilityScore: true } } } }, ticket: true }, orderBy: { createdAt: 'asc' } },
        locationProposals: { include: { responses: true }, orderBy: { createdAt: 'desc' } },
      },
    }).then((proposal) => this.mapProposalForResponse(proposal));
  }

  private async getLocationProposalById(locationProposalId: string) {
    return this.prisma.matchmakingLocationProposal.findUniqueOrThrow({
      where: { id: locationProposalId },
      include: {
        proposal: { include: { participants: true, sport: true } },
        proposedByUser: { select: { id: true, displayName: true } },
        responses: true,
      },
    });
  }

  private async assertProposalParticipant(userId: string, proposalId: string) {
    const participant = await this.prisma.matchmakingProposalParticipant.findFirst({
      where: { proposalId, userId },
      include: { proposal: { include: { participants: true } }, user: { select: { id: true, displayName: true } } },
    });
    if (!participant) throw new ForbiddenException('Only proposal participants can access this proposal');
    return participant;
  }

  private async assignTeams(tickets: TicketWithUser[], format: SportFormat): Promise<Map<string, Team>> {
    if (format === SportFormat.SINGLES) return new Map([[tickets[0].userId, Team.A], [tickets[1].userId, Team.B]]);
    const withRatings = await Promise.all(tickets.map(async (ticket) => ({ ticket, rating: await this.getTicketRating(ticket.userId, ticket.sportId, ticket.format) })));
    withRatings.sort((a, b) => b.rating - a.rating);
    return new Map([[withRatings[0].ticket.userId, Team.A], [withRatings[3].ticket.userId, Team.A], [withRatings[1].ticket.userId, Team.B], [withRatings[2].ticket.userId, Team.B]]);
  }

  private async pickVenue(tickets: TicketWithUser[]): Promise<string | null> {
    const allSamePreferred = tickets.every((t) => t.preferredVenueId && t.preferredVenueId === tickets[0].preferredVenueId);
    if (allSamePreferred && tickets[0].preferredVenueId) return tickets[0].preferredVenueId;
    if (tickets[0].preferredVenueId) return tickets[0].preferredVenueId;
    return null;
  }

  private pickOverlappingStart(tickets: TicketWithUser[]): Date {
    return new Date(Math.max(...tickets.map((ticket) => ticket.earliestStart.getTime())));
  }

  private isCompatiblePair(a: TicketWithUser, b: TicketWithUser, aRating: number, bRating: number, aReliability: number, bReliability: number, eloTolerance: number, expandedRadiusKm: number): boolean {
    if (a.userId === b.userId) return false;
    if (aReliability < 50 || bReliability < 50) return false;
    const overlapStart = Math.max(a.earliestStart.getTime(), b.earliestStart.getTime());
    const overlapEnd = Math.min(a.latestEnd.getTime(), b.latestEnd.getTime());
    if (overlapEnd <= overlapStart) return false;
    if (!this.isEloCompatible(a, b, aRating, bRating, eloTolerance)) return false;
    return this.isDistanceCompatible(a, b, expandedRadiusKm);
  }

  private isDistanceCompatible(a: TicketWithUser, b: TicketWithUser, expandedRadiusKm: number): boolean {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return true;
    const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
    const aRadius = a.radiusKm || expandedRadiusKm;
    const bRadius = b.radiusKm || expandedRadiusKm;
    return distanceKm <= Math.min(aRadius * 2, expandedRadiusKm * 2) && distanceKm <= Math.min(bRadius * 2, expandedRadiusKm * 2);
  }

  private isEloCompatible(a: TicketWithUser, b: TicketWithUser, aRating: number, bRating: number, eloTolerance: number): boolean {
    if (Math.abs(aRating - bRating) > eloTolerance) return false;
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
    const referenceMs = Math.min(a.latestEnd.getTime() - a.earliestStart.getTime(), b.latestEnd.getTime() - b.earliestStart.getTime());
    if (referenceMs <= 0) return 0;
    return Number(Math.min(100, (overlapMs / referenceMs) * 100).toFixed(2));
  }

  private calculateDistanceScore(a: TicketWithUser, b: TicketWithUser, expandedRadiusKm: number): number {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return 50;
    const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
    const score = 100 * (1 - distanceKm / Math.max(expandedRadiusKm, 0.1));
    return Number(Math.max(0, Math.min(100, score)).toFixed(2));
  }

  private calculateEloScore(myRating: number, candidateRating: number, tolerance: number): number {
    const gap = Math.abs(myRating - candidateRating);
    return Number(Math.max(0, Math.min(100, 100 * (1 - gap / Math.max(tolerance, 1)))).toFixed(2));
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
    if (!myPreferences.hasPreferences) return 50;
    let score = 40;
    const sportPreference = myPreferences.sportPreferences.find((i) => i.sportId === myTicket.sportId);
    if (sportPreference) {
      score += 30;
      const formatMatches = (myTicket.format === SportFormat.SINGLES && sportPreference.prefersSingles) || (myTicket.format === SportFormat.DOUBLES && sportPreference.prefersDoubles);
      if (formatMatches) score += 15;
    }
    if (candidateTicket.preferredVenueId && myPreferences.preferredVenues.some((v) => v.venueId === candidateTicket.preferredVenueId)) score += 10;
    const day = myTicket.earliestStart.getDay();
    const minutes = myTicket.earliestStart.getHours() * 60 + myTicket.earliestStart.getMinutes();
    const hasAvail = myPreferences.availability.some((slot) => {
      if (slot.dayOfWeek !== day) return false;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      return minutes >= sh * 60 + sm && minutes < eh * 60 + em;
    });
    if (hasAvail) score += 5;
    return Math.min(100, score);
  }

  private getExpansion(createdAt: Date, radiusKm: number) {
    const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
    if (ageMinutes < 5) return { eloTolerance: 100, radiusKm };
    if (ageMinutes <= 10) return { eloTolerance: 200, radiusKm: radiusKm * 1.5 };
    return { eloTolerance: 300, radiusKm: radiusKm * 2 };
  }

  private async getTicketRating(userId: string, sportId: string, format: SportFormat): Promise<number> {
    const ratings = await this.ratingsService.listUserRatings(userId);
    return ratings.find((r) => r.sportId === sportId && r.format === format)?.rating ?? 1200;
  }

  private async getUserReliability(userId: string): Promise<number> {
    return (await this.reliabilityService.toSummaryByUserId(userId)).reliabilityScore;
  }

  private async validateTicketPayload(dto: CreateMatchmakingTicketDto) {
    const earliestStart = new Date(dto.earliestStart);
    const latestEnd = new Date(dto.latestEnd);
    if (Number.isNaN(earliestStart.getTime()) || Number.isNaN(latestEnd.getTime())) throw new BadRequestException('Invalid earliestStart/latestEnd');
    if (earliestStart >= latestEnd) throw new BadRequestException('earliestStart must be before latestEnd');
    if (earliestStart.getTime() <= Date.now()) throw new BadRequestException('earliestStart must be in the future');
    if (dto.minElo !== undefined && dto.maxElo !== undefined && dto.minElo > dto.maxElo) throw new BadRequestException('minElo must be less than or equal to maxElo');
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) throw new BadRequestException('latitude and longitude must be provided together');
    if (!(await this.prisma.sport.findUnique({ where: { id: dto.sportId }, select: { id: true } }))) throw new BadRequestException('sportId is invalid');
    if (dto.preferredVenueId && !(await this.prisma.venue.findUnique({ where: { id: dto.preferredVenueId }, select: { id: true } }))) throw new BadRequestException('preferredVenueId is invalid');
  }

  private mapProposalForResponse<T extends {
    participants?: Array<{
      user?: { id: string; displayName: string; reliabilityStats?: { reliabilityScore: number } | null };
      [k: string]: unknown;
    }>;
    [k: string]: unknown;
  }>(proposal: T): T {
    if (!proposal.participants) {
      return proposal;
    }
    return {
      ...proposal,
      participants: proposal.participants.map((participant) => {
        const user = participant.user;
        return {
          ...participant,
          user: user
            ? {
                id: user.id,
                displayName: user.displayName,
                reliabilityScore: user.reliabilityStats?.reliabilityScore ?? 100,
              }
            : undefined,
        };
      }),
    } as T;
  }
}
