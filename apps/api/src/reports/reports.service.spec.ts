import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('rejects reporting self', async () => {
    const prisma = {
      user: { findUnique: jest.fn() },
      matchParticipant: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    const reliabilityService = { incrementReports: jest.fn() };
    const service = new ReportsService(prisma as any, reliabilityService as any);

    await expect(
      service.createUserReport('user-1', {
        reportedUserId: 'user-1',
        reason: 'No show without notice',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
