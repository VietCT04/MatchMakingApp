import { MatchParticipantStatus } from '@prisma/client';
import { MatchResultVerificationService } from './match-result-verification.service';

describe('MatchResultVerificationService', () => {
  it('increments completedMatches for joined participants when result is verified', async () => {
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          title: 'Saturday Doubles',
          participants: [
            { userId: 'user-a', status: MatchParticipantStatus.JOINED },
            { userId: 'user-b', status: MatchParticipantStatus.JOINED },
          ],
        }),
      },
    };
    const ratingsService = {
      verifyMatchResult: jest.fn().mockResolvedValue({
        result: { id: 'result-1' },
        ratingUpdates: [
          { userId: 'user-a', sportId: 'sport-1', oldRating: 1200, newRating: 1216, delta: 16 },
          { userId: 'user-b', sportId: 'sport-1', oldRating: 1200, newRating: 1184, delta: -16 },
        ],
      }),
    };
    const reliabilityService = {
      incrementCompletedMatch: jest.fn().mockResolvedValue(undefined),
    };
    const lifecycleService = {
      setCompleted: jest.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      createManyNotifications: jest.fn().mockResolvedValue([]),
    };
    const service = new MatchResultVerificationService(
      prisma as any,
      ratingsService as any,
      reliabilityService as any,
      lifecycleService as any,
      notificationsService as any,
    );

    await service.verify('match-1', 'result-1', 'verifier-1');

    expect(ratingsService.verifyMatchResult).toHaveBeenCalledWith('match-1', 'result-1', 'verifier-1');
    expect(lifecycleService.setCompleted).toHaveBeenCalledWith('match-1');
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledTimes(2);
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledWith('user-a');
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledWith('user-b');
    expect(notificationsService.createManyNotifications).toHaveBeenCalledTimes(2);
    expect(notificationsService.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-a', type: 'RESULT_VERIFIED' }),
        expect.objectContaining({ userId: 'user-b', type: 'RESULT_VERIFIED' }),
      ]),
    );
    expect(notificationsService.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-a', type: 'RATING_UPDATED' }),
        expect.objectContaining({ userId: 'user-b', type: 'RATING_UPDATED' }),
      ]),
    );
  });
});
