import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, NotificationType, Prisma } from '@prisma/client';
import { UpdateMatchNotificationPreferenceDto } from './dto.update-match-notification-preference';
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
      create: { userId, timezone: 'Asia/Singapore' },
      update: {},
    });
  }

  async updateNotificationPreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    if (dto.quietHoursEnabled) {
      if (!dto.quietHoursStart || !dto.quietHoursEnd) {
        throw new BadRequestException('quietHoursStart and quietHoursEnd are required when quiet hours are enabled');
      }
    }
    if (dto.quietHoursStart && !dto.quietHoursEnd) {
      throw new BadRequestException('quietHoursEnd is required when quietHoursStart is provided');
    }
    if (dto.quietHoursEnd && !dto.quietHoursStart) {
      throw new BadRequestException('quietHoursStart is required when quietHoursEnd is provided');
    }

    const normalizedTimezone = dto.timezone?.trim() || 'Asia/Singapore';

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        matchUpdates: dto.matchUpdates ?? true,
        chatMessages: dto.chatMessages ?? true,
        results: dto.results ?? true,
        trustSafety: dto.trustSafety ?? true,
        ratingUpdates: dto.ratingUpdates ?? true,
        quietHoursEnabled: dto.quietHoursEnabled ?? false,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: normalizedTimezone,
      },
      update: {
        matchUpdates: dto.matchUpdates,
        chatMessages: dto.chatMessages,
        results: dto.results,
        trustSafety: dto.trustSafety,
        ratingUpdates: dto.ratingUpdates,
        quietHoursEnabled: dto.quietHoursEnabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: dto.timezone?.trim(),
      },
    });
  }

  async getMatchNotificationPreference(userId: string, matchId: string) {
    await this.ensureMatchNotificationAccess(userId, matchId);
    return this.prisma.matchNotificationPreference.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      create: {
        userId,
        matchId,
      },
      update: {},
    });
  }

  async updateMatchNotificationPreference(userId: string, matchId: string, dto: UpdateMatchNotificationPreferenceDto) {
    await this.ensureMatchNotificationAccess(userId, matchId);

    const muteUntilDate = dto.muteUntil ? new Date(dto.muteUntil) : null;
    if (muteUntilDate && muteUntilDate.getTime() <= Date.now()) {
      throw new BadRequestException('muteUntil must be a future datetime');
    }

    return this.prisma.matchNotificationPreference.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      create: {
        userId,
        matchId,
        muted: dto.muted,
        muteUntil: dto.muted ? muteUntilDate : null,
      },
      update: {
        muted: dto.muted,
        muteUntil: dto.muted ? muteUntilDate : null,
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

  private async ensureMatchNotificationAccess(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        createdByUserId: true,
        participants: {
          where: {
            userId,
            status: {
              in: [MatchParticipantStatus.JOINED, MatchParticipantStatus.LEFT, MatchParticipantStatus.NO_SHOW],
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const isCreator = match.createdByUserId === userId;
    const isParticipant = match.participants.length > 0;
    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('Only match participants or creator can manage match notification preference');
    }
  }
}
