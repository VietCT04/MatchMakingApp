import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchDisputeService } from './match-dispute.service';

describe('MatchDisputeService', () => {
  it('rejects dispute when user is not a joined participant', async () => {
    const prisma = {
      matchResult: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'result-1',
          matchId: 'match-1',
          submittedByUserId: 'submitter-1',
          match: { id: 'match-1', title: 'Saturday Doubles', createdByUserId: 'creator-1' },
        }),
      },
      matchParticipant: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      matchResultDispute: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const reliabilityService = { incrementDisputedResults: jest.fn() };
    const notificationsService = { createManyNotifications: jest.fn() };
    const service = new MatchDisputeService(prisma as any, reliabilityService as any, notificationsService as any);

    await expect(
      service.createDispute('match-1', 'result-1', 'user-1', { reason: 'Score is incorrect' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate dispute by same user for same result', async () => {
    const prisma = {
      matchResult: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'result-1',
          matchId: 'match-1',
          submittedByUserId: 'submitter-1',
          match: { id: 'match-1', title: 'Saturday Doubles', createdByUserId: 'creator-1' },
        }),
      },
      matchParticipant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'participant-1',
          status: 'JOINED',
        }),
      },
      matchResultDispute: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-dispute' }),
      },
      $transaction: jest.fn(),
    };
    const reliabilityService = { incrementDisputedResults: jest.fn() };
    const notificationsService = { createManyNotifications: jest.fn() };
    const service = new MatchDisputeService(prisma as any, reliabilityService as any, notificationsService as any);

    await expect(
      service.createDispute('match-1', 'result-1', 'user-1', { reason: 'Score is incorrect' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
