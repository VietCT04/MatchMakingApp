import { ConflictException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { MatchesService } from './matches.service';

function createService(match: any) {
  const prisma = {
    match: {
      findUnique: jest.fn().mockResolvedValue(match),
      update: jest.fn().mockResolvedValue({ ...match, status: MatchStatus.FULL }),
    },
    matchParticipant: {
      upsert: jest.fn().mockResolvedValue({ id: 'participant-1', matchId: match.id, userId: 'user-1' }),
      update: jest.fn(),
      create: jest.fn(),
    },
    matchResult: {
      create: jest.fn(),
    },
  };

  return {
    prisma,
    service: new MatchesService(prisma as any),
  };
}

describe('MatchesService', () => {
  it('joins a match and marks it full when max players is reached', async () => {
    const { prisma, service } = createService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 1,
      participants: [],
    });

    await service.join('match-1', { userId: 'user-1', team: Team.A });

    expect(prisma.matchParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_userId: { matchId: 'match-1', userId: 'user-1' } },
      }),
    );
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: MatchStatus.FULL },
    });
  });

  it('prevents duplicate joins', async () => {
    const { service } = createService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 4,
      participants: [{ userId: 'user-1', status: MatchParticipantStatus.JOINED }],
    });

    await expect(service.join('match-1', { userId: 'user-1', team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('prevents joining a full match', async () => {
    const { service } = createService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 1,
      participants: [{ userId: 'user-2', status: MatchParticipantStatus.JOINED }],
    });

    await expect(service.join('match-1', { userId: 'user-1', team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
