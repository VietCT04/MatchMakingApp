import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PushService } from '../push/push.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQueryDto } from './dto.notifications-query';
import { UpdateNotificationPreferencesDto } from './dto.update-notification-preferences';

type NotificationData = Prisma.InputJsonValue | null | undefined;

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: NotificationData,
  ) {
    const dedupeKey = this.extractDedupeKey(data);
    if (dedupeKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type,
          data: {
            path: ['dedupeKey'],
            equals: dedupeKey,
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue | undefined,
      },
    });
    await this.tryDeliverPush(notification);
    return notification;
  }

  async createManyNotifications(items: CreateNotificationInput[]) {
    const uniqueByUserAndDedupe = new Map<string, CreateNotificationInput>();
    for (const item of items) {
      const dedupeKey = this.extractDedupeKey(item.data);
      const key = dedupeKey ? `${item.userId}:${item.type}:${dedupeKey}` : `${item.userId}:${item.type}:${item.title}:${item.body}`;
      if (!uniqueByUserAndDedupe.has(key)) {
        uniqueByUserAndDedupe.set(key, item);
      }
    }

    const created = [];
    for (const item of uniqueByUserAndDedupe.values()) {
      try {
        created.push(
          await this.createNotification(item.userId, item.type, item.title, item.body, item.data),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to create notification for user ${item.userId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
    return created;
  }

  async getMyNotifications(userId: string, query: NotificationsQueryDto) {
    const limit = query.limit ?? 30;
    const unreadOnly = query.unreadOnly === true;

    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        readAt: unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    });

    return { items };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, readAt: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot mark another user notification as read');
    }
    if (notification.readAt) {
      return this.prisma.notification.findUnique({ where: { id: notification.id } });
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    return { count: result.count };
  }

  async getNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        matchUpdates: dto.matchUpdates ?? true,
        chatMessages: dto.chatMessages ?? true,
        results: dto.results ?? true,
        trustSafety: dto.trustSafety ?? true,
        ratingUpdates: dto.ratingUpdates ?? true,
      },
      update: {
        matchUpdates: dto.matchUpdates,
        chatMessages: dto.chatMessages,
        results: dto.results,
        trustSafety: dto.trustSafety,
        ratingUpdates: dto.ratingUpdates,
      },
    });
  }

  private extractDedupeKey(data: NotificationData): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const candidate = (data as Record<string, unknown>).dedupeKey;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
    return null;
  }

  private async tryDeliverPush(notification: {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: unknown;
  }) {
    try {
      await this.pushService.deliverNotification(notification);
    } catch (error) {
      this.logger.warn(
        `Push delivery failed for notification ${notification.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
