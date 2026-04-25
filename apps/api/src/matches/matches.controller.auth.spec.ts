import { Team } from '@sports-matchmaking/shared';
import { MatchesController } from './matches.controller';

describe('MatchesController auth identity handling', () => {
  const authUser = { id: 'jwt-user', email: 'jwt@example.com', displayName: 'JWT User' };

  function createController() {
    const matchesService = {
      createForUser: jest.fn(),
      joinForUser: jest.fn(),
      leaveForUser: jest.fn(),
      submitResultForUser: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addParticipant: jest.fn(),
    };
    const ratingsService = {
      verifyMatchResult: jest.fn(),
    };

    return {
      matchesService,
      ratingsService,
      controller: new MatchesController(matchesService as any, ratingsService as any),
    };
  }

  it('creates matches for the JWT user', () => {
    const { controller, matchesService } = createController();

    controller.create(authUser, {
      sportId: 'sport-id',
      venueId: 'venue-id',
      title: 'Match',
      format: 'DOUBLES' as any,
      startsAt: new Date().toISOString(),
      maxPlayers: 4,
    });

    expect(matchesService.createForUser).toHaveBeenCalledWith(authUser.id, expect.any(Object));
  });

  it('joins as the JWT user, not a body userId', () => {
    const { controller, matchesService } = createController();

    controller.join(authUser, 'match-id', { team: Team.A, userId: 'spoofed-user' } as any);

    expect(matchesService.joinForUser).toHaveBeenCalledWith('match-id', authUser.id, expect.objectContaining({ team: Team.A }));
  });

  it('submits results as the JWT user', () => {
    const { controller, matchesService } = createController();

    controller.submitResult(authUser, 'match-id', { teamAScore: 21, teamBScore: 15, submittedByUserId: 'spoofed-user' } as any);

    expect(matchesService.submitResultForUser).toHaveBeenCalledWith(
      'match-id',
      authUser.id,
      expect.objectContaining({ teamAScore: 21, teamBScore: 15 }),
    );
  });

  it('verifies results as the JWT user', () => {
    const { controller, ratingsService } = createController();

    controller.verifyResult(authUser, 'match-id', 'result-id', {});

    expect(ratingsService.verifyMatchResult).toHaveBeenCalledWith('match-id', 'result-id', authUser.id);
  });
});
