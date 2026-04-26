import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { NotificationType, PushDevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto.register-push-token';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type NotificationLike = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
};

type PushPreferences = {
  matchUpdates: boolean;
  chatMessages: boolean;
  results: boolean;
  trustSafety: boolean;
  ratingUpdates: boolean;
};

export type PushSender = (messages: ExpoPushMessage[]) => Promise<ExpoPushTicket[]>;

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushSender: PushSender = async (messages) => {
      if (messages.length === 0) {
        return [];
      }
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const payload = (await response.json()) as { data?: ExpoPushTicket[] };
      return payload.data ?? [];
    },
  ) {}

  async registerDevice(userId: string, dto: RegisterPushTokenDto) {
    const expoPushToken = dto.expoPushToken.trim();
    return this.prisma.pushDevice.upsert({
      where: { expoPushToken },
      create: {
        userId,
        expoPushToken,
        platform: dto.platform ?? PushDevicePlatform.UNKNOWN,
        deviceName: dto.deviceName?.trim(),
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        platform: dto.platform ?? PushDevicePlatform.UNKNOWN,
        deviceName: dto.deviceName?.trim(),
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  async listActiveDevices(userId: string) {
    return this.prisma.pushDevice.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deactivateDevice(userId: string, expoPushToken: string) {
    const token = decodeURIComponent(expoPushToken).trim();
    const device = await this.prisma.pushDevice.findUnique({
      where: { expoPushToken: token },
    });
    if (!device) {
      return { success: true };
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Cannot deactivate another user push token');
    }
    await this.prisma.pushDevice.update({
      where: { id: device.id },
      data: { isActive: false },
    });
    return { success: true };
  }

  async deliverNotification(notification: NotificationLike) {
    const shouldSend = await this.isPushEnabledForType(notification.userId, notification.type);
    if (!shouldSend) {
      return { sent: 0, skipped: true };
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: notification.userId,
        isActive: true,
      },
    });
    if (devices.length === 0) {
      return { sent: 0, skipped: false };
    }

    const eventData = this.normalizeNotificationData(notification);
    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.expoPushToken,
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: eventData,
    }));

    const tickets = await this.pushSender(messages);
    await this.handleTickets(devices.map((d) => d.id), tickets);
    return { sent: messages.length, skipped: false };
  }

  private normalizeNotificationData(notification: NotificationLike): Record<string, unknown> {
    const data: Record<string, unknown> = {
      notificationId: notification.id,
      type: notification.type,
    };

    if (notification.data && typeof notification.data === 'object' && !Array.isArray(notification.data)) {
      const raw = notification.data as Record<string, unknown>;
      if (typeof raw.matchId === 'string') data.matchId = raw.matchId;
      if (typeof raw.resultId === 'string') data.resultId = raw.resultId;
      if (typeof raw.chatMessageId === 'string') data.chatMessageId = raw.chatMessageId;
    }
    return data;
  }

  private async handleTickets(deviceIds: string[], tickets: ExpoPushTicket[]) {
    await Promise.all(
      tickets.map(async (ticket, index) => {
        const deviceId = deviceIds[index];
        if (!deviceId || ticket.status !== 'error') {
          return;
        }
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await this.prisma.pushDevice.update({
            where: { id: deviceId },
            data: { isActive: false },
          });
          return;
        }
        this.logger.warn(`Push send failed for device ${deviceId}: ${ticket.message ?? 'unknown error'}`);
      }),
    );
  }

  private async isPushEnabledForType(userId: string, type: NotificationType): Promise<boolean> {
    if (type === NotificationType.SYSTEM) {
      return true;
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        matchUpdates: true,
        chatMessages: true,
        results: true,
        trustSafety: true,
        ratingUpdates: true,
      },
    });
    const effective: PushPreferences = preference ?? {
      matchUpdates: true,
      chatMessages: true,
      results: true,
      trustSafety: true,
      ratingUpdates: true,
    };

    switch (type) {
      case NotificationType.CHAT_MESSAGE:
        return effective.chatMessages;
      case NotificationType.MATCH_JOINED:
      case NotificationType.MATCH_LEFT:
      case NotificationType.MATCH_CANCELLED:
        return effective.matchUpdates;
      case NotificationType.RESULT_SUBMITTED:
      case NotificationType.RESULT_VERIFIED:
        return effective.results;
      case NotificationType.DISPUTE_CREATED:
      case NotificationType.REPORT_CREATED:
      case NotificationType.NO_SHOW_MARKED:
        return effective.trustSafety;
      case NotificationType.RATING_UPDATED:
        return effective.ratingUpdates;
      default:
        return true;
    }
  }
}
