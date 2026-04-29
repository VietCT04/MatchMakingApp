import { UserRole } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { MatchesController } from './matches.controller';

describe('MatchesController auth identity handling', () => {
  const authUser = { id: 'jwt-user', email: 'jwt@example.com', role: UserRole.USER, displayName: 'JWT User' };

  function createController() {
    const matchesService = {
      createForUser: jest.fn(),
      joinForUser: jest.fn(),
      leaveForUser: jest.fn(),
      checkInForUser: jest.fn(),
      getCheckInsForUser: jest.fn(),
      submitResultForUser: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateForUser: jest.fn(),
      removeForUser: jest.fn(),
    };
    const verificationService = {
      verify: jest.fn(),
    };

    return {
      matchesService,
      verificationService,
      controller: new MatchesController(matchesService as any, verificationService as any),
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

    controller.join(authUser, 'match-id', { team: Team.A });

    expect(matchesService.joinForUser).toHaveBeenCalledWith('match-id', authUser.id, expect.objectContaining({ team: Team.A }));
  });

  it('submits results as the JWT user', () => {
    const { controller, matchesService } = createController();

    controller.submitResult(authUser, 'match-id', { teamAScore: 21, teamBScore: 15 });

    expect(matchesService.submitResultForUser).toHaveBeenCalledWith(
      'match-id',
      authUser.id,
      expect.objectContaining({ teamAScore: 21, teamBScore: 15 }),
    );
  });

  it('verifies results as the JWT user', () => {
    const { controller, verificationService } = createController();

    controller.verifyResult(authUser, 'match-id', 'result-id');

    expect(verificationService.verify).toHaveBeenCalledWith('match-id', 'result-id', authUser.id);
  });

  it('updates as the JWT user', () => {
    const { controller, matchesService } = createController();

    controller.update(authUser, 'match-id', { title: 'Updated match' });

    expect(matchesService.updateForUser).toHaveBeenCalledWith(
      'match-id',
      authUser,
      expect.objectContaining({ title: 'Updated match' }),
    );
  });

  it('removes as the JWT user', () => {
    const { controller, matchesService } = createController();

    controller.remove(authUser, 'match-id');

    expect(matchesService.removeForUser).toHaveBeenCalledWith('match-id', authUser);
  });

  it('checks in as the JWT user', () => {
    const { controller, matchesService } = createController();
    controller.checkIn(authUser, 'match-id');
    expect(matchesService.checkInForUser).toHaveBeenCalledWith('match-id', authUser.id);
  });

  it('gets check-ins with JWT user context', () => {
    const { controller, matchesService } = createController();
    controller.getCheckIns(authUser, 'match-id');
    expect(matchesService.getCheckInsForUser).toHaveBeenCalledWith('match-id', authUser);
  });
});
