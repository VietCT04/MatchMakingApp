import { BadRequestException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { MatchRankingService } from './match-ranking.service';
import { MatchQueryService } from './match-query.service';

function createMatch(
  id: string,
  latitude: number | null,
  longitude: number | null,
  startsAt: string,
  options?: {
    minRating?: number | null;
    maxRating?: number | null;
    maxPlayers?: number;
    joinedParticipants?: number;
    reliabilityScores?: number[];
  },
) {
  const joinedParticipants = options?.joinedParticipants ?? 0;
  const reliabilityScores = options?.reliabilityScores ?? [];
  const participants = Array.from({ length: joinedParticipants }, (_, index) => ({
    id: `${id}-p-${index + 1}`,
    userId: `user-${index + 1}`,
    matchId: id,
    status: 'JOINED',
    team: 'UNKNOWN',
    user: {
      id: `user-${index + 1}`,
      displayName: `User ${index + 1}`,
      reliabilityStats: {
        reliabilityScore: reliabilityScores[index] ?? 100,
      },
    },
    createdAt: new Date(startsAt),
    updatedAt: new Date(startsAt),
  }));

  return {
    id,
    sportId: 'sport-1',
    venueId: 'venue-1',
    createdByUserId: 'user-1',
    title: `Match ${id}`,
    description: null,
    format: 'DOUBLES',
    status: MatchStatus.OPEN,
    startsAt: new Date(startsAt),
    maxPlayers: options?.maxPlayers ?? 4,
    minRating: options?.minRating ?? null,
    maxRating: options?.maxRating ?? null,
    createdAt: new Date(startsAt),
    updatedAt: new Date(startsAt),
    participants,
    result: null,
    sport: { id: 'sport-1', name: 'badminton', createdAt: new Date(startsAt), updatedAt: new Date(startsAt) },
    venue: latitude === null || longitude === null
      ? null
      : {
          id: 'venue-1',
          name: 'Venue',
          address: 'Address',
          latitude,
          longitude,
          createdAt: new Date(startsAt),
          updatedAt: new Date(startsAt),
        },
  };
}

describe('MatchQueryService nearby filtering', () => {
  const rankingService = new MatchRankingService();

  it('includes matches within radius and adds distanceKm', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([
          createMatch('near', 1.3001, 103.8002, '2026-05-01T10:00:00.000Z'),
          createMatch('far', 1.4300, 103.9000, '2026-05-01T10:30:00.000Z'),
        ]),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    const result = await service.findAll({
      latitude: 1.3002,
      longitude: 103.8001,
      radiusKm: 5,
    });

    expect(prisma.match.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('near');
    expect((result[0] as any).distanceKm).toBeDefined();
    expect((result[0] as any).distanceKm).toBeLessThanOrEqual(5);
  });

  it('excludes matches outside radius', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([
          createMatch('far-1', 1.4500, 103.9500, '2026-05-01T10:00:00.000Z'),
          createMatch('far-2', 1.4700, 103.9900, '2026-05-01T11:00:00.000Z'),
        ]),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    const result = await service.findAll({
      latitude: 1.3002,
      longitude: 103.8001,
      radiusKm: 3,
    });

    expect(result).toHaveLength(0);
  });

  it('keeps current behavior when no location query is provided', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([createMatch('plain', 1.3001, 103.8002, '2026-05-01T10:00:00.000Z')]),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    const result = await service.findAll({});

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('distanceKm');
  });

  it('requires full nearby query triplet when one location field is provided', async () => {
    const prisma = {
      match: {
        findMany: jest.fn(),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    await expect(
      service.findAll({
        latitude: 1.3002,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.match.findMany).not.toHaveBeenCalled();
  });

  it('sorts ranked matches by fitScore descending', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([
          createMatch('medium', 1.3005, 103.8004, '2026-05-01T12:00:00.000Z', {
            minRating: 1200,
            maxRating: 1300,
            maxPlayers: 4,
            joinedParticipants: 3,
            reliabilityScores: [82, 80, 78],
          }),
          createMatch('best', 1.3001, 103.8001, '2026-05-01T09:00:00.000Z', {
            minRating: 1200,
            maxRating: 1300,
            maxPlayers: 4,
            joinedParticipants: 1,
            reliabilityScores: [95],
          }),
          createMatch('low', 1.3040, 103.8040, '2026-05-03T09:00:00.000Z', {
            minRating: 1700,
            maxRating: 1900,
            maxPlayers: 4,
            joinedParticipants: 3,
            reliabilityScores: [45, 50, 48],
          }),
        ]),
      },
      userSportRating: {
        findMany: jest.fn().mockResolvedValue([
          { sportId: 'sport-1', format: 'DOUBLES', rating: 1250 },
        ]),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    const result = await service.findAll(
      {
        ranked: true,
        latitude: 1.3,
        longitude: 103.8,
        radiusKm: 10,
      },
      'user-1',
    );

    expect(result).toHaveLength(3);
    expect((result[0] as any).fitScore).toBeGreaterThanOrEqual((result[1] as any).fitScore);
    expect((result[1] as any).fitScore).toBeGreaterThanOrEqual((result[2] as any).fitScore);
    expect(result.map((match) => match.id)).toEqual(['best', 'medium', 'low']);
    expect(result.every((match) => 'fitBreakdown' in match)).toBe(true);
    expect((result[0] as any).fitBreakdown.reliabilityScore).toBe(95);
    expect((result[2] as any).fitBreakdown.reliabilityScore).toBeLessThan((result[0] as any).fitBreakdown.reliabilityScore);
  });

  it('returns ranked discovery without location params', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([
          createMatch('rank-a', 1.3002, 103.8001, '2026-05-01T10:00:00.000Z', {
            minRating: 1200,
            maxRating: 1300,
            joinedParticipants: 1,
          }),
          createMatch('rank-b', 1.3012, 103.8011, '2026-05-01T11:00:00.000Z', {
            minRating: 1600,
            maxRating: 1800,
            joinedParticipants: 3,
          }),
        ]),
      },
      userSportRating: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new MatchQueryService(prisma as any, rankingService);

    const result = await service.findAll({ ranked: true });

    expect(result).toHaveLength(2);
    expect(result.every((match) => (match as any).fitScore !== undefined)).toBe(true);
    expect(result.every((match) => (match as any).distanceKm === undefined)).toBe(true);
  });
});
