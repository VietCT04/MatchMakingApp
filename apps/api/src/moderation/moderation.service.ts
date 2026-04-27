import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  MatchParticipantStatus,
  ModerationActionType,
  NotificationType,
  Prisma,
  ReportStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { ModerationDisputesQueryDto } from './dto.moderation-disputes-query';
import { ModerationReportsQueryDto } from './dto.moderation-reports-query';
import {
  ModerationNoShowAction,
  UpdateModerationNoShowDto,
} from './dto.update-moderation-no-show';
import { UpdateModerationDisputeDto } from './dto.update-moderation-dispute';
import { UpdateModerationReportDto } from './dto.update-moderation-report';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reliabilityService: ReliabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getReports(query: ModerationReportsQueryDto) {
    return this.prisma.userReport.findMany({
      where: {
        status: query.status,
      },
      include: {
        reporterUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        match: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
  }

  getDisputes(query: ModerationDisputesQueryDto) {
    return this.prisma.matchResultDispute.findMany({
      where: {
        status: query.status,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        match: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        matchResult: {
          select: {
            id: true,
            submittedByUserId: true,
            teamAScore: true,
            teamBScore: true,
            verified: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
  }

  getNoShows(limit = 50) {
    return this.prisma.matchParticipant.findMany({
      where: { status: MatchParticipantStatus.NO_SHOW },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        match: {
          select: {
            id: true,
            title: true,
            status: true,
            startsAt: true,
            createdByUserId: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async updateReport(reportId: string, moderatorUserId: string, dto: UpdateModerationReportDto) {
    if (dto.status !== ReportStatus.REVIEWED && dto.status !== ReportStatus.DISMISSED) {
      throw new BadRequestException('Report status must be REVIEWED or DISMISSED');
    }

    const report = await this.prisma.userReport.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== ReportStatus.OPEN) {
      throw new BadRequestException('Only OPEN reports can be moderated');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.userReport.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          moderatorNote: dto.moderatorNote?.trim() || null,
          reviewedByUserId: moderatorUserId,
          reviewedAt: new Date(),
        },
      });

      if (dto.status === ReportStatus.DISMISSED) {
        await this.reliabilityService.decrementReports(report.reportedUserId, tx);
      }

      await tx.moderationAction.create({
        data: {
          moderatorUserId,
          targetUserId: report.reportedUserId,
          reportId: report.id,
          matchId: report.matchId,
          actionType:
            dto.status === ReportStatus.DISMISSED
              ? ModerationActionType.REPORT_DISMISSED
              : ModerationActionType.REPORT_REVIEWED,
          note: dto.moderatorNote?.trim() || null,
        },
      });

      return next;
    });

    await this.safeNotify(
      report.reporterUserId,
      NotificationType.SYSTEM,
      'Report reviewed',
      'Your report was reviewed by moderators.',
      {
        reportId: report.id,
        matchId: report.matchId,
        status: dto.status,
        dedupeKey: `moderation:report:${report.id}:${dto.status}:user:${report.reporterUserId}`,
      },
    );

    return updated;
  }

  async updateDispute(disputeId: string, moderatorUserId: string, dto: UpdateModerationDisputeDto) {
    if (dto.status !== DisputeStatus.RESOLVED && dto.status !== DisputeStatus.REJECTED) {
      throw new BadRequestException('Dispute status must be RESOLVED or REJECTED');
    }

    const dispute = await this.prisma.matchResultDispute.findUnique({
      where: { id: disputeId },
      include: {
        matchResult: {
          select: {
            submittedByUserId: true,
          },
        },
      },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Only OPEN disputes can be moderated');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.matchResultDispute.update({
        where: { id: disputeId },
        data: {
          status: dto.status,
          moderatorNote: dto.moderatorNote?.trim() || null,
          reviewedByUserId: moderatorUserId,
          reviewedAt: new Date(),
        },
      });

      if (dto.status === DisputeStatus.REJECTED) {
        await this.reliabilityService.decrementDisputedResults(dispute.createdByUserId, tx);
      }

      await tx.moderationAction.create({
        data: {
          moderatorUserId,
          targetUserId: dispute.createdByUserId,
          disputeId: dispute.id,
          matchId: dispute.matchId,
          actionType:
            dto.status === DisputeStatus.REJECTED
              ? ModerationActionType.DISPUTE_REJECTED
              : ModerationActionType.DISPUTE_RESOLVED,
          note: dto.moderatorNote?.trim() || null,
        },
      });

      return next;
    });

    await this.safeNotify(
      dispute.createdByUserId,
      NotificationType.SYSTEM,
      'Dispute reviewed',
      `Your dispute was ${dto.status === DisputeStatus.RESOLVED ? 'resolved' : 'rejected'}.`,
      {
        disputeId: dispute.id,
        matchId: dispute.matchId,
        resultId: dispute.matchResultId,
        status: dto.status,
        dedupeKey: `moderation:dispute:${dispute.id}:${dto.status}:user:${dispute.createdByUserId}`,
      },
    );

    return updated;
  }

  async updateNoShow(participantId: string, moderatorUserId: string, dto: UpdateModerationNoShowDto) {
    const participant = await this.prisma.matchParticipant.findUnique({
      where: { id: participantId },
      include: {
        match: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.status !== MatchParticipantStatus.NO_SHOW) {
      throw new BadRequestException('Only NO_SHOW participants can be moderated by this endpoint');
    }

    const nextStatus =
      dto.action === ModerationNoShowAction.REVERSE
        ? MatchParticipantStatus.JOINED
        : MatchParticipantStatus.NO_SHOW;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next =
        dto.action === ModerationNoShowAction.REVERSE
          ? await tx.matchParticipant.update({
              where: { id: participantId },
              data: { status: nextStatus },
            })
          : participant;

      if (dto.action === ModerationNoShowAction.REVERSE) {
        await this.reliabilityService.decrementNoShow(participant.userId, tx);
      }

      await tx.moderationAction.create({
        data: {
          moderatorUserId,
          targetUserId: participant.userId,
          participantId: participant.id,
          matchId: participant.matchId,
          actionType:
            dto.action === ModerationNoShowAction.REVERSE
              ? ModerationActionType.NO_SHOW_REVERSED
              : ModerationActionType.NO_SHOW_CONFIRMED,
          note: dto.moderatorNote?.trim() || null,
        },
      });

      return next;
    });

    await this.safeNotify(
      participant.userId,
      NotificationType.SYSTEM,
      dto.action === ModerationNoShowAction.REVERSE ? 'No-show reversed' : 'No-show confirmed',
      dto.action === ModerationNoShowAction.REVERSE
        ? `Your no-show flag was reversed for ${participant.match.title}.`
        : `Your no-show flag was confirmed for ${participant.match.title}.`,
      {
        matchId: participant.matchId,
        participantId: participant.id,
        action: dto.action,
        dedupeKey: `moderation:no-show:${participant.id}:${dto.action}:user:${participant.userId}`,
      },
    );

    return updated;
  }

  private async safeNotify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Prisma.InputJsonValue,
  ) {
    try {
      await this.notificationsService.createNotification(userId, type, title, body, data);
    } catch (error) {
      this.logger.warn(
        `Failed to create moderation notification for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
