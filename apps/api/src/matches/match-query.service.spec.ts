import { BadRequestException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { MatchQueryService } from './match-query.service';

function createMatch(id: string, latitude: number | null, longitude: number | null, startsAt: string) {
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
    maxPlayers: 4,
    minRating: null,
    maxRating: null,
    createdAt: new Date(startsAt),
    updatedAt: new Date(startsAt),
    participants: [],
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
  it('includes matches within radius and adds distanceKm', async () => {
    const prisma = {
      match: {
        findMany: jest.fn().mockResolvedValue([
          createMatch('near', 1.3001, 103.8002, '2026-05-01T10:00:00.000Z'),
          createMatch('far', 1.4300, 103.9000, '2026-05-01T10:30:00.000Z'),
        ]),
      },
    };
    const service = new MatchQueryService(prisma as any);

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
    const service = new MatchQueryService(prisma as any);

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
    const service = new MatchQueryService(prisma as any);

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
    const service = new MatchQueryService(prisma as any);

    await expect(
      service.findAll({
        latitude: 1.3002,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.match.findMany).not.toHaveBeenCalled();
  });
});
