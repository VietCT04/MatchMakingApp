import { MatchParticipantStatus } from '@prisma/client';
import { MatchResultVerificationService } from './match-result-verification.service';

describe('MatchResultVerificationService', () => {
  it('increments completedMatches for joined participants when result is verified', async () => {
    const prisma = {
      matchParticipant: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'user-a', status: MatchParticipantStatus.JOINED },
          { userId: 'user-b', status: MatchParticipantStatus.JOINED },
        ]),
      },
    };
    const ratingsService = {
      verifyMatchResult: jest.fn().mockResolvedValue({ result: { id: 'result-1' } }),
    };
    const reliabilityService = {
      incrementCompletedMatch: jest.fn().mockResolvedValue(undefined),
    };
    const lifecycleService = {
      setCompleted: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MatchResultVerificationService(
      prisma as any,
      ratingsService as any,
      reliabilityService as any,
      lifecycleService as any,
    );

    await service.verify('match-1', 'result-1', 'verifier-1');

    expect(ratingsService.verifyMatchResult).toHaveBeenCalledWith('match-1', 'result-1', 'verifier-1');
    expect(lifecycleService.setCompleted).toHaveBeenCalledWith('match-1');
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledTimes(2);
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledWith('user-a');
    expect(reliabilityService.incrementCompletedMatch).toHaveBeenCalledWith('user-b');
  });
});
