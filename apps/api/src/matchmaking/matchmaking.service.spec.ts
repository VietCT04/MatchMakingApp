import { BadRequestException } from '@nestjs/common';
import { MatchmakingProposalStatus, NotificationType, SportFormat } from '@prisma/client';
import { SportFormat as SharedSportFormat } from '@sports-matchmaking/shared';
import { MatchmakingService } from './matchmaking.service';

describe('MatchmakingService', () => {
  function createService(overrides?: Record<string, any>) {
    const prisma: any = {
      sport: { findUnique: jest.fn().mockResolvedValue({ id: 'sport-1' }) },
      venue: { findUnique: jest.fn().mockResolvedValue({ id: 'venue-1' }), findFirst: jest.fn().mockResolvedValue({ id: 'venue-1', latitude: 1.3, longitude: 103.8 }) },
      matchmakingTicket: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matchmakingProposal: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matchmakingProposalParticipant: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      match: { create: jest.fn() },
      matchParticipant: { createMany: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
      ...overrides,
    };

    const ratingsService = { listUserRatings: jest.fn().mockResolvedValue([]) };
    const reliabilityService = { toSummaryByUserId: jest.fn().mockResolvedValue({ reliabilityScore: 90 }) };
    const preferencesService = { getRankingPreferences: jest.fn().mockResolvedValue({ sportPreferences: [], preferredVenues: [], availability: [], hasPreferences: false }) };
    const notificationsService = { createManyNotifications: jest.fn().mockResolvedValue([]) };

    return {
      prisma,
      ratingsService,
      reliabilityService,
      preferencesService,
      notificationsService,
      service: new MatchmakingService(prisma, ratingsService as any, reliabilityService as any, preferencesService as any, notificationsService as any),
    };
  }

  it('creates ticket and cancels previous searching ticket for same sport/format', async () => {
    const { service, prisma } = createService();

    await service.createOrReplaceTicket('user-1', {
      sportId: 'sport-1',
      format: SharedSportFormat.SINGLES,
      radiusKm: 5,
      earliestStart: new Date(Date.now() + 3600_000).toISOString(),
      latestEnd: new Date(Date.now() + 7200_000).toISOString(),
      preferredVenueId: 'venue-1',
    });

    expect(prisma.matchmakingTicket.updateMany).toHaveBeenCalled();
    expect(prisma.matchmakingTicket.create).toHaveBeenCalled();
  });

  it('rejects invalid time window', async () => {
    const { service } = createService();

    await expect(
      service.createOrReplaceTicket('user-1', {
        sportId: 'sport-1',
        format: SharedSportFormat.SINGLES,
        radiusKm: 5,
        earliestStart: new Date(Date.now() + 7200_000).toISOString(),
        latestEnd: new Date(Date.now() + 3600_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates singles proposal when compatible ticket exists', async () => {
    const { service, prisma } = createService();

    prisma.matchmakingTicket.findFirst.mockResolvedValue({
      id: 'ticket-a',
      userId: 'user-a',
      sportId: 'sport-1',
      format: SportFormat.SINGLES,
      latitude: 1.3,
      longitude: 103.8,
      radiusKm: 5,
      earliestStart: new Date(Date.now() + 3600_000),
      latestEnd: new Date(Date.now() + 7200_000),
      preferredVenueId: 'venue-1',
      minElo: 1000,
      maxElo: 1600,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      user: { id: 'user-a', displayName: 'A' },
      preferredVenue: { id: 'venue-1', name: 'V', latitude: 1.3, longitude: 103.8 },
      sport: { id: 'sport-1', name: 'Badminton' },
    });

    prisma.matchmakingTicket.findMany.mockResolvedValue([
      {
        id: 'ticket-b',
        userId: 'user-b',
        sportId: 'sport-1',
        format: SportFormat.SINGLES,
        latitude: 1.3005,
        longitude: 103.8005,
        radiusKm: 5,
        earliestStart: new Date(Date.now() + 3700_000),
        latestEnd: new Date(Date.now() + 7600_000),
        preferredVenueId: 'venue-1',
        minElo: 900,
        maxElo: 1700,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        user: { id: 'user-b', displayName: 'B' },
        preferredVenue: { id: 'venue-1', name: 'V', latitude: 1.3, longitude: 103.8 },
        sport: { id: 'sport-1', name: 'Badminton' },
      },
    ]);

    prisma.matchmakingProposal.create.mockResolvedValue({ id: 'proposal-1' });
    prisma.matchmakingProposal.findUniqueOrThrow.mockResolvedValue({
      id: 'proposal-1',
      status: MatchmakingProposalStatus.PENDING,
      participants: [],
      sport: { id: 'sport-1', name: 'Badminton' },
      venue: null,
      confirmedMatch: null,
    });

    const result = await service.runSearchForUser('user-a');

    expect(result.found).toBe(true);
    expect(prisma.matchmakingProposal.create).toHaveBeenCalled();
  });

  it('returns no-match result for incompatible elo', async () => {
    const { service, prisma, ratingsService } = createService();

    prisma.matchmakingTicket.findFirst.mockResolvedValue({
      id: 'ticket-a', userId: 'user-a', sportId: 'sport-1', format: SportFormat.SINGLES,
      latitude: 1.3, longitude: 103.8, radiusKm: 5,
      earliestStart: new Date(Date.now() + 3600_000), latestEnd: new Date(Date.now() + 7200_000),
      preferredVenueId: null, minElo: 1000, maxElo: 1200,
      createdAt: new Date(), expiresAt: new Date(Date.now() + 3600_000),
      user: { id: 'user-a', displayName: 'A' }, preferredVenue: null, sport: { id: 'sport-1', name: 'Badminton' },
    });
    prisma.matchmakingTicket.findMany.mockResolvedValue([
      {
        id: 'ticket-b', userId: 'user-b', sportId: 'sport-1', format: SportFormat.SINGLES,
        latitude: 1.3, longitude: 103.8, radiusKm: 5,
        earliestStart: new Date(Date.now() + 3600_000), latestEnd: new Date(Date.now() + 7200_000),
        preferredVenueId: null, minElo: 1700, maxElo: 2000,
        createdAt: new Date(), expiresAt: new Date(Date.now() + 3600_000),
        user: { id: 'user-b', displayName: 'B' }, preferredVenue: null, sport: { id: 'sport-1', name: 'Badminton' },
      },
    ]);
    ratingsService.listUserRatings
      .mockResolvedValueOnce([{ sportId: 'sport-1', format: SportFormat.SINGLES, rating: 1100 }])
      .mockResolvedValueOnce([{ sportId: 'sport-1', format: SportFormat.SINGLES, rating: 1900 }]);

    const result = await service.runSearchForUser('user-a');

    expect(result.found).toBe(false);
  });

  it('decline proposal sets proposal declined and notifies users', async () => {
    const { service, prisma, notificationsService } = createService();

    prisma.matchmakingProposalParticipant.findFirst.mockResolvedValue({
      id: 'pp-1', proposalId: 'proposal-1', userId: 'user-a', ticketId: 'ticket-a',
      proposal: { id: 'proposal-1', status: MatchmakingProposalStatus.PENDING },
    });
    prisma.matchmakingProposalParticipant.findMany.mockResolvedValue([
      { id: 'pp-1', ticketId: 'ticket-a' },
      { id: 'pp-2', ticketId: 'ticket-b' },
    ]);
    prisma.matchmakingTicket.findUnique
      .mockResolvedValueOnce({ id: 'ticket-a', expiresAt: new Date(Date.now() + 10000) })
      .mockResolvedValueOnce({ id: 'ticket-b', expiresAt: new Date(Date.now() - 10000) });

    prisma.matchmakingProposal.findUniqueOrThrow.mockResolvedValue({
      id: 'proposal-1',
      participants: [{ userId: 'user-a' }, { userId: 'user-b' }],
    });

    await service.declineProposal('user-a', 'proposal-1');

    expect(prisma.matchmakingProposal.update).toHaveBeenCalled();
    expect(notificationsService.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: NotificationType.AUTO_MATCH_DECLINED }),
      ]),
    );
  });
});
