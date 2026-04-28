import { ForbiddenException } from '@nestjs/common';
import { MatchStatus, UserRole } from '@prisma/client';
import { MatchLifecycleService } from './match-lifecycle.service';

describe('MatchLifecycleService authorization', () => {
  function createService(matchStatus: MatchStatus = MatchStatus.OPEN, createdByUserId = 'creator-1') {
    const prisma = {
      match: {
        update: jest.fn().mockResolvedValue({ id: 'match-1', status: MatchStatus.CANCELLED }),
      },
    };
    const queryService = {
      validateRatingRange: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        id: 'match-1',
        createdByUserId,
        status: matchStatus,
      }),
    };

    return {
      prisma,
      queryService,
      service: new MatchLifecycleService(prisma as any, queryService as any),
    };
  }

  it('blocks non-owner USER from update', async () => {
    const { service } = createService();

    await expect(
      service.updateForUser(
        'match-1',
        { id: 'user-2', email: 'user2@example.com', role: UserRole.USER, displayName: 'User 2' },
        { title: 'New title' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows creator to update', async () => {
    const { service, prisma } = createService();

    await service.updateForUser(
      'match-1',
      { id: 'creator-1', email: 'creator@example.com', role: UserRole.USER, displayName: 'Creator' },
      { title: 'Updated' },
    );

    expect(prisma.match.update).toHaveBeenCalled();
  });

  it('allows ADMIN to update', async () => {
    const { service, prisma } = createService();

    await service.updateForUser(
      'match-1',
      { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN, displayName: 'Admin' },
      { title: 'Admin update' },
    );

    expect(prisma.match.update).toHaveBeenCalled();
  });

  it('blocks non-owner USER from cancel/delete', async () => {
    const { service } = createService();

    await expect(
      service.removeForUser('match-1', {
        id: 'user-2',
        email: 'user2@example.com',
        role: UserRole.USER,
        displayName: 'User 2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows creator to cancel', async () => {
    const { service, prisma } = createService();

    await service.removeForUser('match-1', {
      id: 'creator-1',
      email: 'creator@example.com',
      role: UserRole.USER,
      displayName: 'Creator',
    });

    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: MatchStatus.CANCELLED } }),
    );
  });

  it('allows ADMIN to cancel', async () => {
    const { service, prisma } = createService();

    await service.removeForUser('match-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      displayName: 'Admin',
    });

    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: MatchStatus.CANCELLED } }),
    );
  });

  it('blocks creator from cancelling completed match', async () => {
    const { service } = createService(MatchStatus.COMPLETED);

    await expect(
      service.removeForUser('match-1', {
        id: 'creator-1',
        email: 'creator@example.com',
        role: UserRole.USER,
        displayName: 'Creator',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
