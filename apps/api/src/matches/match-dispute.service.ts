import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DisputeStatus, MatchParticipantStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { CreateDisputeDto } from './dto.create-dispute';

@Injectable()
export class MatchDisputeService {
  private readonly logger = new Logger(MatchDisputeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reliabilityService: ReliabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createDispute(matchId: string, resultId: string, createdByUserId: string, dto: CreateDisputeDto) {
    const matchResult = await this.prisma.matchResult.findUnique({
      where: { id: resultId },
      include: { match: true },
    });
    if (!matchResult || matchResult.matchId !== matchId) {
      throw new NotFoundException('Match result not found');
    }

    const joinedParticipant = await this.prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: createdByUserId } },
    });
    if (!joinedParticipant || joinedParticipant.status !== MatchParticipantStatus.JOINED) {
      throw new BadRequestException('Only joined participants can dispute this result');
    }

    const existingDispute = await this.prisma.matchResultDispute.findUnique({
      where: {
        matchResultId_createdByUserId: {
          matchResultId: resultId,
          createdByUserId,
        },
      },
    });
    if (existingDispute) {
      throw new ConflictException('Duplicate dispute is not allowed');
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.matchResultDispute.create({
        data: {
          matchResultId: resultId,
          matchId,
          createdByUserId,
          reason: dto.reason.trim(),
          status: DisputeStatus.OPEN,
        },
      });

      // MVP limitation: ownership of disputed fault is ambiguous with current model.
      // We increment dispute count for dispute creator only until moderation rules are introduced.
      await this.reliabilityService.incrementDisputedResults(createdByUserId, tx);

      return dispute;
    });

    const recipients = new Set<string>();
    recipients.add(matchResult.match.createdByUserId);
    recipients.add(matchResult.submittedByUserId);
    recipients.delete(createdByUserId);

    try {
      await this.notificationsService.createManyNotifications(
        Array.from(recipients).map((recipientUserId) => ({
          userId: recipientUserId,
          type: NotificationType.DISPUTE_CREATED,
          title: 'Result disputed',
          body: `A result was disputed for ${matchResult.match.title}`,
          data: {
            matchId,
            resultId,
            disputeId: dispute.id,
            dedupeKey: `match:${matchId}:dispute:${dispute.id}:user:${recipientUserId}`,
          },
        })),
      );
    } catch (notifyError) {
      this.logger.warn(
        `Failed to create dispute notifications: ${
          notifyError instanceof Error ? notifyError.message : 'unknown error'
        }`,
      );
    }

    return dispute;
  }
}
