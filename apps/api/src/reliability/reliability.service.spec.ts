import { ReliabilityService } from './reliability.service';

function createPrismaMock(initialByUser: Record<string, any> = {}) {
  const state = new Map<string, any>(Object.entries(initialByUser));
  return {
    userReliabilityStats: {
      upsert: jest.fn().mockImplementation(async ({ where, create }: any) => {
        const existing = state.get(where.userId);
        if (existing) {
          return existing;
        }
        const next = {
          id: `rel-${where.userId}`,
          userId: where.userId,
          completedMatches: 0,
          cancelledMatches: 0,
          lateCancellationCount: 0,
          noShowCount: 0,
          disputedResults: 0,
          reportCount: 0,
          reliabilityScore: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        state.set(where.userId, next);
        return next;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }: any) => state.get(where.userId) ?? null),
      findUniqueOrThrow: jest.fn().mockImplementation(async ({ where }: any) => {
        const value = state.get(where.userId);
        if (!value) {
          throw new Error('Not found');
        }
        return value;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: any) => {
        const current = state.get(where.userId);
        const next = { ...current, ...data, updatedAt: new Date() };
        state.set(where.userId, next);
        return next;
      }),
    },
  };
}

describe('ReliabilityService', () => {
  it('returns default reliability score of 100 for new users', async () => {
    const prisma = createPrismaMock();
    const service = new ReliabilityService(prisma as any);
    const summary = await service.toSummaryByUserId('user-1');

    expect(summary.reliabilityScore).toBe(100);
    expect(summary.noShowCount).toBe(0);
    expect(prisma.userReliabilityStats.upsert).not.toHaveBeenCalled();
  });

  it('decreases reliability on no-show', async () => {
    const prisma = createPrismaMock({ 'user-1': { id: 'rel-1', userId: 'user-1', completedMatches: 0, cancelledMatches: 0, lateCancellationCount: 0, noShowCount: 0, disputedResults: 0, reportCount: 0, reliabilityScore: 100, createdAt: new Date(), updatedAt: new Date() } });
    const service = new ReliabilityService(prisma as any);

    const stats = await service.incrementNoShow('user-1');

    expect(stats.noShowCount).toBe(1);
    expect(stats.reliabilityScore).toBe(90);
  });

  it('decreases reliability on late cancellation', async () => {
    const prisma = createPrismaMock({ 'user-2': { id: 'rel-2', userId: 'user-2', completedMatches: 0, cancelledMatches: 0, lateCancellationCount: 0, noShowCount: 0, disputedResults: 0, reportCount: 0, reliabilityScore: 100, createdAt: new Date(), updatedAt: new Date() } });
    const service = new ReliabilityService(prisma as any);

    const stats = await service.incrementCancellation('user-2', true);

    expect(stats.cancelledMatches).toBe(1);
    expect(stats.lateCancellationCount).toBe(1);
    expect(stats.reliabilityScore).toBe(95);
  });

  it('increments normal cancellation without late cancellation penalty', async () => {
    const prisma = createPrismaMock({ 'user-3': { id: 'rel-3', userId: 'user-3', completedMatches: 0, cancelledMatches: 0, lateCancellationCount: 0, noShowCount: 0, disputedResults: 0, reportCount: 0, reliabilityScore: 100, createdAt: new Date(), updatedAt: new Date() } });
    const service = new ReliabilityService(prisma as any);

    const stats = await service.incrementCancellation('user-3', false);

    expect(stats.cancelledMatches).toBe(1);
    expect(stats.lateCancellationCount).toBe(0);
    expect(stats.reliabilityScore).toBe(100);
  });
});
