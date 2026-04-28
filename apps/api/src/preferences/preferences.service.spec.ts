import { BadRequestException } from '@nestjs/common';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  it('updates profile for current user', async () => {
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'user-1', displayName: 'Viet' }),
      },
    };
    const service = new PreferencesService(prisma as any);

    await service.updateMyProfile('user-1', { displayName: 'Viet', bio: 'Player' });

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' } }));
  });

  it('rejects duplicate sport preferences', async () => {
    const prisma = {
      sport: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new PreferencesService(prisma as any);

    await expect(
      service.updateSportPreferences('user-1', {
        sports: [
          { sportId: 'sport-1', prefersSingles: true, prefersDoubles: false },
          { sportId: 'sport-1', prefersSingles: true, prefersDoubles: true },
        ],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid sportId', async () => {
    const prisma = {
      sport: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    const service = new PreferencesService(prisma as any);

    await expect(
      service.updateSportPreferences('user-1', {
        sports: [{ sportId: 'invalid', prefersSingles: true, prefersDoubles: false }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid venueId', async () => {
    const prisma = {
      venue: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    const service = new PreferencesService(prisma as any);

    await expect(
      service.updatePreferredVenues('user-1', {
        venues: [{ venueId: 'invalid' }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid availability time order', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new PreferencesService(prisma as any);

    await expect(
      service.updateAvailability('user-1', {
        availability: [{ dayOfWeek: 6, startTime: '12:00', endTime: '09:00' }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
