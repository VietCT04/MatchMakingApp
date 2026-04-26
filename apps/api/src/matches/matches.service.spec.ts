import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchParticipationService } from './match-participation.service';
import { MatchQueryService } from './match-query.service';
import { MatchResultSubmissionService } from './match-result-submission.service';

function createParticipationService(match: any) {
  const notificationsService = {
    createNotification: jest.fn(),
    createManyNotifications: jest.fn(),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ displayName: 'Player One' }),
    },
    matchParticipant: {
      upsert: jest.fn().mockResolvedValue({ id: 'participant-1', matchId: match.id, userId: 'user-1' }),
      update: jest.fn().mockResolvedValue({ id: 'participant-1', matchId: match.id, userId: 'user-2', status: MatchParticipantStatus.NO_SHOW }),
    },
    matchResult: {
      create: jest.fn().mockResolvedValue({ id: 'result-1', matchId: match.id, submittedByUserId: 'user-1' }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma)),
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
    notificationsService,
    participationService: new MatchParticipationService(
      prisma as any,
      queryService,
      lifecycleService,
      reliabilityService as any,
      notificationsService as any,
    ),
    resultSubmissionService: new MatchResultSubmissionService(
      prisma as any,
      queryService,
      notificationsService as any,
    ),
  };
}

describe('Matches services', () => {
  it('joins a match and marks it full when max players is reached', async () => {
    const { prisma, lifecycleService, participationService } = createParticipationService({
      id: 'match-1',
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
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
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
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
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
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
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
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
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
      status: MatchStatus.OPEN,
      startsAt: futureStart,
      maxPlayers: 4,
      participants: [{ id: 'participant-1', userId: 'user-1', status: MatchParticipantStatus.JOINED }],
    });

    await participationService.leave('match-1', 'user-1');

    expect(reliabilityService.incrementCancellation).toHaveBeenCalledWith('user-1', false);
  });

  it('join creates notification for match creator', async () => {
    const { participationService, notificationsService } = createParticipationService({
      id: 'match-1',
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
      status: MatchStatus.OPEN,
      maxPlayers: 4,
      participants: [],
    });

    await participationService.join('match-1', 'user-1', { team: Team.A });

    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      'creator-1',
      'MATCH_JOINED',
      'New player joined',
      'Player One joined Saturday Doubles',
      expect.objectContaining({ matchId: 'match-1', userId: 'user-1' }),
    );
  });

  it('result submitted creates verification notifications for joined participants except submitter', async () => {
    const { resultSubmissionService, notificationsService } = createParticipationService({
      id: 'match-1',
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
      status: MatchStatus.OPEN,
      maxPlayers: 4,
      participants: [
        { userId: 'user-1', status: MatchParticipantStatus.JOINED },
        { userId: 'user-2', status: MatchParticipantStatus.JOINED },
        { userId: 'user-3', status: MatchParticipantStatus.JOINED },
      ],
    });

    await resultSubmissionService.submit('match-1', 'user-1', { teamAScore: 21, teamBScore: 17 });

    expect(notificationsService.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-2', type: 'RESULT_SUBMITTED' }),
        expect.objectContaining({ userId: 'user-3', type: 'RESULT_SUBMITTED' }),
      ]),
    );
    expect(notificationsService.createManyNotifications).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ userId: 'user-1' })]),
    );
  });

  it('no-show marking creates notification for marked user', async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000);
    const { participationService, notificationsService } = createParticipationService({
      id: 'match-1',
      title: 'Saturday Doubles',
      createdByUserId: 'creator-1',
      status: MatchStatus.OPEN,
      startsAt: startedAt,
      maxPlayers: 4,
      participants: [
        { id: 'participant-2', userId: 'user-2', status: MatchParticipantStatus.JOINED },
      ],
    });

    await participationService.markNoShow('match-1', 'participant-2', 'creator-1');

    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      'user-2',
      'NO_SHOW_MARKED',
      'Marked as no-show',
      'You were marked as no-show for Saturday Doubles',
      expect.objectContaining({ matchId: 'match-1' }),
    );
  });
});
