import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessagesQueryDto } from './dto.chat-messages-query';
import { CreateChatMessageDto } from './dto.create-chat-message';

type MatchChatAccessContext = {
  matchId: string;
  title: string;
  status: MatchStatus;
  createdByUserId: string;
  participantStatus: MatchParticipantStatus | null;
  isCreator: boolean;
  isParticipant: boolean;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMessages(matchId: string, userId: string, query: ChatMessagesQueryDto) {
    await this.getReadAccessContext(matchId, userId);

    const take = query.limit ?? 50;
    const beforeDate = query.before ? new Date(query.before) : undefined;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        matchId,
        deletedAt: null,
        createdAt: beforeDate ? { lt: beforeDate } : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return messages.reverse();
  }

  async getUnreadCount(matchId: string, userId: string) {
    await this.getReadAccessContext(matchId, userId);

    const readState = await this.prisma.chatReadState.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      select: {
        lastReadAt: true,
      },
    });

    const count = await this.prisma.chatMessage.count({
      where: {
        matchId,
        deletedAt: null,
        senderUserId: { not: userId },
        createdAt: readState?.lastReadAt ? { gt: readState.lastReadAt } : undefined,
      },
    });

    return { count };
  }

  async markAsRead(matchId: string, userId: string) {
    await this.getReadAccessContext(matchId, userId);
    await this.prisma.chatReadState.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      create: {
        userId,
        matchId,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      },
    });
    return { success: true };
  }

  async sendMessage(matchId: string, userId: string, dto: CreateChatMessageDto) {
    const access = await this.getSendAccessContext(matchId, userId);
    const trimmedBody = dto.body.trim();

    if (trimmedBody.length < 1) {
      throw new BadRequestException('Message body is required');
    }
    if (trimmedBody.length > 1000) {
      throw new BadRequestException('Message body must be at most 1000 characters');
    }

    if (access.status === MatchStatus.CANCELLED) {
      throw new BadRequestException('Cannot send messages for a cancelled match');
    }

    if (!access.isCreator) {
      if (access.participantStatus === MatchParticipantStatus.LEFT) {
        throw new BadRequestException('Left participants cannot send new messages');
      }
      if (access.participantStatus === MatchParticipantStatus.NO_SHOW) {
        throw new BadRequestException('No-show participants cannot send messages');
      }
      if (access.participantStatus !== MatchParticipantStatus.JOINED) {
        throw new ForbiddenException('Only joined participants can send messages');
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        matchId,
        senderUserId: userId,
        body: trimmedBody,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    await this.prisma.chatReadState.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      create: {
        userId,
        matchId,
        lastReadAt: message.createdAt,
      },
      update: {
        lastReadAt: message.createdAt,
      },
    });

    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        select: {
          title: true,
          createdByUserId: true,
          participants: {
            where: { status: MatchParticipantStatus.JOINED },
            select: { userId: true },
          },
        },
      });

      if (match) {
        const recipients = new Set<string>([
          match.createdByUserId,
          ...match.participants.map((participant) => participant.userId),
        ]);
        recipients.delete(userId);

        const shortMessage =
          trimmedBody.length > 70 ? `${trimmedBody.slice(0, 67)}...` : trimmedBody;
        await this.notificationsService.createManyNotifications(
          Array.from(recipients).map((recipientUserId) => ({
            userId: recipientUserId,
            type: NotificationType.CHAT_MESSAGE,
            title: 'New chat message',
            body: `${message.sender.displayName}: ${shortMessage}`,
            data: {
              matchId,
              chatMessageId: message.id,
              dedupeKey: `chat-message:${message.id}:user:${recipientUserId}`,
            },
          })),
        );
      }
    } catch (notifyError) {
      this.logger.warn(
        `Failed to create chat-message notifications: ${
          notifyError instanceof Error ? notifyError.message : 'unknown error'
        }`,
      );
    }

    return message;
  }

  private async getReadAccessContext(matchId: string, userId: string): Promise<MatchChatAccessContext> {
    const context = await this.getAccessContext(matchId, userId);
    if (!context.isCreator && !context.isParticipant) {
      throw new ForbiddenException('Only match participants or creator can read chat');
    }
    return context;
  }

  private async getSendAccessContext(matchId: string, userId: string): Promise<MatchChatAccessContext> {
    const context = await this.getAccessContext(matchId, userId);
    if (!context.isCreator && !context.isParticipant) {
      throw new ForbiddenException('Only match participants or creator can send chat messages');
    }
    return context;
  }

  private async getAccessContext(matchId: string, userId: string): Promise<MatchChatAccessContext> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        title: true,
        status: true,
        createdByUserId: true,
        participants: {
          where: { userId },
          select: {
            status: true,
          },
          take: 1,
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const participantStatus = match.participants[0]?.status ?? null;
    const isCreator = match.createdByUserId === userId;
    const isParticipant = participantStatus !== null;

    return {
      matchId: match.id,
      title: match.title,
      status: match.status,
      createdByUserId: match.createdByUserId,
      participantStatus,
      isCreator,
      isParticipant,
    };
  }
}
