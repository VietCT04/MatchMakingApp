import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchParticipationService } from './match-participation.service';
import { MatchQueryService } from './match-query.service';
import { MatchResultSubmissionService } from './match-result-submission.service';

function createParticipationService(match: any) {
  const prisma = {
    matchParticipant: {
      upsert: jest.fn().mockResolvedValue({ id: 'participant-1', matchId: match.id, userId: 'user-1' }),
      update: jest.fn(),
    },
    matchResult: {
      create: jest.fn(),
    },
  };
  const queryService = { findOne: jest.fn().mockResolvedValue(match) } as unknown as MatchQueryService;
  const lifecycleService = {
    setFull: jest.fn(),
    setOpen: jest.fn(),
  } as unknown as MatchLifecycleService;
  const reliabilityService = {
    incrementCancellation: jest.fn(),
    incrementNoShow: jest.fn(),
  };

  return {
    prisma,
    queryService,
    lifecycleService,
    reliabilityService,
    participationService: new MatchParticipationService(prisma as any, queryService, lifecycleService, reliabilityService as any),
    resultSubmissionService: new MatchResultSubmissionService(prisma as any, queryService),
  };
}

describe('Matches services', () => {
  it('joins a match and marks it full when max players is reached', async () => {
    const { prisma, lifecycleService, participationService } = createParticipationService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 1,
      participants: [],
    });

    await participationService.join('match-1', 'user-1', { team: Team.A });

    expect(prisma.matchParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_userId: { matchId: 'match-1', userId: 'user-1' } },
      }),
    );
    expect(lifecycleService.setFull).toHaveBeenCalledWith('match-1');
  });

  it('prevents duplicate joins', async () => {
    const { participationService } = createParticipationService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 4,
      participants: [{ userId: 'user-1', status: MatchParticipantStatus.JOINED }],
    });

    await expect(participationService.join('match-1', 'user-1', { team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('prevents joining a full match', async () => {
    const { participationService } = createParticipationService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 1,
      participants: [{ userId: 'user-2', status: MatchParticipantStatus.JOINED }],
    });

    await expect(participationService.join('match-1', 'user-1', { team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires result submitter to be a joined participant', async () => {
    const { resultSubmissionService } = createParticipationService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      maxPlayers: 4,
      participants: [{ userId: 'user-2', status: MatchParticipantStatus.JOINED }],
    });

    await expect(
      resultSubmissionService.submit('match-1', 'user-1', { teamAScore: 21, teamBScore: 15 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts normal leave as cancellation but not late cancellation when outside threshold', async () => {
    const futureStart = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const { participationService, reliabilityService } = createParticipationService({
      id: 'match-1',
      status: MatchStatus.OPEN,
      startsAt: futureStart,
      maxPlayers: 4,
      participants: [{ id: 'participant-1', userId: 'user-1', status: MatchParticipantStatus.JOINED }],
    });

    await participationService.leave('match-1', 'user-1');

    expect(reliabilityService.incrementCancellation).toHaveBeenCalledWith('user-1', false);
  });
});
