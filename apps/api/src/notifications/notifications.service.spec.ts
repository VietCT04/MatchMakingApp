import { ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  function createService(pushShouldFail = false) {
    const pushService = {
      deliverNotification: pushShouldFail
        ? jest.fn().mockRejectedValue(new Error('push failed'))
        : jest.fn().mockResolvedValue({ sent: 1 }),
    };
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'notification-1',
          ...data,
          readAt: null,
          createdAt: new Date('2026-04-26T12:00:00.000Z'),
        })),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      notificationPreference: {
        upsert: jest.fn().mockImplementation(async ({ create, update }: any) => ({
          id: 'pref-1',
          ...create,
          ...update,
        })),
      },
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'match-1',
          createdByUserId: 'user-1',
          participants: [],
        }),
      },
      matchNotificationPreference: {
        upsert: jest.fn().mockImplementation(async ({ create, update }: any) => ({
          id: 'mnp-1',
          muteUntil: null,
          ...create,
          ...update,
        })),
      },
    };

    return {
      prisma,
      pushService,
      service: new NotificationsService(prisma as any, pushService as any),
    };
  }

  it('user can list own notifications', async () => {
    const { service, prisma } = createService();
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);

    const result = await service.getMyNotifications('user-1', {});

    expect(result.items).toEqual([{ id: 'n-1' }]);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('user cannot mark another user notification as read', async () => {
    const { service, prisma } = createService();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-2',
      readAt: null,
    });

    await expect(service.markAsRead('user-1', 'notification-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('unread count works', async () => {
    const { service, prisma } = createService();
    prisma.notification.count.mockResolvedValue(3);

    await expect(service.getUnreadCount('user-1')).resolves.toEqual({ count: 3 });
  });

  it('mark all as read works', async () => {
    const { service, prisma } = createService();
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });

    await expect(service.markAllAsRead('user-1')).resolves.toEqual({ count: 4 });
  });

  it('createNotification uses dedupe key to avoid duplicates', async () => {
    const { service, prisma } = createService();
    prisma.notification.findFirst.mockResolvedValue({
      id: 'existing-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
    });

    const result = await service.createNotification(
      'user-1',
      NotificationType.SYSTEM,
      'Hello',
      'World',
      { dedupeKey: 'dup-1' },
    );

    expect(result).toEqual(expect.objectContaining({ id: 'existing-1' }));
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('createNotification still succeeds if push sending fails', async () => {
    const { service } = createService(true);

    await expect(
      service.createNotification('user-1', NotificationType.SYSTEM, 'System', 'Body'),
    ).resolves.toEqual(expect.objectContaining({ id: 'notification-1' }));
  });

  it('quiet-hours or mute push skip still keeps notification record', async () => {
    const { service, prisma, pushService } = createService();
    pushService.deliverNotification.mockResolvedValue({ sent: 0, skipped: true });

    const result = await service.createNotification(
      'user-1',
      NotificationType.CHAT_MESSAGE,
      'Chat',
      'Body',
      { matchId: 'match-1' },
    );

    expect(result).toEqual(expect.objectContaining({ id: 'notification-1' }));
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(pushService.deliverNotification).toHaveBeenCalled();
  });

  it('match mute preference can be created and updated', async () => {
    const { service, prisma } = createService();

    const created = await service.getMatchNotificationPreference('user-1', 'match-1');
    expect(created).toEqual(expect.objectContaining({ id: 'mnp-1' }));

    const future = new Date(Date.now() + 3600_000).toISOString();
    const updated = await service.updateMatchNotificationPreference('user-1', 'match-1', {
      muted: true,
      muteUntil: future,
    });
    expect(updated).toEqual(expect.objectContaining({ muted: true }));
    expect(prisma.matchNotificationPreference.upsert).toHaveBeenCalled();
  });

  it('non-participant cannot get match notification preference', async () => {
    const { service, prisma } = createService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      createdByUserId: 'creator-1',
      participants: [],
    });

    await expect(service.getMatchNotificationPreference('outsider-1', 'match-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
