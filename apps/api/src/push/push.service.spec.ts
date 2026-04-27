import { ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PushService } from './push.service';

describe('PushService', () => {
  function createService(options?: {
    preference?: any;
    matchPreference?: any;
    devices?: Array<{ id: string; expoPushToken: string; isActive?: boolean }>;
    sender?: jest.Mock;
    findUniqueDevice?: any;
  }) {
    const sender =
      options?.sender ??
      jest.fn().mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
      ]);
    const prisma = {
      pushDevice: {
        upsert: jest.fn().mockImplementation(async ({ where, create, update }: any) => ({
          id: 'device-1',
          expoPushToken: where.expoPushToken,
          ...create,
          ...update,
        })),
        findMany: jest.fn().mockResolvedValue(options?.devices ?? []),
        findUnique: jest.fn().mockResolvedValue(options?.findUniqueDevice ?? null),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue(options?.preference ?? null),
      },
      matchNotificationPreference: {
        findUnique: jest.fn().mockResolvedValue(options?.matchPreference ?? null),
      },
    };
    return {
      prisma,
      sender,
      service: new PushService(prisma as any, sender),
    };
  }

  it('register push token creates device', async () => {
    const { service, prisma } = createService();
    await service.registerDevice('user-1', {
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'IOS' as any,
      deviceName: 'iPhone',
    });
    expect(prisma.pushDevice.upsert).toHaveBeenCalled();
  });

  it('registering same token updates existing device', async () => {
    const { service, prisma } = createService();
    await service.registerDevice('user-1', {
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'ANDROID' as any,
    });
    const arg = prisma.pushDevice.upsert.mock.calls[0][0];
    expect(arg.where.expoPushToken).toBe('ExponentPushToken[abc]');
    expect(arg.update.userId).toBe('user-1');
    expect(arg.update.isActive).toBe(true);
  });

  it('user cannot deactivate another user token', async () => {
    const { service } = createService({
      findUniqueDevice: { id: 'd-1', userId: 'user-2' },
    });
    await expect(service.deactivateDevice('user-1', 'ExponentPushToken[abc]')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('notification preferences disable chat message push', async () => {
    const sender = jest.fn();
    const { service } = createService({
      sender,
      preference: {
        chatMessages: false,
        matchUpdates: true,
        results: true,
        trustSafety: true,
        ratingUpdates: true,
      },
      devices: [{ id: 'd-1', expoPushToken: 'ExponentPushToken[abc]' }],
    });

    await service.deliverNotification({
      id: 'n-1',
      userId: 'user-1',
      type: NotificationType.CHAT_MESSAGE,
      title: 'New chat message',
      body: 'Hello',
      data: {},
    });

    expect(sender).not.toHaveBeenCalled();
  });

  it('inactive devices do not receive push', async () => {
    const sender = jest.fn();
    const { service, prisma } = createService({
      sender,
      devices: [],
    });

    await service.deliverNotification({
      id: 'n-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'System',
      body: 'Message',
      data: {},
    });

    expect(prisma.pushDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(sender).not.toHaveBeenCalled();
  });

  it('invalid token response marks device inactive', async () => {
    const sender = jest.fn().mockResolvedValue([
      { status: 'error', details: { error: 'DeviceNotRegistered' }, message: 'invalid token' },
    ]);
    const { service, prisma } = createService({
      sender,
      devices: [{ id: 'd-1', expoPushToken: 'ExponentPushToken[abc]' }],
    });

    await service.deliverNotification({
      id: 'n-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'System',
      body: 'Message',
      data: {},
    });

    expect(prisma.pushDevice.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { isActive: false },
    });
  });

  it('muted match blocks push delivery', async () => {
    const sender = jest.fn();
    const { service } = createService({
      sender,
      devices: [{ id: 'd-1', expoPushToken: 'ExponentPushToken[abc]' }],
      matchPreference: { muted: true, muteUntil: null },
    });

    await service.deliverNotification({
      id: 'n-1',
      userId: 'user-1',
      type: NotificationType.CHAT_MESSAGE,
      title: 'New chat message',
      body: 'Muted',
      data: { matchId: 'match-1' },
    });

    expect(sender).not.toHaveBeenCalled();
  });

  it('quiet hours block push delivery', async () => {
    const sender = jest.fn();
    const { service } = createService({
      sender,
      devices: [{ id: 'd-1', expoPushToken: 'ExponentPushToken[abc]' }],
      preference: {
        matchUpdates: true,
        chatMessages: true,
        results: true,
        trustSafety: true,
        ratingUpdates: true,
        quietHoursEnabled: true,
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        timezone: 'Asia/Singapore',
      },
    });

    await service.deliverNotification({
      id: 'n-1',
      userId: 'user-1',
      type: NotificationType.MATCH_JOINED,
      title: 'Join',
      body: 'Body',
      data: { matchId: 'match-1' },
    });

    expect(sender).not.toHaveBeenCalled();
  });
});
